import { motion } from 'framer-motion'
import { Translations } from '../i18n'
import './StatusBar.css'

interface StatusBarProps {
  agentCount: number
  activeCount: number
  workingCount: number
  thinkingCount: number
  isConnected: boolean
  t: Translations
}

export default function StatusBar({
  agentCount,
  activeCount,
  workingCount,
  thinkingCount,
  isConnected,
  t
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
            <span className="stat-label">{t.total}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value active">{activeCount}</span>
            <span className="stat-label">{t.active}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value working">{workingCount}</span>
            <span className="stat-label">{t.statusMap.working}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value thinking">{thinkingCount}</span>
            <span className="stat-label">{t.statusMap.thinking}</span>
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
            {isConnected ? t.connected : t.disconnected}
          </span>
        </div>
      </div>
    </motion.header>
  )
}
