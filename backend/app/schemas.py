from typing import Literal

from pydantic import BaseModel, Field, model_validator


class Attachment(BaseModel):
    """随消息上传的图片或文件（base64，不含 dataURL 前缀）"""

    name: str = Field(min_length=1, max_length=200)
    media_type: str = Field(min_length=1, max_length=100)
    data: str = Field(min_length=1, max_length=8_000_000)  # 约 5MB 原始数据


class ChatMessage(BaseModel):
    """单条对话消息，可携带附件"""

    role: Literal["user", "assistant"]
    content: str = Field(default="")
    attachments: list[Attachment] = Field(default=[], max_length=4)

    @model_validator(mode="after")
    def check_not_empty(self):
        if not self.content.strip() and not self.attachments:
            raise ValueError("消息内容和附件不能同时为空")
        return self


class ChatRequest(BaseModel):
    """对话请求：携带完整多轮上下文"""

    messages: list[ChatMessage] = Field(min_length=1, max_length=50)


class ChatResponse(BaseModel):
    """对话响应"""

    reply: str
    model: str
