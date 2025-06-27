FROM python:3.9-slim

# Install system dependencies first
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        gcc \
        python3-dev \
        portaudio19-dev \
    && rm -rf /var/lib/apt/lists/*

# portaudio19-dev is required for pyaudio

WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

ENV PORT=8001
EXPOSE $PORT

CMD ["python", "server.py"]