# 部署指南（方案 B：Gitee Pages 前端 + 云平台后端）

## 架构

- **前端**：vite 打包成纯静态页，发布到 Gitee Pages（国内访问快）
- **后端**：FastAPI 用 Docker 部署到免费容器平台（Hugging Face Spaces 或 Render），提供 `/api` 接口
- **密钥**：智谱 API Key 只存放在后端平台的 Secret/环境变量里，**不进代码仓库、不进前端产物**

```
学生浏览器 ──https──> Gitee Pages（静态页） ──https /api──> 云平台容器（FastAPI）──> 智谱大模型
```

## 第一步：部署后端（二选一，得到公网 API 地址）

### 方式一：Hugging Face Spaces（最简单，浏览器上传即可，无需 GitHub）

1. 注册 / 登录 https://huggingface.co → 右上角 New → Space
2. Space 名称填 `smartchat-api`，SDK 选 **Docker → Blank**，Public 可见，创建
3. 进入 Space 的 **Files** 页签 → **Add file → Upload files**，上传 `backend/` 目录下的：
   - `Dockerfile`、`pyproject.toml`、`uv.lock`、`app/` 整个文件夹
   - ⚠️ **不要上传 `.env`**（里面有你的 Key，平台用 Secret 注入）
4. **Settings → Variables and secrets → New secret**：
   - Name：`ZHIPU_API_KEY`，Value：你的智谱 Key
5. 等 Files 页顶部显示 Running，你的后端地址就是：
   `https://<你的用户名>-smartchat-api.hf.space`
   浏览器打开 `https://…/api/health` 看到 `{"status":"ok"}` 即成功
6. **国内访问 hf.space 偶尔不稳定**，若学生打开后端慢，换方式二

### 方式二：Render（国内访问较稳，需要 GitHub 账号中转）

1. 把本仓库推送到 GitHub（私有仓库即可），注册 / 登录 https://render.com
2. New → **Web Service** → 连接该 GitHub 仓库，Render 会自动识别 `backend/Dockerfile`（Root Directory 填 `backend`）
3. Environment 添加：`ZHIPU_API_KEY` = 你的智谱 Key
4. 部署完成后得到 `https://<名字>.onrender.com`，访问 `/api/health` 验证

> 免费容器会休眠：Render 约 15 分钟、HF Space 约 48 小时无访问即休眠，唤醒需 30~60 秒，第一次打开慢属正常。

## 第二步：构建前端（内嵌后端地址）

```bash
./deploy/build.sh https://<你的后端地址>
# 例：./deploy/build.sh https://strong-smartchat-api.hf.space
```

产物输出到 `gitee-pages/` 目录。

## 第三步：发布到 Gitee Pages

1. 在 https://gitee.com 新建仓库（如 `smartchat`，公开），复制仓库 HTTPS 地址
2. 本地推送（首次需要 Gitee 账号密码或私人令牌）：

   ```bash
   git add -A
   git commit -m "feat: SmartChat 数学导师智能体"
   git remote add gitee https://gitee.com/<你的用户名>/smartchat.git
   git push -u gitee master
   ```

3. 仓库页 → **服务 → Gitee Pages**：首次使用需**实名认证**开通（免费）
4. 部署分支选 `master`，部署目录选 `gitee-pages`，点「启动」
5. 审核通过后得到 **`https://<你的用户名>.gitee.io/smartchat`** —— 这就是可分享的访问地址

> 注意：Gitee Pages 免费版每次更新后需手动到 Pages 服务页点「更新」；留意平台的闲置回收策略，偶尔访问/更新一次即可。

## 第四步：回填跨域白名单（重要，否则线上页面无法对话）

拿到 Gitee Pages 地址后，回后端平台添加环境变量：

```
ALLOWED_ORIGINS=https://<你的用户名>.gitee.io
```

- Render：Environment 保存后自动重新部署
- HF Spaces：改完后到 Settings 点 **Factory rebuild**

## 日常更新流程

改完代码 → `./deploy/build.sh <后端地址>` → `git add -A && git commit && git push` → 到 Gitee Pages 服务页点「更新」。后端代码变更则去平台重新部署（HF 点 Factory rebuild / Render 推送自动部署）。
