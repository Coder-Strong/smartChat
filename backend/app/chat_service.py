import base64

from anthropic import Anthropic

from app.config import settings
from app.prompts import TUTOR_PROMPT

# 智谱提供 Anthropic 兼容协议，直接使用 anthropic SDK 指向智谱地址
client = Anthropic(
    auth_token=settings.zhipu_api_key,
    base_url=settings.zhipu_base_url,
    timeout=120.0,
)

IMAGE_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif"}


def _attachment_blocks(attachments: list) -> list[dict]:
    """把上传的图片/文件转成 Anthropic 多模态内容块"""
    blocks: list[dict] = []
    for att in attachments:
        if att.media_type in IMAGE_TYPES:
            blocks.append(
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": att.media_type,
                        "data": att.data,
                    },
                }
            )
        elif att.media_type == "application/pdf":
            blocks.append(
                {
                    "type": "document",
                    "source": {
                        "type": "base64",
                        "media_type": "application/pdf",
                        "data": att.data,
                    },
                }
            )
        else:
            # 其余一律按纯文本文件处理，抽取文字注入消息
            try:
                text = base64.b64decode(att.data).decode("utf-8")
            except (ValueError, UnicodeDecodeError):
                raise ValueError(f"暂不支持该文件类型：{att.name}")
            blocks.append(
                {"type": "text", "text": f"（附件文件「{att.name}」的内容如下：\n{text}\n）"}
            )
    return blocks


def _to_api_message(msg) -> dict:
    """把一条消息转成 Anthropic messages 格式，带附件时用多模态内容块"""
    if not msg.attachments:
        return {"role": msg.role, "content": msg.content}
    blocks = _attachment_blocks(msg.attachments)
    if msg.content.strip():
        blocks.append({"type": "text", "text": msg.content})
    return {"role": msg.role, "content": blocks}


def create_chat_reply(messages: list) -> str:
    """以数学建模导师身份调用智谱大模型，messages 为多轮上下文（可含附件）"""
    response = client.messages.create(
        model=settings.zhipu_model,
        max_tokens=2048,
        system=TUTOR_PROMPT,
        messages=[_to_api_message(m) for m in messages],
    )
    return "".join(block.text for block in response.content if block.type == "text")
