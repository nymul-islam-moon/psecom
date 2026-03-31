FROM python:3.11-slim

WORKDIR /app

# Install uv
RUN pip install --no-cache-dir uv

# Copy dependency files first for layer caching
COPY pyproject.toml .

# Install all dependencies directly
RUN uv pip install --system \
    "fastapi>=0.111.0" \
    "uvicorn[standard]>=0.29.0" \
    "sqlalchemy>=2.0.0" \
    "aiomysql>=0.2.0" \
    "pymysql>=1.1.0" \
    "pydantic>=2.7.0" \
    "pydantic-settings>=2.2.0" \
    "python-dotenv>=1.0.0" \
    "discord.py>=2.3.2" \
    "httpx>=0.27.0" \
    "alembic>=1.13.0" \
    "cryptography>=42.0.0"

# Copy application code
COPY app/ ./app/

EXPOSE 8100

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8100"]
