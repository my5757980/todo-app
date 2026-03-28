FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip + build tools in a single layer before any package install
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Copy pyproject.toml first for layer caching — reinstall only when deps change
COPY pyproject.toml .

# Install all dependencies (non-editable; source is volume-mounted at runtime)
# setuptools.build_meta is the standard PEP 517 backend, compatible with slim image
RUN pip install --no-cache-dir ".[dev]"

# Copy application source and remaining files
COPY . .

EXPOSE 8000

# Healthcheck matches docker-compose.yml
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
