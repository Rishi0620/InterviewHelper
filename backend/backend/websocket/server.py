"""
Production-ready WebSocket server for real-time audio transcription.
"""

import asyncio
import logging
import os
import queue
import signal
import sys
import threading
import time
from contextlib import asynccontextmanager
from typing import Set, Optional, Dict, Any

import numpy as np
import pyaudio
import websockets
from faster_whisper import WhisperModel
from websockets.exceptions import ConnectionClosed, WebSocketException


# === Configuration ===
class Config:
    """WebSocket server configuration."""
    
    # Audio settings
    CHUNK_DURATION = float(os.getenv('CHUNK_DURATION', '2.0'))
    SAMPLE_RATE = int(os.getenv('SAMPLE_RATE', '16000'))
    
    # Model settings
    MODEL_SIZE = os.getenv('MODEL_SIZE', 'small.en')
    
    # Server settings
    HOST = os.getenv('WS_HOST', '0.0.0.0')
    PORT = int(os.getenv('WS_PORT', '8001'))
    
    # Performance settings
    MAX_CLIENTS = int(os.getenv('MAX_CLIENTS', '10'))
    TRANSCRIPTION_TIMEOUT = float(os.getenv('TRANSCRIPTION_TIMEOUT', '10.0'))
    
    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO').upper()
    
    # Environment
    ENVIRONMENT = os.getenv('ENVIRONMENT', 'development').lower()
    
    @property
    def chunk_size(self) -> int:
        return int(self.SAMPLE_RATE * self.CHUNK_DURATION)
    
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == 'production'


config = Config()


# === Logging Setup ===
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('transcription.log') if config.is_production else logging.NullHandler()
    ]
)
logger = logging.getLogger(__name__)


