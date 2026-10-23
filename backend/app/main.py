from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.chat_service import create_chat_reply
from app.config import settings
from app.schemas import ChatRequest, ChatResponse

app = FastAPI(title="SmartChat API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    """健康检查"""
    return {"status": "ok"}


@app.post("/api/chat", response_model=ChatResponse)
def chat(body: ChatRequest) -> ChatResponse:
    """AI 对话：把前端传来的多轮上下文交给智谱大模型"""
    try:
        reply = create_chat_reply(body.messages)
    except ValueError as exc:
        # 附件类型不支持等请求问题
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"大模型调用失败：{exc}") from exc
    return ChatResponse(reply=reply, model=settings.zhipu_model)
