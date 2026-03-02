export type Lang = 'zh' | 'en'

export interface StatusConfig {
  label: string
  color: string
  icon: string
}

export interface Translations {
  // Header
  title: string
  live: string
  offline: string
  langSwitch: string
  
  // Toolbar
  all: string
  active: string
  total: string
  agents: string
  workTime: string
  groups: string
  addGroup: string
  editGroup: string
  deleteGroup: string
  
  // Status
  statusMap: {
    idle: string
    thinking: string
    working: string
    waiting: string
    researching: string
    coding: string
    testing: string
    debugging: string
    reporting: string
  }
  
  // Edit panel
  editTitle: string
  name: string
  group: string
  avatar: string
  save: string
  
  // Bulletin
  bulletin: string
  
  // Confirm dialog
  confirmDelete: string
  confirmDeleteMsg: string
  cancel: string
  delete: string

  // Time
  hourUnit: string
  minuteUnit: string
  secondUnit: string
  
  // StatusBar
  connected: string
  disconnected: string
  
  // AgentCard
  currentTask: string
  nextStep: string
  waitingForTasks: string
  
  // StatusHUD
  taskBoard: string
  teamLevel: string
  exp: string
}

export const en: Translations = {
  // Header
  title: '🏢 CLAWS OFFICE',
  live: 'Live',
  offline: 'Offline',
  langSwitch: '中文',
  
  // Toolbar
  all: 'All',
  active: 'Active',
  total: 'Total',
  agents: 'Agents',
  workTime: 'Work Time',
  groups: 'Groups',
  addGroup: 'Add Group',
  editGroup: 'Edit',
  deleteGroup: 'Delete',
  
  // Status
  statusMap: {
    idle: 'Idle',
    thinking: 'Thinking',
    working: 'Working',
    waiting: 'Waiting',
    researching: 'Researching',
    coding: 'Coding',
    testing: 'Testing',
    debugging: 'Debugging',
    reporting: 'Reporting'
  },
  
  // Edit panel
  editTitle: 'Edit Agent',
  name: 'Name',
  group: 'Group',
  avatar: 'Avatar',
  save: 'Save',
  
  // Bulletin
  bulletin: '📋 Board',
  
  // Confirm dialog
  confirmDelete: 'Confirm Delete',
  confirmDeleteMsg: 'Delete this group?',
  cancel: 'Cancel',
  delete: 'Delete',

  // Time
  hourUnit: 'h',
  minuteUnit: 'm',
  secondUnit: 's',
  
  // StatusBar
  connected: 'Connected',
  disconnected: 'Disconnected',
  
  // AgentCard
  currentTask: 'Current Task',
  nextStep: 'Next Step',
  waitingForTasks: 'Waiting for tasks...',
  
  // StatusHUD
  taskBoard: '📋 Task Board',
  teamLevel: 'Team Level',
  exp: 'Exp'
}

export const zh: Translations = {
  // Header
  title: '🏢 CLAWS OFFICE',
  live: '实时',
  offline: '离线',
  langSwitch: 'EN',
  
  // Toolbar
  all: '全部',
  active: '活跃',
  total: '总计',
  agents: '智能体',
  workTime: '工作时间',
  groups: '分组',
  addGroup: '添加分组',
  editGroup: '编辑',
  deleteGroup: '删除',
  
  // Status
  statusMap: {
    idle: '空闲',
    thinking: '思考中',
    working: '工作中',
    waiting: '等待中',
    researching: '研究中',
    coding: '编码中',
    testing: '测试中',
    debugging: '调试中',
    reporting: '报告中'
  },
  
  // Edit panel
  editTitle: '编辑智能体',
  name: '名称',
  group: '分组',
  avatar: '头像',
  save: '保存',
  
  // Bulletin
  bulletin: '📋 公告板',
  
  // Confirm dialog
  confirmDelete: '确认删除',
  confirmDeleteMsg: '确定要删除该分组吗？',
  cancel: '取消',
  delete: '删除',

  // Time
  hourUnit: '时',
  minuteUnit: '分',
  secondUnit: '秒',
  
  // StatusBar
  connected: '已连接',
  disconnected: '已断开',
  
  // AgentCard
  currentTask: '当前任务',
  nextStep: '下一步',
  waitingForTasks: '等待任务中...',
  
  // StatusHUD
  taskBoard: '📋 任务板',
  teamLevel: '团队等级',
  exp: '经验'
}

export const getTranslations = (lang: Lang): Translations => {
  return lang === 'zh' ? zh : en
}

// Status config - can be extended with translations if needed
export const statusConfig: Record<string, StatusConfig> = {
  idle: { label: 'Idle', color: '#94a3b8', icon: '💤' },
  thinking: { label: 'Thinking', color: '#00f5ff', icon: '🤔' },
  working: { label: 'Working', color: '#22c55e', icon: '⚡' },
  waiting: { label: 'Waiting', color: '#eab308', icon: '⏳' },
  researching: { label: 'Researching', color: '#06b6d4', icon: '🔍' },
  coding: { label: 'Coding', color: '#a855f7', icon: '💻' },
  testing: { label: 'Testing', color: '#f97316', icon: '🧪' },
  debugging: { label: 'Debugging', color: '#ef4444', icon: '🔧' },
  reporting: { label: 'Reporting', color: '#ec4899', icon: '📋' }
}
