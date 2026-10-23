import { CloseCircleFilled, FileTextOutlined } from '@ant-design/icons'
import { Image } from 'antd'

// 附件条：ChatInput 中可删除（传 onRemove），消息气泡内只读
export default function Attachments({ items, onRemove }) {
  if (!items?.length) return null
  return (
    <div className="attach-list">
      {items.map((item, index) => (
        <div key={index} className="attach-item">
          {item.mediaType.startsWith('image/') ? (
            <Image
              className="attach-thumb"
              src={item.dataUrl}
              alt={item.name}
              width={64}
              height={64}
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <span className="attach-file">
              <FileTextOutlined className="attach-file-icon" />
              <span className="attach-file-name">{item.name}</span>
            </span>
          )}
          {onRemove && (
            <CloseCircleFilled
              className="attach-remove"
              onClick={() => onRemove(index)}
            />
          )}
        </div>
      ))}
    </div>
  )
}
