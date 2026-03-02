import './StatusHUD.css'

interface StatusHUDProps {
  agentCount: number
  activeCount: number
  workingCount: number
  totalExp: number
  teamLevel: number
  isConnected: boolean
  onTaskBoardClick: () => void
}

export default function StatusHUD({
  agentCount,
  activeCount,
  workingCount,
  totalExp,
  teamLevel,
  isConnected,
  onTaskBoardClick
}: StatusHUDProps) {
  // Progress to next level
  const expToNext = 500
  const expProgress = (totalExp % expToNext) / expToNext * 100

  return (
    <header className="status-hud">
      <div className="hud-left">
        <div className="hud-item">
          <span className="hud-label">员工数</span>
          <span className="hud-value">{agentCount}</span>
        </div>
        <div className="hud-item">
          <span className="hud-label">在岗</span>
          <span className="hud-value active">{activeCount}</span>
        </div>
        <div className="hud-item">
          <span className="hud-label">工作中</span>
          <span className="hud-value working">{workingCount}</span>
        </div>
      </div>
      
      <div className="hud-center">
        <button className="task-board-btn pixel-button" onClick={onTaskBoardClick}>
          📋 任务看板
        </button>
      </div>
      
      <div className="hud-right">
        <div className="hud-item">
          <span className="hud-label">团队等级</span>
          <span className="hud-value level">Lv.{teamLevel}</span>
        </div>
        <div className="hud-item exp-bar-container">
          <span className="hud-label">经验值</span>
          <div className="exp-bar">
            <div 
              className="exp-fill" 
              style={{ width: `${expProgress}%` }}
            />
          </div>
          <span className="exp-text">{totalExp}/{expToNext}</span>
        </div>
        <div className="hud-item">
          <span className={`connection-status ${isConnected ? 'online' : 'offline'}`}>
            {isConnected ? '🟢' : '🔴'}
          </span>
        </div>
      </div>
    </header>
  )
}
