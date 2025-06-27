# AI Interview Coach – Full Stack

A full-stack AI-powered interview coach that provides real-time transcription, code evaluation, and interactive feedback.

## Features

- 🧠 **AI Code Evaluation**: Uses OpenAI GPT models to analyze code and explanations.
- 🎤 **Real-time Transcription**: Streams live voice-to-text using Whisper.
- ⚡ **FastAPI Backend**: Modern, fast (async) Python API for code evaluation.
- 🔌 **WebSocket Server**: For low-latency audio transcription.
- 🖥️ **Frontend**: Intuitive web interface for interviews and feedback.
- 🐳 **Dockerized**: Easy deployment with Docker Compose.

## Architecture

- **Frontend** (`frontend/`): React-based web UI for users to interact with the coach.
- **FastAPI Service** (`backend/fastapi/`): REST API for code evaluation.
- **WebSocket Service** (`backend/websocket/`): Streams audio and transcriptions.
- **requirements.txt**: Shared backend dependencies.

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 16+ & npm (for frontend)
- Docker & Docker Compose (recommended)
- OpenAI API key

### Local Development

#### 1. Clone the repository

```bash
git clone [<your-repo-url>](https://github.com/Rishi0620/InterviewHelper.git)
cd InterviewHelper
```

#### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

- **Run FastAPI server**
  ```bash
  cd fastapi
  uvicorn main:app --reload --host 0.0.0.0 --port 8000
  ```
- **Run WebSocket server**
  ```bash
  cd ../websocket
  python server.py
  ```

#### 3. Frontend Setup

```bash
cd ../frontend
npm install
npm start
```

The frontend will typically run at [http://localhost:3000](http://localhost:3000).

### Docker Compose (Recommended)

From the project root:

```bash
docker-compose up --build
```

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **FastAPI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **WebSocket**: `ws://localhost:8001`

## API Endpoints

### Health Check

```
GET /health
```

### Code Evaluation

```
POST /evaluate
Content-Type: application/json

{
  "code": "<your code>",
  "transcript": "<your explanation>"
}
```

**Response:**
```json
{
  "score": 8,
  "strengths": ["Good algorithm", "Clear explanation"],
  "improvements": ["Add edge case handling"],
  "optimizations": ["Use a hash map for faster lookup"]
}
```

## Environment Variables

- `OPENAI_API_KEY` – Required for code evaluation
- `HOST`, `PORT` – Service configuration
- `MODEL_NAME`, `TEMPERATURE`, `MAX_TOKENS` – OpenAI settings

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

MIT

## Acknowledgements

- [React](https://react.dev/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [OpenAI](https://openai.com/)
- [Faster Whisper](https://github.com/SYSTRAN/faster-whisper)
