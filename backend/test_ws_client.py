import asyncio
import websockets

async def listen():
    uri = "ws://localhost:8001"
    async with websockets.connect(uri) as websocket:
        while True:
            msg = await websocket.recv()
            print("Received:", msg)

asyncio.run(listen())
