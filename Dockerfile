FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if required
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code and configurations
COPY . .

EXPOSE 8000

# Default entrypoint launches FastAPI ingestion trigger server
CMD ["uvicorn", "src.pipeline.api:app", "--host", "0.0.0.0", "--port", "8000"]
