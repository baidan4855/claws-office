import { useState, useEffect, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import WorkstationCard from './components/WorkstationCard'
import AgentEditPanel from './components/AgentEditPanel'
import './App.css'

interface Agent {
  id: string; name: string; status: string; statusText: string
  group: string; avatar: string; color: string; workTime: string
  workTimeMs: number; currentTask: string | null; currentTaskIcon: string | null
}
interface Group { id: string; name: string; color: string }

type Lang = 'zh' | 'en'

const T = {
  zh: {
    title: '🏢 CLAWS OFFICE',
    live: '实时', offline: '离线',
    all: '全部',
    active: '活跃', total: '总计',
    agents: '员工', workTime: '工时',
    groups: '分组', addGroup: '添加分组', editGroup: '编辑', deleteGroup: '删除',
    statusMap: {
      idle: '空闲', thinking: '思考中', working: '工作中',
      researching: '查阅资料', coding: '写代码',
      testing: '测试中', debugging: '排查问题', reporting: '汇报进度'
    },
    editTitle: '编辑员工', name: '姓名', group: '组别', avatar: '头像', save: '保存',
    bulletin: '📋 公告',
  },
  en: {
    title: '🏢 CLAWS OFFICE',
    live: 'Live', offline: 'Offline',
    all: 'All',
    active: 'Active', total: 'Total',
    agents: 'Agents', workTime: 'Work Time',
    groups: 'Groups', addGroup: 'Add Group', editGroup: 'Edit', deleteGroup: 'Delete',
    statusMap: {
      idle: 'Idle', thinking: 'Thinking', working: 'Working',
      researching: 'Researching', coding: 'Coding',
      testing: 'Testing', debugging: 'Debugging', reporting: 'Reporting'
    },
    editTitle: 'Edit Agent', name: 'Name', group: 'Group', avatar: 'Avatar', save: 'Save',
    bulletin: '📋 Board',
  }
}

function App() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [totalWorkTime, setTotalWorkTime] = useState(0)
  const [editingAgent, setEditingAgent] = useState<string | null>(null)
  const [now, setNow] = useState(new Date())
  const [skyObjects, setSkyObjects] = useState<{ id: number; type: 'meteor' | 'plane'; top: number; startX: number; direction: 'ltr' | 'rtl'; scale: number; duration: number }[]>([])
  const [lang, setLang] = useState<Lang>('zh')
  const [showGroupPanel, setShowGroupPanel] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const skyObjId = useRef(0)
  const t = T[lang]

  // 分组管理
  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return
    await fetch('/api/groups', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newGroupName.trim() })
    })
    setNewGroupName('')
    const res = await fetch('/api/config')
    const d = await res.json()
    setGroups(d.groups || [])
  }

  const handleDeleteGroup = async (groupId: string) => {
    await fetch(`/api/groups/${groupId}`, { method: 'DELETE' })
    const res = await fetch('/api/config')
    const d = await res.json()
    setGroups(d.groups || [])
    if (selectedGroup === groupId) setSelectedGroup(null)
    setConfirmDelete(null)
  }

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(d => { setGroups(d.groups || []); setAgents(d.agents || []) })
      .catch(console.error)
  }, [])

  useEffect(() => {
    const connectSSE = () => {
      if (eventSourceRef.current) eventSourceRef.current.close()
      const url = selectedGroup
        ? `/api/agents/stream?group=${selectedGroup}`
        : '/api/agents/stream'
      try {
        const es = new EventSource(url)
        eventSourceRef.current = es
        es.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data)
            if (data.type === 'connected' || data.type === 'update') setIsConnected(true)
            if (data.type === 'update' && data.agents) {
              const processed = data.agents.map((a: any) => ({
                ...a, name: a.name || a.id,
                statusText: t.statusMap[a.status as keyof typeof t.statusMap] || t.statusMap.working
              }))
              setAgents(prev => processed.map((a: any) => {
                const existing = prev.find(p => p.id === a.id)
                // 保留本地修改的 name/avatar，避免被 SSE 覆盖
                return existing
                  ? { ...a, name: existing.name, avatar: existing.avatar }
                  : a
              }))
              setTotalWorkTime(processed.reduce((s: number, a: any) => s + (a.workTimeMs || 0), 0))
            }
          } catch {}
        }
        es.onerror = () => { setIsConnected(false); es.close(); setTimeout(connectSSE, 3000) }
      } catch { setTimeout(connectSSE, 3000) }
    }
    connectSSE()
    return () => { eventSourceRef.current?.close() }
  }, [selectedGroup])

  const handleSaveAgent = async (agentId: string, changes: { name?: string; avatar?: string; group?: string }) => {
    if (changes.group) {
      await fetch(`/api/config/agent/${agentId}/group`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group: changes.group })
      })
    }
    if (changes.name || changes.avatar) {
      await fetch(`/api/config/agent/${agentId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: changes.name, avatar: changes.avatar })
      })
    }
    // 乐观更新本地状态
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, ...changes } : a))
    setEditingAgent(null)
  }

  const formatTime = (ms: number) => {
    const m = Math.floor(ms / 60000), h = Math.floor(m / 60)
    return h > 0 ? `${h}h${m % 60}m` : m > 0 ? `${m}m` : `${Math.floor(ms / 1000)}s`
  }

  const hour = now.getHours()
  const minute = now.getMinutes()
  const isNight = hour < 6 || hour >= 20
  const isDusk = !isNight && (hour < 8 || hour >= 18)

  useEffect(() => {
    const schedule = () => {
      const delay = isNight
        ? 15000 + Math.random() * 15000
        : 20000 + Math.random() * 20000
      return setTimeout(() => {
        const id = ++skyObjId.current
        const top = 5 + Math.random() * 80
        const startX = 20 + Math.random() * 70
        const isPlane = !isNight
        const direction = isPlane && Math.random() > 0.5 ? 'rtl' : 'ltr'
        const scale = isPlane ? 0.5 + Math.random() * 0.5 : 1 // 50%-100% 大小
        const baseDuration = 6
        const duration = baseDuration / scale // 越小越慢，模拟远处
        setSkyObjects(prev => [...prev, { id, type: isNight ? 'meteor' : 'plane', top, startX, direction, scale, duration }])
        const removeDelay = isNight ? 3000 : duration * 1000
        setTimeout(() => setSkyObjects(prev => prev.filter(o => o.id !== id)), removeDelay)
        timerRef.current = schedule()
      }, delay)
    }
    const timerRef = { current: null as ReturnType<typeof setTimeout> | null }
    timerRef.current = schedule()
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [isNight])

  const activeCount = agents.filter(a => a.status !== 'idle').length

  const skyStyle = isNight
    ? { '--sky-top': '#050a14', '--sky-mid': '#0a1628', '--sky-bottom': '#0f2040' } as React.CSSProperties
    : isDusk
    ? { '--sky-top': '#1a1a3a', '--sky-mid': '#8b4513', '--sky-bottom': '#ff7043' } as React.CSSProperties
    : { '--sky-top': '#1a3a5c', '--sky-mid': '#2d5a8e', '--sky-bottom': '#4a7fb5' } as React.CSSProperties

  // 太阳：6:00 从左升起，18:00 落到右边，弧形轨迹
  const sunProgress = Math.max(0, Math.min(1, (hour + minute / 60 - 6) / 12))
  const sunX = sunProgress * 100  // 0% ~ 100% 水平
  const sunY = 85 - Math.sin(sunProgress * Math.PI) * 80  // 弧形，顶点在中间

  // 月亮：20:00 从左升起，6:00 落到右边
  const moonHour = hour >= 20 ? hour - 20 : hour + 4  // 0~10 范围
  const moonProgress = Math.max(0, Math.min(1, (moonHour + minute / 60) / 10))
  const moonX = moonProgress * 100
  const moonY = 85 - Math.sin(moonProgress * Math.PI) * 80

  const STARS = [
    { top: '15%', left: '8%', size: 3 }, { top: '30%', left: '15%', size: 2 },
    { top: '10%', left: '25%', size: 2 }, { top: '40%', left: '32%', size: 3 },
    { top: '20%', left: '45%', size: 2 }, { top: '35%', left: '55%', size: 3 },
    { top: '12%', left: '62%', size: 2 }, { top: '28%', left: '72%', size: 3 },
    { top: '18%', left: '80%', size: 2 }, { top: '38%', left: '88%', size: 3 },
    { top: '8%',  left: '92%', size: 2 }, { top: '45%', left: '5%',  size: 2 },
    { top: '5%',  left: '50%', size: 3 }, { top: '42%', left: '68%', size: 2 },
    { top: '22%', left: '38%', size: 2 },
  ]

  return (
    <div className="app">
      {/* HUD 头部 */}
      <header className="compact-header">
        <div className="header-left">
          <h1 className="title">{t.title}</h1>
          <div className="status-pill">
            <span className={`header-status-dot ${isConnected ? 'online' : ''}`} />
            {isConnected ? t.live : t.offline}
          </div>
        </div>
        <div className="header-right">
          <button className="lang-btn" onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')}>
            {lang === 'zh' ? 'EN' : '中文'}
          </button>
        </div>
      </header>

      {/* 场景 */}
      <div className="scene" style={skyStyle} onClick={() => showGroupPanel && setShowGroupPanel(false)}>
        {/* 天空层 */}
        <div className="sky-layer">
          {isNight && STARS.map((s, i) => (
            <span key={i} className="star" style={{
              position: 'absolute', top: s.top, left: s.left,
              width: s.size, height: s.size,
              animationDelay: `${(i * 0.37) % 2}s`
            }} />
          ))}
          {/* 太阳 / 月亮 */}
          {isNight
            ? <span style={{
                position: 'absolute',
                left: `${moonX}%`, top: `${moonY}%`,
                fontSize: 28, lineHeight: 1,
                transform: 'translate(-50%, -50%)',
                filter: 'drop-shadow(0 0 8px rgba(200,220,255,0.8))',
                transition: 'left 60s linear, top 60s linear',
                pointerEvents: 'none'
              }}>🌙</span>
            : <span style={{
                position: 'absolute',
                left: `${sunX}%`, top: `${sunY}%`,
                fontSize: 32, lineHeight: 1,
                transform: 'translate(-50%, -50%)',
                filter: 'drop-shadow(0 0 12px rgba(255,220,50,0.9))',
                transition: 'left 60s linear, top 60s linear',
                pointerEvents: 'none'
              }}>☀️</span>
          }
          {/* 流星 / 飞机 */}
          {skyObjects.map(o => (
            <span key={o.id}
              className={o.type === 'meteor' ? 'meteor' : `plane ${o.direction}`}
              style={{
                top: `${o.top}%`,
                ...(o.type === 'meteor' ? { left: `${o.startX}%`, right: 'auto' } : { transform: o.direction === 'rtl' ? 'rotate(-135deg)' : 'rotate(45deg)', fontSize: `${20 * o.scale}px`, animationDuration: `${o.duration}s` })
              }} />
          ))}
          {!isNight && <>
            <span className="cloud" style={{ fontSize: 30, animationDuration: '13s' }}>☁️</span>
            <span className="cloud" style={{ fontSize: 22, animationDuration: '17s', animationDelay: '-4s' }}>☁️</span>
            <span className="cloud" style={{ fontSize: 28, animationDuration: '15s', animationDelay: '-8s' }}>☁️</span>
            <span className="cloud" style={{ fontSize: 20, animationDuration: '19s', animationDelay: '-2s' }}>☁️</span>
            <span className="cloud" style={{ fontSize: 26, animationDuration: '14s', animationDelay: '-6s' }}>☁️</span>
            <span className="cloud" style={{ fontSize: 18, animationDuration: '21s', animationDelay: '-10s' }}>☁️</span>
            <span className="cloud" style={{ fontSize: 24, animationDuration: '16s', animationDelay: '-3s' }}>☁️</span>
          </>}
        </div>

        {/* 墙面层（固定高度） */}
        <div className="wall-layer">
          <span className="wall-decor wall-door">🚪</span>
          <span className="wall-decor wall-decor-left">🪴</span>
          {[...Array(5)].map((_, i) => <span key={i} className="office-window">🪟</span>)}
          <div className="wall-board">
            <div className="wall-board-title">{t.bulletin}</div>
            <div className="wall-board-line" />
            <div className="wall-board-line short" />
          </div>
          <span className="wall-decor wall-decor-right">🗄️</span>

          {/* 时钟保持绝对定位居中 */}
          <div className="wall-clock">
            <div className="wall-clock-time">
              {now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
            </div>
            <div className="wall-clock-date">
              {now.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: '2-digit', day: '2-digit', weekday: 'short' })}
            </div>
          </div>
        </div>

        {/* 地板层 */}
        <div className="floor-layer" />

        {/* 工位网格 — 绝对居中覆盖在场景上 */}
        <div className="grid-center">
          <div className="office-grid">
            <AnimatePresence mode="popLayout">
              {agents.map((agent, index) => (
                <div key={agent.id} className="agent-wrapper">
                  <WorkstationCard agent={agent} index={index} onEdit={() => setEditingAgent(agent.id)} />
                </div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* 编辑面板 */}
        <AnimatePresence>
          {editingAgent && (() => {
            const agent = agents.find(a => a.id === editingAgent)
            if (!agent) return null
            return (
              <AgentEditPanel
                agentId={agent.id}
                name={agent.name}
                avatar={agent.avatar}
                group={agent.group}
                groups={groups}
                onSave={handleSaveAgent}
                onClose={() => setEditingAgent(null)}
                t={{ editTitle: t.editTitle, name: t.name, group: t.group, avatar: t.avatar, save: t.save }}
              />
            )
          })()}
        </AnimatePresence>
      </div>

      {/* 底部工具条 */}
      <footer className="bottom-toolbar">
        <div className="toolbar-stat">
          <span className="toolbar-label">👥 {t.agents}</span>
          <span className="toolbar-value">{activeCount} <span className="toolbar-dim">/ {agents.length}</span></span>
        </div>
        <div className="toolbar-divider" />
        <div className="toolbar-stat">
          <span className="toolbar-label">⏱ {t.workTime}</span>
          <span className="toolbar-value">{formatTime(totalWorkTime)}</span>
        </div>
        <div className="toolbar-divider" />
        <div className="toolbar-stat">
          <span className="toolbar-label">🟢 {t.active}</span>
          <span className="toolbar-value">{activeCount}</span>
        </div>
        <div className="toolbar-divider" />

        {/* 分组筛选 */}
        <div className="toolbar-group-filter">
          <button className={`toolbar-filter-btn ${selectedGroup === null ? 'active' : ''}`}
            onClick={() => setSelectedGroup(null)}>{t.all}</button>
          {groups.map(g => (
            <button key={g.id} className={`toolbar-filter-btn ${selectedGroup === g.id ? 'active' : ''}`}
              onClick={() => setSelectedGroup(g.id)} style={{ borderLeftColor: g.color }}>{g.name}</button>
          ))}
          <button className="toolbar-filter-btn toolbar-add-group" onClick={() => setShowGroupPanel(!showGroupPanel)}>
            {showGroupPanel ? '✕' : '+'}
          </button>
        </div>

        {/* 分组管理面板 */}
        {showGroupPanel && (
          <div className="group-panel" onClick={e => e.stopPropagation()}>
            <div className="group-panel-title">{t.groups}</div>
            <div className="group-panel-list">
              {groups.map(g => (
                <div key={g.id} className="group-panel-item">
                  <span className="group-dot" style={{ background: g.color }} />
                  <span className="group-name">{g.name}</span>
                  <button className="group-del-btn" onClick={() => setConfirmDelete(g.id)}>✕</button>
                </div>
              ))}
            </div>
            <div className="group-panel-add">
              <input className="group-input" placeholder={t.addGroup} value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddGroup()} />
              <button className="group-add-btn" onClick={handleAddGroup}>+</button>
            </div>
          </div>
        )}

        {/* 删除确认弹窗 */}
        {confirmDelete && (
          <div className="confirm-overlay" onClick={() => setConfirmDelete(null)}>
            <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
              <div className="confirm-title">{lang === 'zh' ? '确认删除' : 'Confirm Delete'}</div>
              <div className="confirm-msg">
                {lang === 'zh' ? '确定要删除该分组吗？' : 'Delete this group?'}
              </div>
              <div className="confirm-btns">
                <button className="confirm-cancel" onClick={() => setConfirmDelete(null)}>
                  {lang === 'zh' ? '取消' : 'Cancel'}
                </button>
                <button className="confirm-ok" onClick={() => handleDeleteGroup(confirmDelete)}>
                  {lang === 'zh' ? '删除' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </footer>
    </div>
  )
}

export default App
