# SmartChat 后端镜像（适用于 Render / Hugging Face Spaces 等容器平台）
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

# 先拷贝依赖清单，利用 Docker 层缓存加速构建
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY app ./app

EXPOSE 8001
# 平台会注入 PORT（如 HF Spaces 为 7860），默认 8001
CMD ["sh", "-c", "uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8001}"]
