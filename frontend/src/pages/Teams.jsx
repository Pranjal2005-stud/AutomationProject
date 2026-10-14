import { useEffect, useState } from 'react'
import { Users, Plus, Trash2, UserPlus, Edit2, X, Check } from 'lucide-react'
import { getTeams, createTeam, updateTeam, deleteTeam, addTeamMember, removeTeamMember } from '../api/services'
import Badge from '../components/Badge'
import Toast, { useToast } from '../components/Toast'

const LABEL = { fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block' }
const ERR = { fontSize: '0.6875rem', color: 'var(--error)', marginTop: 4, fontWeight: 500 }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div className="nm-card" style={{ maxWidth: 380, width: '90%', padding: 24 }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: 20, lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="nm-btn-ghost" style={{ padding: '7px 16px' }} onClick={onCancel}>Cancel</button>
          <button className="nm-btn" style={{ padding: '7px 16px', background: 'var(--error)' }} onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  )
}

function MemberTag({ member, onRemove }) {
  const initials = member.email.slice(0, 2).toUpperCase()
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface-inset)', border: '1px solid var(--border)', borderRadius: 20, padding: '3px 10px 3px 6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
      <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--primary-dim)', border: '1px solid rgba(253,99,15,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5625rem', fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>{initials}</span>
      {member.email}
      {onRemove && (
        <button onClick={() => onRemove(member.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex', lineHeight: 1 }} aria-label={`Remove ${member.email}`}>
          <X size={11} />
        </button>
      )}
    </div>
  )
}

export default function Teams() {
  const [teams, setTeams] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [newMemberEmail, setNewMemberEmail] = useState({})
  const [newMemberError, setNewMemberError] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [createForm, setCreateForm] = useState({ name: '', description: '', members: '' })
  const [createErrors, setCreateErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { toasts, toast, dismiss } = useToast()

  const load = () => getTeams().then(r => setTeams(r.data)).catch(() => toast('Failed to load teams', 'error'))
  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!createForm.name.trim()) errs.name = 'Team name is required'
    const emails = createForm.members.split(',').map(s => s.trim()).filter(Boolean)
    const invalid = emails.filter(em => !EMAIL_RE.test(em))
    if (invalid.length) errs.members = `Invalid email(s): ${invalid.join(', ')}`
    const dupes = emails.filter((em, i) => emails.indexOf(em) !== i)
    if (dupes.length) errs.members = `Duplicate email(s): ${dupes.join(', ')}`
    if (Object.keys(errs).length) { setCreateErrors(errs); return }
    setCreateErrors({})
    setLoading(true)
    try {
      await createTeam({ name: createForm.name.trim(), description: createForm.description.trim() || null, members: emails.map(email => ({ email })) })
      toast('Team created', 'success')
      setCreateForm({ name: '', description: '', members: '' })
      setShowCreate(false)
      load()
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to create team', 'error')
    } finally { setLoading(false) }
  }

  const handleEditSave = async (team) => {
    if (!editName.trim()) return
    try {
      await updateTeam(team.id, { name: editName.trim(), description: editDesc.trim() || null })
      toast('Team updated', 'success')
      setEditingId(null)
      load()
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to update team', 'error')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteTeam(id)
      toast('Team deleted', 'success')
      setConfirmDelete(null)
      load()
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to delete team', 'error')
    }
  }

  const handleAddMember = async (teamId) => {
    const email = (newMemberEmail[teamId] || '').trim()
    if (!EMAIL_RE.test(email)) {
      setNewMemberError(p => ({ ...p, [teamId]: 'Invalid email' }))
      return
    }
    setNewMemberError(p => ({ ...p, [teamId]: '' }))
    try {
      await addTeamMember(teamId, { email })
      setNewMemberEmail(p => ({ ...p, [teamId]: '' }))
      toast('Member added', 'success')
      load()
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to add member', 'error')
    }
  }

  const handleRemoveMember = async (teamId, memberId) => {
    try {
      await removeTeamMember(teamId, memberId)
      toast('Member removed', 'success')
      load()
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to remove member', 'error')
    }
  }

  return (
    <div className="nm-page">
      <div className="nm-page-header">
        <div>
          <h1 className="nm-page-title">Teams</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>Manage teams and their members</p>
        </div>
        <button className="nm-btn" onClick={() => setShowCreate(v => !v)} aria-label="Create team">
          <Plus size={13} /> New Team
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="nm-card" style={{ marginBottom: 24, maxWidth: 560 }}>
          <div className="nm-card-header">
            <span className="nm-card-title">Create Team</span>
            <button className="nm-btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setShowCreate(false)}><X size={13} /></button>
          </div>
          <div className="nm-card-body">
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={LABEL}>Team Name</label>
                <input className="nm-input" style={createErrors.name ? { borderColor: 'var(--error)' } : {}} placeholder="e.g. Project Hanna" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
                {createErrors.name && <p style={ERR}>{createErrors.name}</p>}
              </div>
              <div>
                <label style={LABEL}>Description (optional)</label>
                <input className="nm-input" placeholder="Short description" value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label style={LABEL}>Member Emails (comma-separated)</label>
                <input className="nm-input" style={createErrors.members ? { borderColor: 'var(--error)' } : {}} placeholder="alice@example.com, bob@example.com" value={createForm.members} onChange={e => setCreateForm(f => ({ ...f, members: e.target.value }))} />
                {createErrors.members && <p style={ERR}>{createErrors.members}</p>}
              </div>
              <button type="submit" className="nm-btn" disabled={loading}>{loading ? 'Creating…' : 'Create Team'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Teams list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {teams.length === 0 && (
          <div className="nm-card" style={{ padding: 40, textAlign: 'center' }}>
            <Users size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No teams yet. Create your first team.</p>
          </div>
        )}
        {teams.map(team => (
          <div key={team.id} className="nm-card">
            <div className="nm-card-header">
              {editingId === team.id ? (
                <div style={{ display: 'flex', gap: 8, flex: 1, alignItems: 'center' }}>
                  <input className="nm-input" style={{ maxWidth: 200 }} value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
                  <input className="nm-input" style={{ maxWidth: 260 }} placeholder="Description" value={editDesc} onChange={e => setEditDesc(e.target.value)} />
                  <button className="nm-btn-sm primary" onClick={() => handleEditSave(team)}><Check size={12} /></button>
                  <button className="nm-btn-sm" onClick={() => setEditingId(null)}><X size={12} /></button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <span className="nm-card-title">{team.name}</span>
                  {team.description && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{team.description}</span>}
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', padding: '2px 8px', background: 'var(--surface-inset)', borderRadius: 10, border: '1px solid var(--border)' }}>{team.members?.length || 0} members</span>
                  </span>
                </div>
              )}
              {editingId !== team.id && (
                <div style={{ display: 'flex', gap: 6, marginLeft: 12 }}>
                  <button className="nm-btn-sm" onClick={() => { setEditingId(team.id); setEditName(team.name); setEditDesc(team.description || '') }} aria-label="Edit team"><Edit2 size={12} /></button>
                  <button className="nm-btn-sm" style={{ color: 'var(--error)', borderColor: 'rgba(224,82,82,0.3)' }} onClick={() => setConfirmDelete(team.id)} aria-label="Delete team"><Trash2 size={12} /></button>
                </div>
              )}
            </div>
            <div className="nm-card-body" style={{ paddingTop: 14 }}>
              {/* Members */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {team.members?.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No members yet</span>}
                {team.members?.map(m => (
                  <MemberTag key={m.id} member={m} onRemove={(mid) => handleRemoveMember(team.id, mid)} />
                ))}
              </div>
              {/* Add member */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <input
                    className="nm-input"
                    style={{ ...(newMemberError[team.id] ? { borderColor: 'var(--error)' } : {}), fontSize: '0.75rem', padding: '7px 11px' }}
                    placeholder="Add member email"
                    value={newMemberEmail[team.id] || ''}
                    onChange={e => { setNewMemberEmail(p => ({ ...p, [team.id]: e.target.value })); setNewMemberError(p => ({ ...p, [team.id]: '' })) }}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddMember(team.id))}
                    aria-label="New member email"
                  />
                  {newMemberError[team.id] && <p style={ERR}>{newMemberError[team.id]}</p>}
                </div>
                <button className="nm-btn-sm primary" style={{ marginTop: 1 }} onClick={() => handleAddMember(team.id)} aria-label="Add member">
                  <UserPlus size={12} /> Add
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          message="Delete this team? All members will be removed. This cannot be undone."
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <Toast toasts={toasts} dismiss={dismiss} />
    </div>
  )
}
