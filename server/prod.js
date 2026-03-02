import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// 静态文件服务
app.use(express.static(path.join(__dirname, '..', 'dist')))

// Config
const CONFIG_FILE = path.join(__dirname, 'config.json')

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

app.get('/api/config', (req, res) => res.json({ groups: config.groups, agents: config.agents }))

app.post('/api/config/agent/:id/group', (req, res) => {
  const { group } = req.body
  const agentId = req.params.id
  const idx = config.agents.findIndex(a => a.id === agentId)
  if (idx >= 0 && config.groups.find(g => g.id === group)) {
    config.agents[idx].group = group
    saveConfig(config)
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

app.get('/api/groups', (req, res) => res.json({ groups: config.groups }))
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Claws Office running on http://localhost:${PORT}`)
})
