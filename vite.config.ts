import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import chokidar from 'chokidar'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Express 后端服务
const app = express()
const CONFIG_FILE = path.join(__dirname, 'server', 'config.json')

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))
  } catch (e) {}
  return {
    groups: [
      { id: 'dev', name: '开发组', color: '#a855f7' },
      { id: 'research', name: '研究组', color: '#ec4899' },
      { id: 'advisor', name: '顾问组', color: '#22c55e' }
    ],
    agents: [
      { id: 'main', name: 'Main Agent', avatar: '👨', color: '#00f5ff', group: 'dev' },
      { id: 'advisor', name: '投资顾问', avatar: '🧑‍💼', color: '#22c55e', group: 'advisor' },
      { id: 'coder', name: '代码开发', avatar: '👨‍💻', color: '#a855f7', group: 'dev' },
      { id: 'architect', name: '系统架构', avatar: '👨‍🏭', color: '#eab308', group: 'dev' },
      { id: 'researcher', name: '技术研究员', avatar: '🤓', color: '#ec4899', group: 'research' },
      { id: 'reviewer', name: '代码审查', avatar: '🧐', color: '#f97316', group: 'dev' }
    ]
  }
}

function saveConfig(cfg) { fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2)) }

let config = loadConfig()
const AGENT_IDS = config.agents.map(a => a.id)
const SESSIONS_DIR = process.env.OPENCLAW_SESSIONS_DIR || '/Users/jack/.openclaw/agents'
const IDLE_THRESHOLD = 15000

const agentWorkTime = {}
const agentLastStatus = {}
AGENT_IDS.forEach(id => { agentWorkTime[id] = 0; agentLastStatus[id] = 'idle' })

const STATUS_MESSAGES = {
  researching: '正在查询资料',
  coding: '正在写代码',
  testing: '正在测试某个功能',
  debugging: '正在排查问题',
  reporting: '正在准备汇报进度',
  thinking: '思考中',
  working: '工作中',
  idle: '空闲'
}

const TOOL_STATUS_MAP = {
  'exec': { icon: '⚡', text: '正在执行命令', template: (args) => `执行命令: ${args.command?.substring(0, 30) || '...'}` },
  'read': { icon: '📖', text: '正在阅读文件', template: (args) => `阅读: ${args.file_path || args.path || '文件'}` },
  'write': { icon: '✍️', text: '正在写入文件', template: (args) => `写入: ${args.file_path || args.path || '文件'}` },
  'edit': { icon: '✏️', text: '正在编辑文件', template: (args) => `编辑: ${args.file_path || args.path || '文件'}` },
  'web_fetch': { icon: '🌐', text: '正在获取网页', template: (args) => `获取: ${args.url?.substring(0, 30) || '网页'}...` },
  'web_search': { icon: '🔍', text: '正在搜索', template: (args) => `搜索: ${args.query?.substring(0, 25) || '...'}` },
  'Browser': { icon: '🌍', text: '正在浏览网页', template: (args) => '浏览网页中...' },
  'message': { icon: '💬', text: '正在发送消息', template: (args) => '发送消息中...' },
  'sessions_spawn': { icon: '🚀', text: '正在启动子任务', template: (args) => `启动任务: ${args.task?.substring(0, 25) || '子代理'}...` },
  'memory_search': { icon: '🧠', text: '正在搜索记忆', template: (args) => '搜索记忆库...' },
  'memory_store': { icon: '💾', text: '正在保存记忆', template: (args) => '保存到记忆库...' },
  'feishu_doc': { icon: '📝', text: '正在操作飞书文档', template: (args) => `操作飞书: ${args.action || '文档'}` },
  'feishu_bitable': { icon: '📊', text: '正在操作飞书表格', template: (args) => '操作飞书表格...' },
  'github': { icon: '🐙', text: '正在操作GitHub', template: (args) => `GitHub: ${args.action || '操作'}` },
  'default': { icon: '⚙️', text: '工作中', template: () => '工作中...' }
}

function getToolStatus(sessionFile) {
  if (!sessionFile || !fs.existsSync(sessionFile)) return null
  try {
    const content = fs.readFileSync(sessionFile, 'utf-8')
    const lines = content.trim().split('\n').filter(l => l.trim())
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i])
        const msg = entry.message
        if (msg?.role === 'assistant' && msg.content) {
          const content = msg.content
          if (Array.isArray(content)) {
            for (const c of content) {
              if (c.type === 'toolCall' && c.name) {
                const toolName = c.name
                const args = c.arguments || {}
                const mapping = TOOL_STATUS_MAP[toolName] || TOOL_STATUS_MAP.default
                return { text: mapping.template(args), icon: mapping.icon }
              }
            }
          }
        }
        if (msg?.role === 'toolResult' && msg.toolName) {
          const toolName = msg.toolName
          const mapping = TOOL_STATUS_MAP[toolName] || TOOL_STATUS_MAP.default
          return { text: `完成: ${mapping.text.replace('正在', '')}`, icon: mapping.icon }
        }
      } catch (e) {}
    }
  } catch (e) {}
  return null
}