# === Enhanced Transcription Server ===
class TranscriptionServer:
    """Production-ready WebSocket transcription server."""
    
    def __init__(self):
        self.audio_queue: queue.Queue = queue.Queue(maxsize=100)
        self.connected_clients: Set[websockets.WebSocketServerProtocol] = set()
        self.client_info: Dict[websockets.WebSocketServerProtocol, Dict[str, Any]] = {}
        
        # Audio components
        self.model: Optional[WhisperModel] = None
        self.stream: Optional[pyaudio.Stream] = None
        self.p: Optional[pyaudio.PyAudio] = None
        
        # State management
        self.is_running = False
        self.transcription_thread: Optional[threading.Thread] = None
        
        # Metrics
        self.start_time = time.time()
        self.total_transcriptions = 0
        self.total_connections = 0
        
        logger.info("TranscriptionServer initialized")
    
    async def initialize_audio(self) -> bool:
        """Initialize audio capture with error handling."""
        try:
            logger.info("Initializing audio system...")
            
            self.p = pyaudio.PyAudio()
            
            # Check for available input devices
            device_count = self.p.get_device_count()
            logger.info(f"Found {device_count} audio devices")
            
            # Find default input device
            default_input = self.p.get_default_input_device_info()
            logger.info(f"Default input device: {default_input['name']}")
            
            # Create audio stream
            self.stream = self.p.open(
                format=pyaudio.paInt16,
                channels=1,
                rate=config.SAMPLE_RATE,
                input=True,
                frames_per_buffer=config.chunk_size,
                stream_callback=self.audio_callback,
                start=False  # Don't start immediately
            )
            
            logger.info("Audio system initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize audio: {e}")
            return False
    
    def audio_callback(self, in_data, frame_count, time_info, status):
        """Audio stream callback with error handling."""
        try:
            if status:
                logger.warning(f"Audio callback status: {status}")
            
            # Convert to numpy array
            audio_np = np.frombuffer(in_data, np.int16).astype(np.float32) / 32768.0
            
            # Add to queue (non-blocking)
            try:
                self.audio_queue.put_nowait(audio_np)
            except queue.Full:
                logger.warning("Audio queue full, dropping frame")
                # Remove oldest item and add new one
                try:
                    self.audio_queue.get_nowait()
                    self.audio_queue.put_nowait(audio_np)
                except queue.Empty:
                    pass
            
        except Exception as e:
            logger.error(f"Audio callback error: {e}")
        
        return (in_data, pyaudio.paContinue)
    
    async def broadcast_message(self, message: str, exclude: Optional[Set] = None) -> int:
        """Broadcast message to all connected clients."""
        if not self.connected_clients:
            return 0
        
        exclude = exclude or set()
        recipients = self.connected_clients - exclude
        
        if not recipients:
            return 0
        
        # Send to all recipients concurrently
        tasks = []
        for client in recipients:
            tasks.append(self.send_safe(client, message))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Count successful sends
        successful = sum(1 for result in results if result is True)
        failed = len(results) - successful
        
        if failed > 0:
            logger.warning(f"Failed to send message to {failed}/{len(results)} clients")
        
        return successful
    
    async def send_safe(self, websocket: websockets.WebSocketServerProtocol, message: str) -> bool:
        """Safely send message to a WebSocket client."""
        try:
            await websocket.send(message)
            return True
        except (ConnectionClosed, WebSocketException) as e:
            logger.debug(f"Failed to send to client: {e}")
            # Remove disconnected client
            await self.remove_client(websocket)
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending message: {e}")
            return False
    
    async def websocket_handler(self, websocket: websockets.WebSocketServerProtocol, path: str):
        """Handle WebSocket connections with comprehensive error handling."""
        client_id = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
        
        # Check client limit
        if len(self.connected_clients) >= config.MAX_CLIENTS:
            logger.warning(f"Connection limit reached, rejecting client {client_id}")
            await websocket.close(code=1013, reason="Server full")
            return
        
        logger.info(f"New WebSocket client connected: {client_id}")
        
        # Add client
        self.connected_clients.add(websocket)
        self.client_info[websocket] = {
            "id": client_id,
            "connected_at": time.time(),
            "messages_sent": 0
        }
        self.total_connections += 1
        
        try:
            # Send welcome message
            await self.send_safe(websocket, "Connected to transcription service")
            
            # Handle client messages
            async for message in websocket:
                try:
                    # Handle client commands (optional)
                    if message.startswith('{"type":'):
                        # JSON command handling could go here
                        logger.debug(f"Received command from {client_id}: {message[:100]}")
                    
                except Exception as e:
                    logger.error(f"Error processing message from {client_id}: {e}")
        
        except ConnectionClosed:
            logger.info(f"Client {client_id} disconnected normally")
        except WebSocketException as e:
            logger.warning(f"WebSocket error for client {client_id}: {e}")
        except Exception as e:
            logger.error(f"Unexpected error for client {client_id}: {e}")
        finally:
            await self.remove_client(websocket)
    
    async def remove_client(self, websocket: websockets.WebSocketServerProtocol):
        """Remove client from tracking."""
        if websocket in self.connected_clients:
            client_info = self.client_info.get(websocket, {})
            client_id = client_info.get("id", "unknown")
            
            self.connected_clients.discard(websocket)
            self.client_info.pop(websocket, None)
            
            logger.info(f"Client {client_id} removed from tracking")
    
    def transcription_worker(self, loop: asyncio.AbstractEventLoop):
        """Background transcription worker thread."""
        logger.info("Starting transcription worker thread...")
        
        try:
            # Initialize Whisper model
            logger.info(f"Loading Whisper model: {config.MODEL_SIZE}")
            self.model = WhisperModel(
                config.MODEL_SIZE,
                compute_type="int8",
                cpu_threads=min(4, os.cpu_count() or 1),
                num_workers=1
            )
            logger.info("Whisper model loaded successfully")
            
            # Process audio chunks
            while self.is_running:
                try:
                    # Get audio chunk with timeout
                    try:
                        audio_chunk = self.audio_queue.get(timeout=1.0)
                    except queue.Empty:
                        continue
                    
                    if audio_chunk is None:  # Shutdown signal
                        break
                    
                    # Transcribe audio
                    start_time = time.time()
                    
                    segments, info = self.model.transcribe(
                        audio_chunk,
                        language="en",
                        beam_size=3,  # Reduced for performance
                        vad_filter=True,
                        suppress_blank=True,
                        without_timestamps=True,
                        word_timestamps=False
                    )
                    
                    # Process segments
                    for segment in segments:
                        text = segment.text.strip()
                        if text and len(text) > 2:  # Minimum length check
                            processing_time = time.time() - start_time
                            
                            logger.debug(f"Transcribed ({processing_time:.2f}s): {text}")
                            
                            # Send to clients
                            asyncio.run_coroutine_threadsafe(
                                self.broadcast_message(text), loop
                            )
                            
                            self.total_transcriptions += 1
                
                except Exception as e:
                    logger.error(f"Transcription error: {e}")
                    if config.is_production:
                        time.sleep(1)  # Brief pause before retrying
                    else:
                        break
        
        except Exception as e:
            logger.error(f"Critical transcription worker error: {e}")
        finally:
            logger.info("Transcription worker thread stopping...")
    
    async def start_server(self):
        """Start the WebSocket server with all components."""
        logger.info("Starting TranscriptionServer...")
        
        self.is_running = True
        
        # Initialize audio
        if not await self.initialize_audio():
            logger.error("Failed to initialize audio system")
            return False
        
        # Start audio stream
        if self.stream:
            self.stream.start_stream()
            logger.info("Audio stream started")
        
        # Start transcription worker
        loop = asyncio.get_running_loop()
        self.transcription_thread = threading.Thread(
            target=self.transcription_worker,
            args=(loop,),
            daemon=True,
            name="TranscriptionWorker"
        )
        self.transcription_thread.start()
        
        # Start WebSocket server
        logger.info(f"WebSocket server starting on {config.HOST}:{config.PORT}")
        
        try:
            async with websockets.serve(
                self.websocket_handler,
                config.HOST,
                config.PORT,
                max_size=2**20,  # 1MB max message size
                max_queue=32,    # Max queued messages per client
                compression=None,  # Disable compression for real-time
                ping_interval=20,  # Ping every 20 seconds
                ping_timeout=10,   # 10 second ping timeout
            ):
                logger.info(f"WebSocket server running on ws://{config.HOST}:{config.PORT}")
                await asyncio.Future()  # Run forever
        
        except Exception as e:
            logger.error(f"WebSocket server error: {e}")
            raise
        finally:
            await self.shutdown()
    
    async def shutdown(self):
        """Graceful shutdown of all components."""
        logger.info("Shutting down TranscriptionServer...")
        
        self.is_running = False
        
        # Stop audio
        if self.stream:
            try:
                self.stream.stop_stream()
                self.stream.close()
                logger.info("Audio stream stopped")
            except Exception as e:
                logger.error(f"Error stopping audio stream: {e}")
        
        if self.p:
            try:
                self.p.terminate()
                logger.info("PyAudio terminated")
            except Exception as e:
                logger.error(f"Error terminating PyAudio: {e}")
        
        # Signal transcription thread to stop
        try:
            self.audio_queue.put_nowait(None)
        except queue.Full:
            pass
        
        # Wait for transcription thread
        if self.transcription_thread and self.transcription_thread.is_alive():
            self.transcription_thread.join(timeout=5.0)
            if self.transcription_thread.is_alive():
                logger.warning("Transcription thread did not stop gracefully")
        
        # Close all WebSocket connections
        if self.connected_clients:
            close_tasks = []
            for client in self.connected_clients.copy():
                close_tasks.append(client.close(code=1001, reason="Server shutdown"))
            
            if close_tasks:
                await asyncio.gather(*close_tasks, return_exceptions=True)
                logger.info(f"Closed {len(close_tasks)} client connections")
        
        # Log final stats
        uptime = time.time() - self.start_time
        logger.info(f"Server uptime: {uptime:.1f}s")
        logger.info(f"Total connections: {self.total_connections}")
        logger.info(f"Total transcriptions: {self.total_transcriptions}")
        
        logger.info("TranscriptionServer shutdown complete")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get server statistics."""
        uptime = time.time() - self.start_time
        return {
            "uptime_seconds": uptime,
            "connected_clients": len(self.connected_clients),
            "total_connections": self.total_connections,
            "total_transcriptions": self.total_transcriptions,
            "queue_size": self.audio_queue.qsize(),
            "is_running": self.is_running,
            "audio_active": self.stream and self.stream.is_active() if self.stream else False
        }


# === Global Server Instance ===
server = TranscriptionServer()


# === Signal Handlers ===
def signal_handler(signum, frame):
    """Handle shutdown signals."""
    logger.info(f"Received signal {signum}, initiating graceful shutdown...")
    
    # Stop the server
    server.is_running = False
    
    # Create new event loop for shutdown if needed
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    loop.run_until_complete(server.shutdown())
    sys.exit(0)


# === Main Entry Point ===
async def main():
    """Main application entry point."""
    logger.info("Starting Transcription WebSocket Server")
    logger.info(f"Configuration: {config.HOST}:{config.PORT}")
    logger.info(f"Model: {config.MODEL_SIZE}")
    logger.info(f"Environment: {config.ENVIRONMENT}")
    
    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        await server.start_server()
    except KeyboardInterrupt:
        logger.info("Keyboard interrupt received")
        await server.shutdown()
    except Exception as e:
        logger.error(f"Server error: {e}")
        await server.shutdown()
        raise


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Application terminated by user")
    except Exception as e:
        logger.error(f"Application failed: {e}")
        sys.exit(1)