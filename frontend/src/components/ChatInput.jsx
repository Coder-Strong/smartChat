import { Button, Input, Upload, message } from 'antd'
import { PaperClipOutlined, SendOutlined } from '@ant-design/icons'
import Attachments from './Attachments'

const { TextArea } = Input

const MAX_SIZE = 5 * 1024 * 1024 // 单个附件上限 5MB
const MAX_COUNT = 4 // 每条消息附件上限

// 支持的附件类型：浏览器识别不出的类型按后缀补 mediaType
const MEDIA_BY_SUFFIX = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
}

const ACCEPT = Object.keys(MEDIA_BY_SUFFIX)
  .map((s) => `.${s}`)
  .join(',')

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })

export default function ChatInput({
  value,
  onChange,
  onSend,
  loading,
  attachments,
  onAdd,
  onRemove,
}) {
  const beforeUpload = async (file) => {
    const suffix = file.name.split('.').pop().toLowerCase()
    const mediaType = file.type || MEDIA_BY_SUFFIX[suffix]
    if (!mediaType || !Object.keys(MEDIA_BY_SUFFIX).includes(suffix)) {
      message.warning(`暂不支持文件：${file.name}`)
      return false
    }
    if (file.size > MAX_SIZE) {
      message.warning('单个附件不能超过 5MB')
      return false
    }
    if (attachments.length >= MAX_COUNT) {
      message.warning('每条消息最多 4 个附件')
      return false
    }
    try {
      const dataUrl = await readAsDataUrl(file)
      onAdd({ name: file.name, mediaType, dataUrl })
    } catch {
      message.warning('文件读取失败，请重试')
    }
    return false // 阻止 antd 自动上传，附件随消息一起发送
  }

  return (
    <div className="chat-input-wrap">
      <Attachments items={attachments} onRemove={onRemove} />
      <div className="chat-input">
        <Upload
          accept={ACCEPT}
          multiple
          showUploadList={false}
          beforeUpload={beforeUpload}
          disabled={loading}
        >
          <Button
            className="attach-btn"
            icon={<PaperClipOutlined />}
            disabled={loading}
            title="上传题目图片或文件"
          />
        </Upload>
        <TextArea
          value={value}
          placeholder="输入你的思路或回答，也可上传题目图片 / 文件（Enter 发送，Shift + Enter 换行）"
          autoSize={{ minRows: 1, maxRows: 4 }}
          onChange={(e) => onChange(e.target.value)}
          onPressEnter={(e) => {
            // 中文输入法选词的回车不触发发送
            if (!e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              onSend()
            }
          }}
        />
        <Button type="primary" icon={<SendOutlined />} loading={loading} onClick={onSend}>
          发送
        </Button>
      </div>
    </div>
  )
}
