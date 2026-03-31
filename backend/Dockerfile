FROM python:3.11-slim

WORKDIR /app

# Install uv
RUN pip install uv

# Copy dependency files first for layer caching
COPY pyproject.toml .

# Install dependencies
RUN uv pip install --system -e ".[dev]" 2>/dev/null || uv pip install --system \
    fastapi uvicorn[standard] sqlalchemy aiomysql pymysql \
    pydantic pydantic-settings python-dotenv "discord.py" httpx alembic

# Copy application code
COPY app/ ./app/

EXPOSE 8100

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8100"]
