import { motion } from 'framer-motion'
import { Translations } from '../i18n'
import './WorkstationCard.css'

interface Agent {
  id: string
  name: string
  status: string
  statusText: string
  avatar: string
  color: string
  workTime: string
  currentTask: string | null
}

interface Props {
  agent: Agent
  index: number
  onEdit: () => void
  t: Translations
}

const STATUS_MONITOR_COLOR: Record<string, string> = {
  idle:        '#263238',
  thinking:    '#ffd54f',
  working:     '#4fc3f7',
  coding:      '#4fc3f7',
  researching: '#80deea',
  debugging:   '#ef9a9a',
  testing:     '#ce93d8',
  reporting:   '#a5d6a7',
  waiting:     '#ffcc80',
}

export default function WorkstationCard({ agent, index, onEdit, t }: Props) {
  const isWorking = agent.status !== 'idle'
  const mc = STATUS_MONITOR_COLOR[agent.status] || '#4fc3f7'
  const statusLabel = t.statusMap[agent.status as keyof typeof t.statusMap] || t.statusMap.working

  return (
    <motion.div
      className="pixel-desk"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
    >
      {agent.currentTask && (
        <div className="task-bubble">{agent.currentTask}</div>
      )}

      {/* 角色 — 点击弹出编辑面板 */}
      <div className={`pixel-character ${isWorking ? 'working' : ''}`}
        onClick={onEdit} style={{ cursor: 'pointer' }}>
        {agent.avatar}
        {isWorking && <div className="work-ping" />}
      </div>

      {/* 显示器 */}
      <div className="pixel-monitor-wrap">
        <div
          className={`pixel-monitor ${isWorking ? 'active' : ''}`}
          style={{ '--mc': mc } as React.CSSProperties}
        >
          <span className="monitor-text">{statusLabel}</span>
          {isWorking && <div className="monitor-scan" />}
        </div>
        <div className="monitor-neck" />
        <div className="monitor-foot" />
      </div>

      {/* 桌面 */}
      <div className="pixel-desk-top" />
      <div className="pixel-desk-side" />
      <div className="pixel-desk-legs">
        <div className="pixel-desk-leg" />
        <div className="pixel-desk-leg" />
      </div>

      {/* 名牌 */}
      <div className="pixel-nameplate">
        <span className="pixel-name">{agent.name}</span>
        <span className={`pixel-status-text ${isWorking ? 'active' : ''}`}>
          {agent.statusText}
        </span>
      </div>
    </motion.div>
  )
}
