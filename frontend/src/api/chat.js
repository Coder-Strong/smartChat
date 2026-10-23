import axios from 'axios'

const request = axios.create({
  // 开发环境走 vite 代理（/api）；生产构建时通过 VITE_API_BASE 注入后端公网地址
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 120000,
})

// 把前端附件转为 API 字段：base64 需去掉 dataURL 前缀
const toApiAttachments = (items) =>
  items?.map((a) => ({
    name: a.name,
    media_type: a.mediaType,
    data: a.dataUrl.split(',')[1],
  })) || undefined

// 发送对话请求，messages 为完整多轮上下文 [{ role, content, attachments }]
export async function sendChat(messages) {
  const { data } = await request.post('/chat', {
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
      attachments: toApiAttachments(m.attachments),
    })),
  })
  return data
}
