import { useEffect, useRef } from 'react'
import { Avatar } from 'antd'
import { RobotOutlined, UserOutlined } from '@ant-design/icons'
import { TOPICS } from '../topics'
import Attachments from './Attachments'

// 无消息时的选题欢迎页
function EmptyState({ onPickTopic }) {
  return (
    <div className="empty-state">
      <div className="empty-logo">📐</div>
      <h2>一起玩转数学建模</h2>
      <p>
        我是你的建模导师，选一道题开始，我们一起完成四步挑战；也可以直接输入题目，或上传题目照片
        / 文件。
      </p>
      <div className="topic-list">
        {TOPICS.map((topic) => (
          <div key={topic.id} className="topic-card" onClick={() => onPickTopic(topic)}>
            <span className={`topic-tag tag-${topic.kind}`}>{topic.tag}</span>
            <div className="topic-title">{topic.title}</div>
            <div className="topic-text">{topic.text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// 等待回复时的三点动画
function TypingDots() {
  return (
    <div className="typing-dots">
      <span />
      <span />
      <span />
    </div>
  )
}

export default function MessageList({ messages, loading, onPickTopic }) {
  const listRef = useRef(null)

  // 消息变化时自动滚动到底部
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, loading])

  return (
    <div className="message-list" ref={listRef}>
      {messages.length === 0 ? (
        <EmptyState onPickTopic={onPickTopic} />
      ) : (
        messages.map((msg, index) => {
          const isUser = msg.role === 'user'
          const isWaiting =
            !isUser && !msg.content && loading && index === messages.length - 1
          return (
            <div key={index} className={`message-row ${isUser ? 'row-user' : 'row-ai'}`}>
              <Avatar
                className="msg-avatar"
                icon={isUser ? <UserOutlined /> : <RobotOutlined />}
              />
              <div className={`message-bubble ${isUser ? 'bubble-user' : 'bubble-ai'}`}>
                {isWaiting ? (
                  <TypingDots />
                ) : (
                  <>
                    {msg.attachments?.length > 0 && <Attachments items={msg.attachments} />}
                    {msg.content}
                  </>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
