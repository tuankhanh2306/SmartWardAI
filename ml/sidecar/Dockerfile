FROM python:3.11.9-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY ml/sidecar/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY ml ml
RUN python ml/models/tts/download_tts_model.py

ENV PYTHONPATH=/app/ml/src

# Create unprivileged system user for security compliance (SEC-07)
RUN groupadd -r smartward && useradd -r -g smartward smartward \
    && chown -R smartward:smartward /app
USER smartward

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["python", "ml/sidecar/serve.py", "--host", "0.0.0.0", "--port", "8000"]