function getCurrentTask(agentId) {
  try {
    const sessionsFile = path.join(SESSIONS_DIR, agentId, 'sessions', 'sessions.json')
    if (!fs.existsSync(sessionsFile)) return null
    const data = JSON.parse(fs.readFileSync(sessionsFile, 'utf-8'))
    let latestSession = null
    let latestTime = 0
    Object.values(data).forEach((session) => {
      if (session.sessionFile && session.updatedAt && session.updatedAt > latestTime) {
        latestTime = session.updatedAt
        latestSession = session
      }
    })
    if (latestSession?.sessionFile) {
      const toolStatus = getToolStatus(latestSession.sessionFile)
      if (toolStatus) return toolStatus
    }
    if (latestSession?.sessionFile && fs.existsSync(latestSession.sessionFile)) {
      const jsonlContent = fs.readFileSync(latestSession.sessionFile, 'utf-8')
      const lines = jsonlContent.trim().split('\n').filter(l => l.trim())
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const entry = JSON.parse(lines[i])
          if (entry.type === 'message' && entry.message?.role === 'user') {
            const content = entry.message?.content
            if (Array.isArray(content)) {
              const text = content.map((c) => c.text || '').join('').trim()
              if (text) return { text: text.length > 50 ? text.substring(0, 50) + '...' : text, icon: '💬' }
            }
          }
        } catch (e) {}
      }
    }
  } catch (e) {}
  return null
}

function getDetailedStatus(session) {
  if (!session) return 'idle'
  const age = Date.now() - (session.updatedAt || 0)
  if (age > IDLE_THRESHOLD) return 'idle'
  const key = session.key || ''
  if (key.includes('research') || key.includes('search')) return 'researching'
  if (key.includes('code') || key.includes('write')) return 'coding'
  if (key.includes('test')) return 'testing'
  if (key.includes('debug')) return 'debugging'
  if (key.includes('report')) return 'reporting'
  if ((session.inputTokens || 0) > 1000) return 'thinking'
  if (age < IDLE_THRESHOLD) return 'working'
  return 'idle'
}

function getAllSessions() {
  const allSessions = []
  for (const agentId of AGENT_IDS) {
    const sessionsFile = path.join(SESSIONS_DIR, agentId, 'sessions', 'sessions.json')
    try {
      if (fs.existsSync(sessionsFile)) {
        const content = fs.readFileSync(sessionsFile, 'utf-8')
        if (!content || content.trim() === '') continue
        const data = JSON.parse(content)
        if (typeof data === 'object' && !Array.isArray(data)) {
          Object.values(data).forEach((session) => {
            if (session && session.updatedAt) allSessions.push({ ...session, agentId })
          })
        }
      }
    } catch (e) {}
  }
  return allSessions
}

setInterval(() => {
  const sessions = getAllSessions()
  config.agents.forEach(agentConfig => {
    const agentSessions = sessions.filter(s => s.agentId === agentConfig.id)
    const mostRecent = agentSessions.length > 0
      ? agentSessions.reduce((latest, s) => (s.updatedAt || 0) > (latest.updatedAt || 0) ? s : latest, agentSessions[0])
      : null
    const status = getDetailedStatus(mostRecent)
    if (status !== 'idle') agentWorkTime[agentConfig.id] = (agentWorkTime[agentConfig.id] || 0) + 1000
    agentLastStatus[agentConfig.id] = status
  })
}, 1000)

function formatWorkTime(ms) {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) return `${hours}小时${minutes % 60}分钟`
  if (minutes > 0) return `${minutes}分钟${seconds % 60}秒`
  return `${seconds}秒`
}

