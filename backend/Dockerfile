FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml .
COPY main.py .

RUN pip install --no-cache-dir uv && uv pip install --system --no-cache -r pyproject.toml

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
