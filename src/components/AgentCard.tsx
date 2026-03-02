import { motion } from 'framer-motion'

interface Agent {
  id: string
  name: string
  status: 'idle' | 'thinking' | 'working' | 'waiting' | 'researching' | 'coding' | 'testing' | 'debugging' | 'reporting'
  statusText?: string
  currentTask?: string
  nextTask?: string
  avatar: string
  color: string
  lastMessage?: string
}

interface AgentCardProps {
  agent: Agent
  index: number
}

// Extended status config with all new statuses
const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  idle: { label: '空闲', color: '#94a3b8', icon: '💤' },
  thinking: { label: '思考中', color: '#00f5ff', icon: '🤔' },
  working: { label: '工作中', color: '#22c55e', icon: '⚡' },
  waiting: { label: '等待中', color: '#eab308', icon: '⏳' },
  researching: { label: '正在查询资料', color: '#06b6d4', icon: '🔍' },
  coding: { label: '正在写代码', color: '#a855f7', icon: '💻' },
  testing: { label: '正在测试某个功能', color: '#f97316', icon: '🧪' },
  debugging: { label: '正在排查问题', color: '#ef4444', icon: '🔧' },
  reporting: { label: '正在准备汇报进度', color: '#ec4899', icon: '📋' }
}

export default function AgentCard({ agent, index }: AgentCardProps) {
  const config = statusConfig[agent.status] || statusConfig.working
  // Use statusText from API if available, otherwise fall back to config
  const displayLabel = agent.statusText || config.label

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ 
        delay: index * 0.1,
        type: 'spring',
        stiffness: 300,
        damping: 20
      }}
      className="agent-card"
      style={{ '--agent-color': agent.color } as React.CSSProperties}
    >
      <div className="agent-header">
        <div className="agent-avatar">
          {agent.avatar}
          <motion.span 
            className="status-dot"
            animate={{ 
              scale: agent.status === 'idle' ? 1 : [1, 1.2, 1],
              opacity: agent.status === 'idle' ? 0.5 : 1
            }}
            transition={{ 
              duration: 1.5, 
              repeat: agent.status === 'idle' ? 0 : Infinity 
            }}
            style={{ backgroundColor: config.color }}
          />
        </div>
        <div className="agent-info">
          <h3 className="agent-name">{agent.name}</h3>
          <span className="agent-id">#{agent.id}</span>
        </div>
        <div 
          className="status-badge"
          style={{ 
            backgroundColor: `${config.color}20`,
            color: config.color,
            borderColor: config.color
          }}
        >
          <span className="status-icon">{config.icon}</span>
          {displayLabel}
        </div>
      </div>

      <div className="agent-tasks">
        {agent.currentTask && (
          <motion.div 
            className="task current-task"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            key="current"
          >
            <span className="task-label">当前任务</span>
            <span className="task-content">{agent.currentTask}</span>
            {agent.status === 'working' && (
              <motion.div 
                className="progress-bar"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.div>
        )}
        
        {agent.nextTask && (
          <motion.div 
            className="task next-task"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            key="next"
          >
            <span className="task-label">下一步</span>
            <span className="task-content">{agent.nextTask}</span>
          </motion.div>
        )}

        {!agent.currentTask && !agent.nextTask && (
          <div className="task idle-task">
            <span className="task-content">等待新任务...</span>
          </div>
        )}
      </div>

      <div className="agent-footer">
        {agent.lastMessage && (
          <span className="last-message">{agent.lastMessage}</span>
        )}
        {!agent.lastMessage && (
          <>
            <motion.div 
              className="activity-indicator"
              animate={{ 
                rotate: agent.status === 'thinking' ? 360 : 0 
              }}
              transition={{ 
                duration: 2, 
                repeat: agent.status === 'thinking' ? Infinity : 0,
                ease: 'linear'
              }}
            >
              ⟳
            </motion.div>
            <span className="last-seen">活跃</span>
          </>
        )}
      </div>
    </motion.div>
  )
}
