# AI Interview Coach

An AI-powered interview coaching platform with real-time transcription and code evaluation capabilities.

## Features

- **Real-time Audio Transcription**: WebSocket-based transcription using Whisper
- **AI Code Evaluation**: Intelligent code review using OpenAI GPT models
- **LeetCode Integration**: Practice with real LeetCode problems
- **Modern UI**: Beautiful React/Next.js interface with Tailwind CSS
- **Production Ready**: Full Docker containerization, monitoring, and security

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   FastAPI       │    │   WebSocket     │
│   (Next.js)     │◄──►│   (Evaluation)  │    │   (Transcription)│
│   Port: 3000    │    │   Port: 8000    │    │   Port: 8001    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                   ┌─────────────────┐
                   │     Redis       │
                   │   (Caching)     │
                   │   Port: 6379    │
                   └─────────────────┘
```

## Technology Stack

### Backend
- **FastAPI**: Modern Python web framework for the API
- **WebSockets**: Real-time communication for transcription
- **OpenAI API**: AI-powered code evaluation
- **Faster-Whisper**: Local speech-to-text processing
- **Redis**: Caching and session management
- **Pydantic**: Data validation and settings management

### Frontend
- **Next.js 15**: React framework with SSR/SSG
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Radix UI**: Accessible component primitives
- **Monaco Editor**: VS Code-like code editor

### Infrastructure
- **Docker**: Containerization
- **Docker Compose**: Multi-service orchestration
- **Nginx**: Reverse proxy and load balancing
- **Prometheus**: Metrics and monitoring
- **Multi-stage builds**: Optimized production images

## Prerequisites

- Docker and Docker Compose
- OpenAI API key
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

## Quick Start

### 1. Clone the Repository
```bash
cd InterviewHelper
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env

# Edit .env with your configuration
nano .env
```

**Required environment variables:**
```env
OPENAI_API_KEY=your_openai_api_key_here
ENVIRONMENT=production
REDIS_PASSWORD=your_secure_redis_password
```

### 3. Start with Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service health
docker-compose ps
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health
- **Monitoring**: http://localhost:9090 (Prometheus)

## Development Setup

### Backend Development
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export OPENAI_API_KEY="your-key-here"
export DEBUG=true

# Start FastAPI server
uvicorn backend.fastapi.main:app --reload --host 0.0.0.0 --port 8000

# Start WebSocket server (in another terminal)
cd backend/websocket
python server.py
```

```bash
cd frontend

# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

## Monitoring and Observability

### Health Checks
```bash
# API health
curl http://localhost:8000/health

# WebSocket health (basic TCP check)
telnet localhost 8001

# Redis health
redis-cli -h localhost -p 6379 ping
```

### Metrics and Logging
- **Application Logs**: JSON structured logging to stdout
- **Metrics**: Prometheus metrics at `/metrics` endpoints
- **Health Checks**: Kubernetes-ready health and readiness probes
- **Error Tracking**: Structured error logging with correlation IDs

### Prometheus Metrics
Access Prometheus at http://localhost:9090 to view:
- Request rates and latencies
- Error rates
- System resource usage
- Custom application metrics

## Security Features

### Application Security
- **Input Sanitization**: XSS and injection prevention
- **Rate Limiting**: API and WebSocket connection limits
- **CORS Configuration**: Secure cross-origin policies
- **Security Headers**: HSTS, CSP, X-Frame-Options, etc.
- **Non-root Containers**: All services run as non-root users

### Network Security
- **TLS/SSL Ready**: Nginx configuration for HTTPS
- **IP Filtering**: Configurable IP blocking
- **Request Validation**: Suspicious pattern detection
- **Size Limits**: Request and payload size restrictions

### Data Security
- **Environment Variables**: Secure secret management
- **API Key Validation**: Optional API key authentication
- **Data Sanitization**: Input cleaning and validation
- **Audit Logging**: Request and response logging

## Production Deployment

### Docker Production
```bash
# Build production images
docker-compose -f docker-compose.yml --profile production build

# Start with production profile
docker-compose --profile production up -d

# Include monitoring
docker-compose --profile production --profile monitoring up -d
```

### Environment Configuration
```env
# Production environment variables
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO
WORKERS=4

# Security
CORS_ORIGINS=https://yourdomain.com
ALLOWED_HOSTS=yourdomain.com

# Monitoring
SENTRY_DSN=your_sentry_dsn
PROMETHEUS_ENABLED=true
```

### Nginx Configuration
```bash
# Copy SSL certificates
mkdir -p backend/nginx/ssl
cp your-cert.pem backend/nginx/ssl/cert.pem
cp your-key.pem backend/nginx/ssl/key.pem

# Update domain in nginx.conf
sed -i 's/your-domain.com/yourdomain.com/g' backend/nginx/nginx.conf
```

### Kubernetes Deployment
```bash
# Generate Kubernetes manifests
kubectl apply -k k8s/

# Check deployment status
kubectl get pods -n interview-coach
kubectl get services -n interview-coach
```

## Testing

### Backend Tests
```bash
cd backend
python -m pytest tests/ -v --cov=.
```

### Frontend Tests
```bash
cd frontend
npm test
npm run test:coverage
```

### Integration Tests
```bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
./scripts/run-integration-tests.sh
```

## Performance Optimization

### Backend Optimizations
- **Async Processing**: FastAPI with async/await
- **Connection Pooling**: Redis and database connections
- **Caching**: Response caching with Redis
- **Request Batching**: Multiple evaluation requests
- **Resource Limits**: CPU and memory constraints

### Frontend Optimizations
- **Code Splitting**: Dynamic imports and lazy loading
- **Image Optimization**: Next.js automatic optimization
- **Bundle Analysis**: Webpack bundle analyzer
- **Static Generation**: Pre-rendered pages where possible
- **Compression**: Gzip and Brotli compression

## Troubleshooting

### Common Issues

**OpenAI API Errors**
```bash
# Check API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models

# View API logs
docker-compose logs fastapi
```

**WebSocket Connection Issues**
```bash
# Check audio devices (WebSocket service)
docker-compose exec websocket python -c "import pyaudio; print(pyaudio.PyAudio().get_device_count())"

# Test WebSocket connection
wscat -c ws://localhost:8001
```

**Performance Issues**
```bash
# Monitor resource usage
docker stats

# Check application metrics
curl http://localhost:8000/metrics
```

### Log Analysis
```bash
# View structured logs
docker-compose logs fastapi | jq '.'

# Filter error logs
docker-compose logs fastapi | grep '"level":"ERROR"'

# Monitor real-time logs
docker-compose logs -f --tail=100
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow PEP 8 for Python code
- Use TypeScript for frontend development
- Add tests for new features
- Update documentation
- Ensure Docker builds pass

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- OpenAI for the GPT API
- Faster-Whisper for speech recognition
- Next.js team for the excellent framework
- FastAPI for the modern Python API framework
- All open source contributors
