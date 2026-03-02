import { useState } from 'react'
import { motion } from 'framer-motion'
import './AgentEditPanel.css'

const FACE_EMOJIS = [
  // 人物基础
  '👨','👩','🧑','👦','👧','🧒','👴','👵','🧓',
  // 职业
  '👨‍💻','👩‍💻','🧑‍💻','👨‍🔬','👩‍🔬','🧑‍🔬',
  '👨‍🎨','👩‍🎨','🧑‍🎨','👨‍🏫','👩‍🏫','🧑‍🏫',
  '👨‍🍳','👩‍🍳','🧑‍🍳','👨‍🚀','👩‍🚀','🧑‍🚀',
  '👨‍⚕️','👩‍⚕️','👨‍🔧','👩‍🔧','👨‍🏭','👩‍🏭',
  '👨‍💼','👩‍💼','🧑‍💼','👮','👮‍♂️','👮‍♀️',
  '🕵️','🕵️‍♂️','🕵️‍♀️','💂','💂‍♂️','💂‍♀️',
  // 幻想
  '🧙','🧙‍♂️','🧙‍♀️','🦸','🦸‍♂️','🦸‍♀️',
  '🦹','🦹‍♂️','🦹‍♀️','🧝','🧝‍♂️','🧝‍♀️',
  '🧛','🧟','🧞','🧜','🧚','🫅',
  // 动物
  '🐱','🐶','🐸','🐼','🦊','🐨',
  '🐯','🦁','🐮','🐷','🐻','🐺',
  '🦝','🦔','🐧','🦉','🦅','🐙',
  // 特殊
  '🤖','👾','👻','🎃','🦄','🐲',
  '🥷','🧑‍🎤','👨‍🎤','👩‍🎤','🧑‍🚒','👨‍🚒',
]

interface Group { id: string; name: string }

interface Props {
  agentId: string
  name: string
  avatar: string
  group: string
  groups: Group[]
  onSave: (agentId: string, changes: { name?: string; avatar?: string; group?: string }) => void
  onClose: () => void
  t: { editTitle: string; name: string; group: string; avatar: string; save: string }
}

export default function AgentEditPanel({ agentId, name, avatar, group, groups, onSave, onClose, t }: Props) {
  const [editName, setEditName] = useState(name)
  const [editAvatar, setEditAvatar] = useState(avatar)
  const [editGroup, setEditGroup] = useState(group)

  const handleSave = () => {
    onSave(agentId, { name: editName, avatar: editAvatar, group: editGroup })
    onClose()
  }

  return (
    <motion.div className="edit-panel-overlay" onClick={onClose}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="edit-panel" onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        transition={{ duration: 0.18 }}>

        <div className="edit-panel-header">
          <span className="edit-panel-title">{t.editTitle}</span>
          <button className="edit-panel-close" onClick={onClose}>✕</button>
        </div>

        {/* 头像预览 */}
        <div className="edit-avatar-preview">{editAvatar}</div>

        {/* 姓名 */}
        <label className="edit-label">{t.name}</label>
        <input className="edit-input" value={editName}
          onChange={e => setEditName(e.target.value)} maxLength={20} />

        {/* 组 */}
        <label className="edit-label">{t.group}</label>
        <div className="edit-group-btns">
          {groups.map(g => (
            <button key={g.id}
              className={`edit-group-opt ${editGroup === g.id ? 'active' : ''}`}
              onClick={() => setEditGroup(g.id)}>{g.name}</button>
          ))}
        </div>

        {/* 头像选择 */}
        <label className="edit-label">{t.avatar}</label>
        <div className="edit-avatar-grid">
          {FACE_EMOJIS.map(e => (
            <button key={e}
              className={`edit-avatar-opt ${editAvatar === e ? 'active' : ''}`}
              onClick={() => setEditAvatar(e)}>{e}</button>
          ))}
        </div>

        <button className="edit-save-btn" onClick={handleSave}>{t.save}</button>
      </motion.div>
    </motion.div>
  )
}
