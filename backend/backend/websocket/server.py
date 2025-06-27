import asyncio
import websockets
import numpy as np
import pyaudio
import threading
import queue
import os
from faster_whisper import WhisperModel

# ==== CONFIG FROM ENVIRONMENT ====
CHUNK_DURATION = float(os.getenv('CHUNK_DURATION', '2'))  # seconds
SAMPLE_RATE = int(os.getenv('SAMPLE_RATE', '16000'))
MODEL_SIZE = os.getenv('MODEL_SIZE', 'small.en')
PORT = int(os.getenv('PORT', '8001'))  # Changed to match Dockerfile
HOST = os.getenv('HOST', '0.0.0.0')  # Important for container access

# ==== CALCULATED CONFIG ====
CHUNK_SIZE = int(SAMPLE_RATE * CHUNK_DURATION)


class TranscriptionServer:
    def __init__(self):
        self.audio_queue = queue.Queue()
        self.connected_clients = set()
        self.model = None
        self.stream = None
        self.p = None

    def initialize_audio(self):
        """Initialize audio capture"""
        self.p = pyaudio.PyAudio()
        self.stream = self.p.open(
            format=pyaudio.paInt16,
            channels=1,
            rate=SAMPLE_RATE,
            input=True,
            frames_per_buffer=CHUNK_SIZE,
            stream_callback=self.audio_callback
        )

    def audio_callback(self, in_data, frame_count, time_info, status):
        """Callback for audio stream"""
        audio_np = np.frombuffer(in_data, np.int16).astype(np.float32) / 32768.0
        self.audio_queue.put(audio_np)
        return (in_data, pyaudio.paContinue)

    async def broadcast(self, message: str):
        """Send message to all connected clients"""
        if self.connected_clients:
            await asyncio.gather(
                *(ws.send(message) for ws in self.connected_clients)
            )

    async def websocket_handler(self, websocket):
        """Handle new WebSocket connections"""
        print("[INFO] New WebSocket client connected")
        self.connected_clients.add(websocket)
        try:
            await websocket.wait_closed()
        finally:
            self.connected_clients.remove(websocket)
            print("[INFO] WebSocket client disconnected")

    def transcribe_loop(self, loop):
        """Continuous transcription thread"""
        print("[INFO] Loading Whisper model...")
        self.model = WhisperModel(
            MODEL_SIZE,
            compute_type="int8",
            cpu_threads=4
        )
        print(f"[INFO] Transcription started with model {MODEL_SIZE}...")

        while True:
            audio_chunk = self.audio_queue.get()
            if audio_chunk is None:  # Shutdown signal
                break

            segments, _ = self.model.transcribe(
                audio_chunk,
                language="en",
                beam_size=5,
                vad_filter=True,
                suppress_blank=True,
                without_timestamps=True,
                word_timestamps=False
            )

            for segment in segments:
                text = segment.text.strip()
                if text:
                    print(f"Transcribed: {text}")
                    asyncio.run_coroutine_threadsafe(
                        self.broadcast(text), loop
                    )

    async def start_server(self):
        """Start the WebSocket server"""
        self.initialize_audio()
        self.stream.start_stream()

        loop = asyncio.get_running_loop()

        # Start transcription thread
        threading.Thread(
            target=self.transcribe_loop,
            args=(loop,),
            daemon=True
        ).start()

        # Start WebSocket server
        print(f"[INFO] WebSocket server running on ws://{HOST}:{PORT}")
        async with websockets.serve(
                self.websocket_handler,
                HOST,
                PORT
        ):
            await asyncio.Future()  # Run forever

    def shutdown(self):
        """Cleanup resources"""
        print("\n[INFO] Shutting down...")
        self.audio_queue.put(None)
        if self.stream:
            self.stream.stop_stream()
            self.stream.close()
        if self.p:
            self.p.terminate()


async def main():
    server = TranscriptionServer()
    try:
        await server.start_server()
    except KeyboardInterrupt:
        server.shutdown()


if __name__ == "__main__":
    asyncio.run(main())