function buildAgents(sessions, groupFilter = null) {
  let agents = config.agents.map(agentConfig => {
    const agentSessions = sessions.filter(s => s.agentId === agentConfig.id)
    const mostRecent = agentSessions.length > 0
      ? agentSessions.reduce((latest, s) => (s.updatedAt || 0) > (latest.updatedAt || 0) ? s : latest, agentSessions[0])
      : null
    const status = getDetailedStatus(mostRecent)
    const workTime = agentWorkTime[agentConfig.id] || 0
    const currentTask = status !== 'idle' ? getCurrentTask(agentConfig.id) : null
    return {
      ...agentConfig,
      status,
      statusText: STATUS_MESSAGES[status] || STATUS_MESSAGES.working,
      workTime: formatWorkTime(workTime),
      workTimeMs: workTime,
      currentTask: currentTask?.text || null,
      currentTaskIcon: currentTask?.icon || null,
      activeSessions: agentSessions.length,
      lastActive: mostRecent?.updatedAt ? new Date(mostRecent.updatedAt).toISOString() : null
    }
  })
  if (groupFilter) agents = agents.filter(a => a.group === groupFilter)
  return agents
}

let broadcastTimeout = null
function broadcastUpdate() {
  if (broadcastTimeout) clearTimeout(broadcastTimeout)
  broadcastTimeout = setTimeout(() => {
    try {
      const sessions = getAllSessions()
      const agents = buildAgents(sessions)
      const message = JSON.stringify({ type: 'update', agents })
      sseClients.forEach(client => { try { client.write(`data: ${message}\n\n`) } catch(e) {} })
    } catch (e) {}
  }, 100)
}

const sseClients = new Set()

app.use(cors())
app.use(express.json())

app.get('/api/agents/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')
  const groupFilter = req.query.group || null
  const sessions = getAllSessions()
  const agents = buildAgents(sessions, groupFilter)
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
  res.write(`data: ${JSON.stringify({ type: 'update', agents })}\n\n`)
  sseClients.add(res)
  const heartbeat = setInterval(() => res.write(`: heartbeat\n\n`), 5000)
  req.on('close', () => { clearInterval(heartbeat); sseClients.delete(res) })
})

const watchPaths = AGENT_IDS.map(id => path.join(SESSIONS_DIR, id, 'sessions', 'sessions.json'))
const watcher = chokidar.watch(watchPaths, { persistent: true, ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 } })
watcher.on('change', () => broadcastUpdate())
watcher.on('add', () => broadcastUpdate())

console.log('Watching for session file changes...')

app.get('/api/config', (req, res) => res.json({ groups: config.groups, agents: config.agents }))

app.post('/api/config/agent/:id/group', (req, res) => {
  const { group } = req.body
  const agentId = req.params.id
  const idx = config.agents.findIndex(a => a.id === agentId)
  if (idx >= 0 && config.groups.find(g => g.id === group)) {
    config.agents[idx].group = group
    saveConfig(config)
    broadcastUpdate()
    res.json({ success: true, agent: config.agents[idx] })
  } else {
    res.status(400).json({ error: 'Invalid agent or group' })
  }
})

app.post('/api/config/agent/:id', (req, res) => {
  const { name, avatar } = req.body
  const agentId = req.params.id
  const idx = config.agents.findIndex(a => a.id === agentId)
  if (idx < 0) return res.status(404).json({ error: 'Agent not found' })
  if (name) config.agents[idx].name = name
  if (avatar) config.agents[idx].avatar = avatar
  saveConfig(config)
  broadcastUpdate()
  res.json({ success: true, agent: config.agents[idx] })
})

app.post('/api/groups', (req, res) => {
  const { name, color } = req.body
  if (!name) return res.status(400).json({ error: 'Name required' })
  const id = name.toLowerCase().replace(/\s+/g, '-')
  config.groups.push({ id, name, color: color || '#6b7280' })
  saveConfig(config)
  res.json({ success: true, group: { id, name, color } })
})

app.delete('/api/groups/:id', (req, res) => {
  const groupId = req.params.id
  const idx = config.groups.findIndex(g => g.id === groupId)
  if (idx < 0) return res.status(404).json({ error: 'Group not found' })
  config.groups.splice(idx, 1)
  config.agents.forEach(a => { if (a.group === groupId) a.group = '' })
  saveConfig(config)
  res.json({ success: true })
})

app.get('/api/agents', (req, res) => {
  const groupFilter = req.query.group || null
  const sessions = getAllSessions()
  res.json({ agents: buildAgents(sessions, groupFilter), groups: config.groups, source: 'openclaw', timestamp: new Date().toISOString() })
})

app.get('/api/groups', (req, res) => res.json({ groups: config.groups }))
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Vite 配置
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'express-middleware',
      configureServer(server) {
        server.middlewares.use(app)
      }
    }
  ],
  server: {
    port: 3000,
    host: true
  }
})
