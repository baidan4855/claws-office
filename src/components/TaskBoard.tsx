import { motion } from 'framer-motion'
import './TaskBoard.css'

interface Agent {
  id: string
  name: string
  status: 'idle' | 'thinking' | 'working' | 'waiting'
  currentTask?: string
  nextTask?: string
  avatar: string
  color: string
  exp: number
  level: number
}

interface TaskBoardProps {
  agents: Agent[]
  onClose: () => void
}

export default function TaskBoard({ agents, onClose }: TaskBoardProps) {
  const activeAgents = agents.filter(a => a.currentTask)

  return (
    <motion.div 
      className="task-board-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div 
        className="task-board"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 50 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Board header */}
        <div className="board-header">
          <h2 className="board-title">📋 任务看板</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        {/* Board content */}
        <div className="board-content">
          {/* Active tasks */}
          <div className="task-section">
            <h3 className="section-title">🔴 进行中 ({activeAgents.length})</h3>
            <div className="task-list">
              {activeAgents.map(agent => (
                <div key={agent.id} className="task-card">
                  <div className="task-worker">
                    <span className="worker-avatar">{agent.avatar}</span>
                    <span className="worker-name">{agent.name}</span>
                  </div>
                  <div className="task-content">
                    {agent.currentTask}
                  </div>
                  <div className="task-exp">
                    +{agent.exp} EXP
                  </div>
                </div>
              ))}
              {activeAgents.length === 0 && (
                <div className="empty-state">暂无进行中的任务</div>
              )}
            </div>
          </div>
          
          {/* Idle workers */}
          <div className="task-section">
            <h3 className="section-title">💤 空闲中 ({agents.length - activeAgents.length})</h3>
            <div className="idle-list">
              {agents.filter(a => !a.currentTask).map(agent => (
                <div key={agent.id} className="idle-worker">
                  <span className="worker-avatar">{agent.avatar}</span>
                  <span className="worker-name">{agent.name}</span>
                  <span className="worker-level">Lv.{agent.level}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Board footer */}
        <div className="board-footer">
          <span>🕐 最后更新: {new Date().toLocaleTimeString()}</span>
        </div>
      </motion.div>
    </motion.div>
  )
}
