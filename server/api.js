import os from 'os';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.use(cors());
app.use(express.json());

const CONFIG_FILE = path.join(__dirname, 'config.json');
const SESSIONS_DIR =
  process.env.OPENCLAW_SESSIONS_DIR || path.join(os.homedir(), '.openclaw', 'agents');
const IDLE_THRESHOLD = 15000;
const DEFAULT_AGENT_AVATAR = '👨';
const DEFAULT_AGENT_COLOR = '#4fc3f7';

function getDefaultConfig() {
  return {
    groups: [],
    agents: [],
  };
}

function createDefaultAgent(agentId) {
  return {
    id: agentId,
    name: agentId,
    avatar: DEFAULT_AGENT_AVATAR,
    color: DEFAULT_AGENT_COLOR,
    group: '',
  };
}

function normalizeConfig(input) {
  const groups = Array.isArray(input?.groups)
    ? input.groups
        .filter(group => group && typeof group.id === 'string' && typeof group.name === 'string')
        .map(group => ({ id: group.id, name: group.name }))
    : [];

  const validGroupIds = new Set(groups.map(group => group.id));

  const agents = Array.isArray(input?.agents)
    ? input.agents
        .filter(agent => agent && typeof agent.id === 'string')
        .map(agent => ({
          id: agent.id,
          name: typeof agent.name === 'string' ? agent.name : agent.id,
          avatar: typeof agent.avatar === 'string' ? agent.avatar : DEFAULT_AGENT_AVATAR,
          color: typeof agent.color === 'string' ? agent.color : DEFAULT_AGENT_COLOR,
          group:
            typeof agent.group === 'string' && validGroupIds.has(agent.group) ? agent.group : '',
        }))
    : [];

  return { groups, agents };
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      return normalizeConfig(parsed);
    }
  } catch {}
  return getDefaultConfig();
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

let config = loadConfig();

const agentWorkTime = {};
const agentLastStatus = {};

function ensureAgentTracking(agentId) {
  if (typeof agentWorkTime[agentId] !== 'number') {
    agentWorkTime[agentId] = 0;
  }
  if (!agentLastStatus[agentId]) {
    agentLastStatus[agentId] = 'idle';
  }
}

