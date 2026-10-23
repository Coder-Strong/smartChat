import { Steps } from 'antd'
import { MODES } from '../topics'

// 顶部四步进度条：步骤名随题型模式切换，step 为 1~4，null 表示尚未开始
export default function StageSteps({ mode = 1, step }) {
  const stages = MODES[mode]?.stages || MODES[1].stages
  return (
    <div className="stage-steps">
      <Steps
        size="small"
        current={step == null ? -1 : step - 1}
        items={stages.map((title) => ({ title }))}
      />
    </div>
  )
}
