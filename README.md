# SmartChat · AI 对话机器人

前端 React 18 + Ant Design 5 + axios（Vite 构建），后端 FastAPI（uv 管理），通过 Anthropic 兼容协议对接智谱大模型。

## 目录结构

```
smartChat/
├── backend/                  # 后端：uv + FastAPI
│   ├── pyproject.toml
│   ├── .env                  # 智谱 API Key 等配置（不入库）
│   └── app/
│       ├── main.py           # FastAPI 入口、路由、CORS
│       ├── config.py         # 读取 .env
│       ├── schemas.py        # 请求/响应模型
│       └── chat_service.py   # 智谱大模型调用
└── frontend/                 # 前端：Vite + React + antd
    └── src/
        ├── App.jsx           # 聊天页面
        ├── api/chat.js       # axios 封装
        └── components/       # 消息列表、输入框
```

## 启动

### 1. 后端（端口 8001，8000 已被其他服务占用）

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8001
```

### 2. 前端（端口 5173）

```bash
cd frontend
npm install
npm run dev
```

浏览器访问 http://localhost:5173

## 说明

- 智谱 API Key、模型等配置在 `backend/.env` 中修改（该文件已被 .gitignore 忽略，可参考 `backend/.env.example`）。
- 接口：`POST /api/chat`（多轮对话，消息可携带图片 / PDF / 文本附件，base64 上传）、`GET /api/health`（健康检查）。
- 多轮上下文由前端携带完整 messages 数组传给后端。
- 部署上线（Gitee Pages 前端 + 云平台后端）见 [DEPLOY.md](DEPLOY.md)。