function listDiscoveredAgentIds() {
  try {
    if (!fs.existsSync(SESSIONS_DIR)) return [];

    const entries = fs.readdirSync(SESSIONS_DIR, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .filter(agentId => {
        const sessionsDir = path.join(SESSIONS_DIR, agentId, 'sessions');
        try {
          return fs.existsSync(sessionsDir) && fs.statSync(sessionsDir).isDirectory();
        } catch {
          return false;
        }
      })
      .sort();
  } catch {
    return [];
  }
}

function syncDiscoveredAgents() {
  const discoveredAgentIds = listDiscoveredAgentIds();
  const knownAgentIds = new Set(config.agents.map(agent => agent.id));
  let changed = false;

  for (const agentId of discoveredAgentIds) {
    if (!knownAgentIds.has(agentId)) {
      config.agents.push(createDefaultAgent(agentId));
      ensureAgentTracking(agentId);
      changed = true;
    }
  }

  if (changed) {
    saveConfig(config);
  }

  return discoveredAgentIds;
}

function getTrackedAgents() {
  const discoveredAgentIds = syncDiscoveredAgents();
  if (discoveredAgentIds.length === 0) return [];

  const configById = new Map(config.agents.map(agent => [agent.id, agent]));
  return discoveredAgentIds.map(agentId => configById.get(agentId) || createDefaultAgent(agentId));
}

function ensureAgentConfig(agentId) {
  const existingIndex = config.agents.findIndex(agent => agent.id === agentId);
  if (existingIndex >= 0) return existingIndex;

  const trackedAgents = getTrackedAgents();
  if (!trackedAgents.some(agent => agent.id === agentId)) {
    return -1;
  }

  config.agents.push(createDefaultAgent(agentId));
  saveConfig(config);
  return config.agents.length - 1;
}

for (const agent of getTrackedAgents()) {
  ensureAgentTracking(agent.id);
}

const STATUS_MESSAGES = {
  researching: 'Researching',
  coding: 'Coding',
  testing: 'Testing',
  debugging: 'Debugging',
  reporting: 'Reporting',
  thinking: 'Thinking',
  working: 'Working',
  idle: 'Idle',
};

const TOOL_STATUS_MAP = {
  exec: {
    icon: '⚡',
    text: 'Executing command',
    template: args => `Exec: ${args.command?.substring(0, 30) || '...'}`,
  },
  read: {
    icon: '📖',
    text: 'Reading file',
    template: args => `Read: ${args.file_path || args.path || 'file'}`,
  },
  write: {
    icon: '✍️',
    text: 'Writing file',
    template: args => `Write: ${args.file_path || args.path || 'file'}`,
  },
  edit: {
    icon: '✏️',
    text: 'Editing file',
    template: args => `Edit: ${args.file_path || args.path || 'file'}`,
  },
  web_fetch: {
    icon: '🌐',
    text: 'Fetching webpage',
    template: args => `Fetch: ${args.url?.substring(0, 30) || 'page'}...`,
  },
  web_search: {
    icon: '🔍',
    text: 'Searching',
    template: args => `Search: ${args.query?.substring(0, 25) || '...'}`,
  },
  Browser: { icon: '🌍', text: 'Browsing', template: () => 'Browsing...' },
  message: { icon: '💬', text: 'Sending message', template: () => 'Sending...' },
  sessions_spawn: {
    icon: '🚀',
    text: 'Spawning subtask',
    template: args => `Task: ${args.task?.substring(0, 25) || 'agent'}...`,
  },
  memory_search: { icon: '🧠', text: 'Searching memory', template: () => 'Memory search...' },
  memory_store: { icon: '💾', text: 'Storing memory', template: () => 'Memory store...' },
  feishu_doc: {
    icon: '📝',
    text: 'Operating Feishu doc',
    template: args => `Feishu: ${args.action || 'doc'}`,
  },
  feishu_bitable: {
    icon: '📊',
    text: 'Operating Feishu sheet',
    template: () => 'Feishu sheet...',
  },
  github: {
    icon: '🐙',
    text: 'Operating GitHub',
    template: args => `GitHub: ${args.action || 'op'}`,
  },
  default: { icon: '⚙️', text: 'Working', template: () => 'Working...' },
};

function getToolStatus(sessionFile) {
  if (!sessionFile || !fs.existsSync(sessionFile)) return null;
  try {
    const content = fs.readFileSync(sessionFile, 'utf-8');
    const lines = content
      .trim()
      .split('\n')
      .filter(line => line.trim());

    for (let i = lines.length - 1; i >= 0; i -= 1) {
      try {
        const entry = JSON.parse(lines[i]);
        const msg = entry.message;

        if (msg?.role === 'assistant' && Array.isArray(msg.content)) {
          for (const contentPart of msg.content) {
            if (contentPart.type === 'toolCall' && contentPart.name) {
              const mapping = TOOL_STATUS_MAP[contentPart.name] || TOOL_STATUS_MAP.default;
              return {
                text: mapping.template(contentPart.arguments || {}),
                icon: mapping.icon,
              };
            }
          }
        }

        if (msg?.role === 'toolResult' && msg.toolName) {
          const mapping = TOOL_STATUS_MAP[msg.toolName] || TOOL_STATUS_MAP.default;
          return { text: `Done: ${mapping.text}`, icon: mapping.icon };
        }
      } catch {}
    }
  } catch {}
  return null;
}

function getCurrentTask(agentId) {
  try {
    const sessionsFile = path.join(SESSIONS_DIR, agentId, 'sessions', 'sessions.json');
    if (!fs.existsSync(sessionsFile)) return null;

    const data = JSON.parse(fs.readFileSync(sessionsFile, 'utf-8'));
    let latestSession = null;
    let latestTime = 0;

    Object.values(data).forEach(session => {
      if (session.sessionFile && session.updatedAt && session.updatedAt > latestTime) {
        latestTime = session.updatedAt;
        latestSession = session;
      }
    });

    if (latestSession?.sessionFile) {
      const toolStatus = getToolStatus(latestSession.sessionFile);
      if (toolStatus) return toolStatus;
    }

    if (latestSession?.sessionFile && fs.existsSync(latestSession.sessionFile)) {
      const jsonlContent = fs.readFileSync(latestSession.sessionFile, 'utf-8');
      const lines = jsonlContent
        .trim()
        .split('\n')
        .filter(line => line.trim());

      for (let i = lines.length - 1; i >= 0; i -= 1) {
        try {
          const entry = JSON.parse(lines[i]);
          if (entry.type === 'message' && entry.message?.role === 'user') {
            const text = Array.isArray(entry.message.content)
              ? entry.message.content
                  .map(contentPart => contentPart.text || '')
                  .join('')
                  .trim()
              : '';
            if (text) {
              return {
                text: text.length > 50 ? `${text.substring(0, 50)}...` : text,
                icon: '💬',
              };
            }
          }
        } catch {}
      }
    }
  } catch {}
  return null;
}

function getDetailedStatus(session) {
  if (!session) return 'idle';
  const age = Date.now() - (session.updatedAt || 0);
  if (age > IDLE_THRESHOLD) return 'idle';

  const key = session.key || '';
  if (key.includes('research') || key.includes('search')) return 'researching';
  if (key.includes('code') || key.includes('write')) return 'coding';
  if (key.includes('test')) return 'testing';
  if (key.includes('debug')) return 'debugging';
  if (key.includes('report')) return 'reporting';
  if ((session.inputTokens || 0) > 1000) return 'thinking';
  return 'working';
}

function getAllSessions(trackedAgents = getTrackedAgents()) {
  const allSessions = [];
  for (const agent of trackedAgents) {
    const sessionsFile = path.join(SESSIONS_DIR, agent.id, 'sessions', 'sessions.json');
    try {
      if (!fs.existsSync(sessionsFile)) continue;
      const content = fs.readFileSync(sessionsFile, 'utf-8');
      if (!content.trim()) continue;

      const data = JSON.parse(content);
      if (typeof data === 'object' && !Array.isArray(data)) {
        Object.values(data).forEach(session => {
          if (session && session.updatedAt) {
            allSessions.push({ ...session, agentId: agent.id });
          }
        });
      }
    } catch {}
  }
  return allSessions;
}

function formatWorkTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m${seconds % 60}s`;
  return `${seconds}s`;
}

function buildAgents(sessions, groupFilter = null, trackedAgents = getTrackedAgents()) {
  let agents = trackedAgents.map(agentConfig => {
    ensureAgentTracking(agentConfig.id);
    const agentSessions = sessions.filter(session => session.agentId === agentConfig.id);
    const mostRecent =
      agentSessions.length > 0
        ? agentSessions.reduce(
            (latest, session) =>
              (session.updatedAt || 0) > (latest.updatedAt || 0) ? session : latest,
            agentSessions[0]
          )
        : null;

    const status = getDetailedStatus(mostRecent);
    const workTime = agentWorkTime[agentConfig.id] || 0;
    const currentTask = status !== 'idle' ? getCurrentTask(agentConfig.id) : null;

    return {
      ...agentConfig,
      status,
      statusText: STATUS_MESSAGES[status] || STATUS_MESSAGES.working,
      workTime: formatWorkTime(workTime),
      workTimeMs: workTime,
      currentTask: currentTask?.text || null,
      currentTaskIcon: currentTask?.icon || null,
      activeSessions: agentSessions.length,
      lastActive: mostRecent?.updatedAt ? new Date(mostRecent.updatedAt).toISOString() : null,
    };
  });

  if (groupFilter) {
    agents = agents.filter(agent => agent.group === groupFilter);
  }
  return agents;
}

setInterval(() => {
  const trackedAgents = getTrackedAgents();
  const sessions = getAllSessions(trackedAgents);
  trackedAgents.forEach(agentConfig => {
    ensureAgentTracking(agentConfig.id);
    const agentSessions = sessions.filter(session => session.agentId === agentConfig.id);
    const mostRecent =
      agentSessions.length > 0
        ? agentSessions.reduce(
            (latest, session) =>
              (session.updatedAt || 0) > (latest.updatedAt || 0) ? session : latest,
            agentSessions[0]
          )
        : null;
    const status = getDetailedStatus(mostRecent);
    if (status !== 'idle') {
      agentWorkTime[agentConfig.id] = (agentWorkTime[agentConfig.id] || 0) + 1000;
    }
    agentLastStatus[agentConfig.id] = status;
  });
  if (sseClients.size > 0) {
    broadcastUpdate();
  }
}, 1000);

const sseClients = new Set();
let broadcastTimeout = null;

function broadcastUpdate() {
  if (broadcastTimeout) clearTimeout(broadcastTimeout);
  broadcastTimeout = setTimeout(() => {
    try {
      const trackedAgents = getTrackedAgents();
      const sessions = getAllSessions(trackedAgents);
      const agents = buildAgents(sessions, null, trackedAgents);
      const message = JSON.stringify({ type: 'update', agents });
      sseClients.forEach(client => {
        try {
          client.write(`data: ${message}\n\n`);
        } catch {}
      });
    } catch {}
  }, 100);
}

app.get('/api/agents/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const groupFilter = req.query.group || null;
  const trackedAgents = getTrackedAgents();
  const sessions = getAllSessions(trackedAgents);
  const agents = buildAgents(sessions, groupFilter, trackedAgents);

  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
  res.write(`data: ${JSON.stringify({ type: 'update', agents })}\n\n`);

  sseClients.add(res);
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 5000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

app.get('/api/config', (req, res) => {
  res.json({ groups: config.groups, agents: getTrackedAgents() });
});

app.post('/api/config/agent/:id/group', (req, res) => {
  const { group } = req.body;
  const agentId = req.params.id;
  const idx = ensureAgentConfig(agentId);
  if (idx >= 0 && config.groups.find(item => item.id === group)) {
    config.agents[idx].group = group;
    saveConfig(config);
    broadcastUpdate();
    res.json({ success: true, agent: config.agents[idx] });
  } else {
    res.status(400).json({ error: 'Invalid agent or group' });
  }
});

app.post('/api/config/agent/:id', (req, res) => {
  const { name, avatar } = req.body;
  const agentId = req.params.id;
  const idx = ensureAgentConfig(agentId);
  if (idx < 0) {
    res.status(404).json({ error: 'Agent not found' });
    return;
  }
  if (name) config.agents[idx].name = name;
  if (avatar) config.agents[idx].avatar = avatar;
  saveConfig(config);
  broadcastUpdate();
  res.json({ success: true, agent: config.agents[idx] });
});

app.post('/api/groups', (req, res) => {
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Name required' });
    return;
  }
  const id = name.toLowerCase().replace(/\s+/g, '-');
  if (config.groups.some(group => group.id === id)) {
    res.status(400).json({ error: 'Group already exists' });
    return;
  }
  config.groups.push({ id, name });
  saveConfig(config);
  res.json({ success: true, group: { id, name } });
});

app.delete('/api/groups/:id', (req, res) => {
  const groupId = req.params.id;
  const idx = config.groups.findIndex(group => group.id === groupId);
  if (idx < 0) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  config.groups.splice(idx, 1);
  config.agents.forEach(agent => {
    if (agent.group === groupId) agent.group = '';
  });
  saveConfig(config);
  broadcastUpdate();
  res.json({ success: true });
});

app.get('/api/agents', (req, res) => {
  const groupFilter = req.query.group || null;
  const trackedAgents = getTrackedAgents();
  const sessions = getAllSessions(trackedAgents);
  res.json({
    agents: buildAgents(sessions, groupFilter, trackedAgents),
    groups: config.groups,
    source: 'openclaw',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/groups', (req, res) => {
  res.json({ groups: config.groups });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function mountFrontend() {
  if (isProduction) {
    app.use(express.static(path.join(rootDir, 'dist')));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      res.sendFile(path.join(rootDir, 'dist', 'index.html'));
    });
    return;
  }

  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    root: rootDir,
    appType: 'spa',
    server: {
      middlewareMode: true,
      host: true,
    },
  });
  app.use(vite.middlewares);
}

async function start() {
  console.log('Live updates enabled (polling mode).');

  await mountFrontend();

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `Claws Office running on http://localhost:${PORT} (${isProduction ? 'production' : 'development'})`
    );
  });

  const shutdown = async () => {
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
