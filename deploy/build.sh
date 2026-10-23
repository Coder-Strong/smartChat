#!/usr/bin/env bash
# 构建前端并输出 Gitee Pages 发布产物
# 用法: ./deploy/build.sh <后端公网地址>
# 例如: ./deploy/build.sh https://smartchat-api.hf.space
set -euo pipefail

BACKEND_URL="${1:?用法: ./deploy/build.sh <后端公网地址>，如 https://xxx.hf.space}"
cd "$(dirname "$0")/../frontend"

VITE_API_BASE="${BACKEND_URL%/}/api" npm run build

rm -rf ../gitee-pages
cp -R dist ../gitee-pages
echo
echo "✅ 构建完成：gitee-pages/ 目录（API 已指向 ${BACKEND_URL%/}/api）"
echo "下一步：git add -A && git commit && git push 到 Gitee，然后在仓库 Pages 服务里点「更新」"
