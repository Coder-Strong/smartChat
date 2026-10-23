import { useEffect, useRef, useState } from 'react'
import { Button, Tooltip } from 'antd'
import { ClearOutlined } from '@ant-design/icons'
import MessageList from './components/MessageList'
import ChatInput from './components/ChatInput'
import StageSteps from './components/StageSteps'
import { sendChat } from './api/chat'

// AI 回复末尾的标记：[[MODE:1~3]] 题型（判断出题型时输出）、[[STEP:1~4]] 当前步骤
const MARKER_RE = /\[\[(?:MODE|STEP):[1-4]\]\]/g
const MODE_RE = /\[\[MODE:([1-3])\]\]/
const STEP_RE = /\[\[STEP:([1-4])\]\]/

export default function App() {
  const [messages, setMessages] = useState([]) // 完整多轮上下文
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState(1) // 题型模式 1~3
  const [stage, setStage] = useState(null) // 当前解题阶段 1~4
  const [attachments, setAttachments] = useState([]) // 待发送附件
  const timerRef = useRef(null)

  useEffect(() => () => clearInterval(timerRef.current), [])

  // 打字机效果逐步展示 AI 回复
  const typeReply = (fullText) => {
    if (!fullText) {
      setLoading(false)
      return
    }
    const step = Math.max(1, Math.ceil(fullText.length / 150))
    let index = 0
    timerRef.current = setInterval(() => {
      index = Math.min(index + step, fullText.length)
      const text = fullText.slice(0, index)
      setMessages((prev) => {
        const next = [...prev]
        next[next.length - 1] = { role: 'assistant', content: text }
        return next
      })
      if (index >= fullText.length) {
        clearInterval(timerRef.current)
        setLoading(false)
      }
    }, 20)
  }

  const sendText = async (rawText, pending = []) => {
    const text = rawText.trim()
    if ((!text && pending.length === 0) || loading) return

    const userMessage = {
      role: 'user',
      content: text,
      ...(pending.length > 0 ? { attachments: pending } : {}),
    }
    const history = [...messages, userMessage]
    setMessages([...history, { role: 'assistant', content: '' }])
    setInput('')
    setAttachments([])
    setLoading(true)

    try {
      const data = await sendChat(history)
      // 解析题型与步骤标记并从正文中剥离，不展示给学生
      const modeMatch = data.reply.match(MODE_RE)
      const stepMatch = data.reply.match(STEP_RE)
      if (modeMatch) setMode(Number(modeMatch[1]))
      if (stepMatch) setStage(Number(stepMatch[1]))
      typeReply(data.reply.replace(MARKER_RE, '').trimEnd())
    } catch (err) {
      const detail = err.response?.data?.detail || err.message
      setMessages((prev) => {
        const next = [...prev]
        next[next.length - 1] = {
          role: 'assistant',
          content: `请求出错了：${detail}`,
        }
        return next
      })
      setLoading(false)
    }
  }

  const handleSend = () => sendText(input, attachments)

  // 点击预置题目，直接开始这道题的学习
  const handlePickTopic = (topic) => {
    sendText(`老师好，我想练习这道题：${topic.text}`)
  }

  const handleClear = () => {
    clearInterval(timerRef.current)
    setMessages([])
    setInput('')
    setLoading(false)
    setMode(1)
    setStage(null)
    setAttachments([])
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-brand">
          <span className="header-logo">📐</span>
          <div>
            <div className="header-title">SmartChat · 数学导师智能体</div>
            <div className="header-subtitle">应用建模 / 计算求解 / 几何推理 · 分步引导学习</div>
          </div>
        </div>
        <Tooltip title="清空对话">
          <Button
            className="header-clear-btn"
            icon={<ClearOutlined />}
            onClick={handleClear}
            disabled={loading}
          />
        </Tooltip>
      </header>

      <main className="chat-panel">
        <StageSteps mode={mode} step={stage} />
        <MessageList
          messages={messages}
          loading={loading}
          onPickTopic={handlePickTopic}
        />
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          loading={loading}
          attachments={attachments}
          onAdd={(item) => setAttachments((prev) => [...prev, item])}
          onRemove={(index) =>
            setAttachments((prev) => prev.filter((_, i) => i !== index))
          }
        />
      </main>
    </div>
  )
}
