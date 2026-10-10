FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TF_CPP_MIN_LOG_LEVEL=2 \
    OMP_NUM_THREADS=2 \
    TF_NUM_INTEROP_THREADS=2 \
    TF_NUM_INTRAOP_THREADS=2

WORKDIR /service
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*
COPY requirements.txt requirements-model.txt ./
RUN pip install --no-cache-dir -r requirements.txt -r requirements-model.txt
COPY app ./app
RUN useradd --create-home --uid 10001 appuser && mkdir -p /data/images && chown -R appuser:appuser /data
USER appuser
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
