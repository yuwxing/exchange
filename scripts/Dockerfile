FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY task_market_api.py .

RUN mkdir -p /app/data /app/deliveries

ENV TASK_MARKET_DB=/app/data/task_market.db

EXPOSE 8000

CMD ["uvicorn", "task_market_api:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
