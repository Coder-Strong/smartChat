import { Button, Input, Upload, message } from 'antd'
import { PaperClipOutlined, SendOutlined } from '@ant-design/icons'
import Attachments from './Attachments'

const { TextArea } = Input

const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 压缩前的图片上限 10MB
const MAX_FILE_SIZE = 2 * 1024 * 1024 // GIF / PDF / 文本上限 2MB（云端转发更稳）
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

// 图片压缩：最长边 1600px、JPEG 质量 0.8，兼顾题目识别清晰度与上传体积
const compressImage = (file) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve({
        name: file.name.replace(/\.\w+$/, '') + '.jpg',
        mediaType: 'image/jpeg',
        dataUrl: canvas.toDataURL('image/jpeg', 0.8),
      })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片解析失败'))
    }
    img.src = url
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
    if (attachments.length >= MAX_COUNT) {
      message.warning('每条消息最多 4 个附件')
      return false
    }
    try {
      if (mediaType.startsWith('image/') && mediaType !== 'image/gif') {
        // 手机拍的照片体积大，先本地压缩再上传
        if (file.size > MAX_IMAGE_SIZE) {
          message.warning('图片过大（超过 10MB），请截图后上传')
          return false
        }
        onAdd(await compressImage(file))
      } else {
        // GIF / PDF / 文本不压缩，限制 2MB
        if (file.size > MAX_FILE_SIZE) {
          message.warning('该文件超过 2MB，请精简后重新上传')
          return false
        }
        onAdd({ name: file.name, mediaType, dataUrl: await readAsDataUrl(file) })
      }
    } catch {
      message.warning('文件处理失败，请重试')
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
