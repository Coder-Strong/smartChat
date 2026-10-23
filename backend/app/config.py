from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """后端配置，从 backend/.env 读取"""

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    zhipu_api_key: str
    zhipu_base_url: str = "https://open.bigmodel.cn/api/anthropic"
    zhipu_model: str = "glm-5.3-flash"
    # 跨域白名单：逗号分隔，生产环境填写 Gitee Pages 域名
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
