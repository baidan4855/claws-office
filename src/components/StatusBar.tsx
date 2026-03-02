import { motion } from 'framer-motion'
import './StatusBar.css'

interface StatusBarProps {
  agentCount: number
  activeCount: number
  workingCount: number
  thinkingCount: number
  isConnected: boolean
}

export default function StatusBar({
  agentCount,
  activeCount,
  workingCount,
  thinkingCount,
  isConnected
}: StatusBarProps) {
  return (
    <motion.header 
      className="status-bar"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="status-bar-content">
        <div className="status-stats">
          <div className="stat-item">
            <span className="stat-value">{agentCount}</span>
            <span className="stat-label">总 Agent</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value active">{activeCount}</span>
            <span className="stat-label">活跃</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value working">{workingCount}</span>
            <span className="stat-label">工作中</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value thinking">{thinkingCount}</span>
            <span className="stat-label">思考中</span>
          </div>
        </div>

        <div className="status-connection">
          <motion.span 
            className="connection-dot"
            animate={{ 
              scale: isConnected ? [1, 1.2, 1] : 1,
              opacity: isConnected ? 1 : 0.3
            }}
            transition={{ duration: 1, repeat: isConnected ? Infinity : 0 }}
            style={{ 
              backgroundColor: isConnected ? '#22c55e' : '#ef4444' 
            }}
          />
          <span className="connection-text">
            {isConnected ? '实时连接' : '断开连接'}
          </span>
        </div>
      </div>
    </motion.header>
  )
}
