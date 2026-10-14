import { useEffect, useState } from 'react'
import { CalendarPlus, Video, X, Calendar, Clock, Users, MoreVertical } from 'lucide-react'
import { getMeetings, scheduleMeeting, getTeams, cancelMeeting, getUpcomingMeetings } from '../api/services'
import Badge from '../components/Badge'
import Toast, { useToast } from '../components/Toast'

const ERR = { fontSize: '0.6875rem', color: 'var(--error)', marginTop: 5, fontWeight: 500 }
const LABEL = { fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block' }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function parseTeamNames(json) {
  if (!json) return null
  try { const a = JSON.parse(json); return Array.isArray(a) ? a.join(', ') : json } catch { return json }
}

// ─── Avatar ──────────────────────────────────────────────────────────────────
function Avatar({ email }) {
  const initials = email ? email.slice(0, 2).toUpperCase() : '??'
  const hue = email ? (email.charCodeAt(0) * 37 + (email.charCodeAt(1) || 0) * 17) % 360 : 0
  return (
    <span style={{
      width: 22, height: 22, borderRadius: '50%',
      background: `hsl(${hue},45%,32%)`,
      border: '2px solid rgba(255,255,255,0.1)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.5rem', fontWeight: 700, color: '#fff',
      flexShrink: 0, marginLeft: -5,
    }}>
      {initials}
    </span>
  )
}

// ─── Time formatter ───────────────────────────────────────────────────────────
function formatTime(date, time) {
  if (!date || !time) return '—'
  try {
    const dt = new Date(`${date}T${time}:00Z`)
    const todayStr = new Date().toISOString().slice(0, 10)
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const dayLabel = date === todayStr ? 'Today' : date === tomorrowStr ? 'Tomorrow'
      : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    const timeLabel = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' })
    return `${dayLabel} · ${timeLabel}`
  } catch { return `${date} ${time}` }
}

// ─── Upcoming KPI Card ────────────────────────────────────────────────────────
function UpcomingKPI({ upcoming, loadingUpcoming, onCancelUpcoming }) {
  const [menuOpen, setMenuOpen] = useState(null)
  const [confirming, setConfirming] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  const handleCancel = async (id) => {
    setCancelling(true)
    try {
      await cancelMeeting(id)
      onCancelUpcoming(id)
    } catch (err) {
      console.error('Cancel failed', err)
    } finally {
      setCancelling(false)
      setConfirming(null)
    }
  }

  return (
    <div style={{
      background: 'rgba(43,53,67,0.55)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: 18,
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '-4px -4px 12px rgba(255,255,255,0.04), 6px 6px 20px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: 28,
      maxHeight: 'calc(100vh - 80px)',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 18px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(255,255,255,0.03)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(67,171,146,0.15)', border: '1px solid rgba(67,171,146,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={13} style={{ color: 'var(--success)' }} />
          </div>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Upcoming Meetings</span>
        </div>
        {/* KPI number */}
        <div style={{ textAlign: 'center', padding: '10px 0 4px' }}>
          <div style={{
            fontSize: '2.75rem', fontWeight: 800, lineHeight: 1,
            color: 'var(--text-primary)', letterSpacing: '-0.04em',
            background: 'linear-gradient(135deg, #F5F7FA 0%, #AAB4C2 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            {loadingUpcoming ? '—' : upcoming.length}
          </div>
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            meetings scheduled
          </p>
        </div>
      </div>

      {/* Meeting list */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loadingUpcoming && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Loading…</div>
        )}
        {!loadingUpcoming && upcoming.length === 0 && (
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <Calendar size={24} style={{ color: 'var(--text-muted)', margin: '0 auto 8px', display: 'block' }} />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No upcoming meetings</p>
          </div>
        )}
        {!loadingUpcoming && upcoming.map(m => {
          const teamLabel = parseTeamNames(m.team_names)
          const attendees = m.attendees || []
          return (
            <div key={m.id} style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                    {m.title}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.625rem', color: 'var(--text-muted)', marginBottom: 2 }}>
                    <Clock size={9} />
                    <span>{formatTime(m.meeting_date, m.meeting_time)}</span>
                  </div>
                  {teamLabel && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.625rem', color: 'var(--primary)', marginBottom: 4 }}>
                      <Users size={9} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teamLabel}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ display: 'flex', paddingLeft: 5 }}>
                      {attendees.slice(0, 4).map((a, i) => <Avatar key={i} email={a.email} />)}
                    </div>
                    {attendees.length > 0 && (
                      <span style={{ fontSize: '0.5625rem', color: 'var(--text-muted)' }}>
                        {attendees.length} participant{attendees.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                {/* three-dot menu */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <button
                    onClick={() => setMenuOpen(v => v === m.id ? null : m.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 3px', borderRadius: 5, display: 'flex' }}
                    aria-label="Options"
                  >
                    <MoreVertical size={12} />
                  </button>
                  {menuOpen === m.id && (
                    <>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setMenuOpen(null)} />
                      <div style={{ position: 'absolute', right: 0, top: 20, zIndex: 20, background: 'var(--surface-2)', border: '1px solid var(--border-strong)', borderRadius: 10, boxShadow: 'var(--nm-raised-hover)', minWidth: 140, overflow: 'hidden' }}>
                        {m.meet_link && (
                          <a href={m.meet_link} target="_blank" rel="noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', fontSize: '0.6875rem', color: 'var(--success)', textDecoration: 'none' }}
                            onClick={() => setMenuOpen(null)}
                          >
                            <Video size={11} /> Join Meeting
                          </a>
                        )}
                        {m.calendar_link && (
                          <a href={m.calendar_link} target="_blank" rel="noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', fontSize: '0.6875rem', color: 'var(--text-secondary)', textDecoration: 'none' }}
                            onClick={() => setMenuOpen(null)}
                          >
                            <Calendar size={11} /> View in Calendar
                          </a>
                        )}
                        <button
                          onClick={() => { setMenuOpen(null); setConfirming(m.id) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', fontSize: '0.6875rem', color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}
                        >
                          <X size={11} /> Cancel Meeting
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              {/* Join button */}
              {m.meet_link && (
                <a href={m.meet_link} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, padding: '4px 10px', borderRadius: 6, background: 'rgba(67,171,146,0.12)', border: '1px solid rgba(67,171,146,0.25)', color: 'var(--success)', fontSize: '0.625rem', fontWeight: 500, textDecoration: 'none' }}
                >
                  <Video size={9} /> Join
                </a>
              )}
            </div>
          )
        })}
      </div>

      {/* Cancel confirm dialog */}
      {confirming && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="nm-card" style={{ maxWidth: 360, width: '90%', padding: 24 }}>
            <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: 8 }}>Cancel this meeting?</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
              The meeting will be cancelled for all invited participants.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="nm-btn-ghost" style={{ padding: '7px 16px' }} onClick={() => setConfirming(null)} disabled={cancelling}>Keep Meeting</button>
              <button className="nm-btn" style={{ padding: '7px 16px', background: 'var(--error)' }} onClick={() => handleCancel(confirming)} disabled={cancelling}>
                {cancelling ? 'Cancelling…' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Meetings() {
  const [meetings, setMeetings] = useState([])           // all non-cancelled meetings for table
  const [upcoming, setUpcoming] = useState([])           // future scheduled only for KPI card
  const [loadingUpcoming, setLoadingUpcoming] = useState(true)
  const [teams, setTeams] = useState([])
  const [selectedTeamIds, setSelectedTeamIds] = useState([])
  const [form, setForm] = useState({ title: '', participants: '', duration_minutes: 30, preferred_date: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [cancelConfirm, setCancelConfirm] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const { toasts, toast, dismiss } = useToast()

  const loadMeetings = () =>
    getMeetings().then(r => {
      // Filter out cancelled meetings from the table
      setMeetings(r.data.filter(m => m.status !== 'Cancelled'))
    })

  const loadUpcoming = () => {
    setLoadingUpcoming(true)
    getUpcomingMeetings()
      .then(r => setUpcoming(r.data))
      .catch(() => {})
      .finally(() => setLoadingUpcoming(false))
  }

  const loadAll = () => { loadMeetings(); loadUpcoming() }

  useEffect(() => {
    loadAll()
    getTeams().then(r => setTeams(r.data))
  }, [])

  const toggleTeam = (id) => setSelectedTeamIds(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  )

  const validate = () => {
    const e = {}
    if (!form.title.trim()) e.title = 'Title is required'
    const emails = form.participants.split(',').map(p => p.trim()).filter(Boolean)
    if (emails.some(p => !EMAIL_RE.test(p))) e.participants = 'One or more emails are invalid'
    if (!emails.length && !selectedTeamIds.length) e.participants = 'Add at least one participant or select a team'
    const dur = Number(form.duration_minutes)
    if (!dur || dur < 15 || dur > 480) e.duration_minutes = 'Duration must be between 15 and 480 minutes'
    if (!form.preferred_date) e.preferred_date = 'Preferred date is required'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors)
      toast(Object.values(validationErrors)[0], 'error')
      return
    }
    setErrors({})
    setLoading(true)
    try {
      const emails = form.participants.split(',').map(p => p.trim()).filter(Boolean)
      await scheduleMeeting({
        title: form.title,
        participants: emails,
        team_ids: selectedTeamIds,
        duration_minutes: Number(form.duration_minutes),
        preferred_date: form.preferred_date,
      })
      toast('Meeting scheduled successfully', 'success')
      loadAll()
      setForm({ title: '', participants: '', duration_minutes: 30, preferred_date: '' })
      setSelectedTeamIds([])
      setErrors({})
    } catch (err) {
      toast('Failed: ' + (err.response?.data?.detail || err.message), 'error')
    } finally { setLoading(false) }
  }

  // Cancel from the table
  const handleCancelFromTable = async () => {
    if (!cancelConfirm) return
    setCancelling(true)
    try {
      await cancelMeeting(cancelConfirm)
      // Remove immediately from both table and upcoming card — no refetch needed
      setMeetings(prev => prev.filter(m => m.id !== cancelConfirm))
      setUpcoming(prev => prev.filter(m => m.id !== cancelConfirm))
      toast('Meeting cancelled', 'success')
      setCancelConfirm(null)
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to cancel meeting', 'error')
    } finally { setCancelling(false) }
  }

  // Cancel from the KPI card — also removes from table
  const handleCancelFromCard = (id) => {
    setMeetings(prev => prev.filter(m => m.id !== id))
    setUpcoming(prev => prev.filter(m => m.id !== id))
  }

  return (
    <div className="nm-page">
      <div className="nm-page-header">
        <div>
          <h1 className="nm-page-title">Meetings</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Schedule and manage Google Calendar meetings
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="meetings-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

        {/* ── LEFT: form + table ── */}
        <div style={{ minWidth: 0 }}>
          {/* Schedule form */}
          <div className="nm-card" style={{ marginBottom: 20 }}>
            <div className="nm-card-header">
              <span className="nm-card-title">Schedule New Meeting</span>
              <CalendarPlus size={15} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div className="nm-card-body">
              <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={LABEL}>Meeting Title</label>
                  <input className="nm-input" style={errors.title ? { borderColor: 'var(--error)' } : {}}
                    placeholder="e.g. Sprint Planning" value={form.title}
                    onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setErrors(v => ({ ...v, title: '' })) }}
                    aria-label="Meeting title" />
                  {errors.title && <p style={ERR}>{errors.title}</p>}
                </div>

                {teams.length > 0 && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={LABEL}>Select Teams (optional)</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {teams.map(t => {
                        const selected = selectedTeamIds.includes(t.id)
                        return (
                          <button key={t.id} type="button" onClick={() => toggleTeam(t.id)} style={{
                            padding: '5px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 500,
                            cursor: 'pointer', border: '1px solid', fontFamily: 'inherit',
                            background: selected ? 'var(--primary-dim)' : 'var(--surface-inset)',
                            color: selected ? 'var(--primary)' : 'var(--text-secondary)',
                            borderColor: selected ? 'rgba(253,99,15,0.4)' : 'var(--border)',
                            transition: 'all 150ms',
                          }}>
                            {selected && <span style={{ marginRight: 4 }}>✓</span>}
                            {t.name}
                            <span style={{ marginLeft: 5, opacity: 0.6 }}>({t.members?.length || 0})</span>
                          </button>
                        )
                      })}
                    </div>
                    {selectedTeamIds.length > 0 && (
                      <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 6 }}>
                        Team members will be automatically added as attendees
                      </p>
                    )}
                  </div>
                )}

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={LABEL}>Additional Participants (optional)</label>
                  <input className="nm-input" style={errors.participants ? { borderColor: 'var(--error)' } : {}}
                    placeholder="alice@example.com, bob@example.com" value={form.participants}
                    onChange={e => { setForm(f => ({ ...f, participants: e.target.value })); setErrors(v => ({ ...v, participants: '' })) }}
                    aria-label="Participants" />
                  {errors.participants && <p style={ERR}>{errors.participants}</p>}
                </div>

                <div>
                  <label style={LABEL}>Duration (minutes)</label>
                  <input type="number" min={15} max={480} className="nm-input"
                    style={errors.duration_minutes ? { borderColor: 'var(--error)' } : {}}
                    placeholder="30" value={form.duration_minutes}
                    onChange={e => { setForm(f => ({ ...f, duration_minutes: e.target.value })); setErrors(v => ({ ...v, duration_minutes: '' })) }}
                    aria-label="Duration in minutes" />
                  {errors.duration_minutes && <p style={ERR}>{errors.duration_minutes}</p>}
                </div>

                <div>
                  <label style={LABEL}>Preferred Date</label>
                  <input type="date" className="nm-input"
                    style={errors.preferred_date ? { borderColor: 'var(--error)' } : {}}
                    value={form.preferred_date}
                    onChange={e => { setForm(f => ({ ...f, preferred_date: e.target.value })); setErrors(v => ({ ...v, preferred_date: '' })) }}
                    aria-label="Preferred date" />
                  {errors.preferred_date && <p style={ERR}>{errors.preferred_date}</p>}
                </div>

                <button type="submit" disabled={loading} className="nm-btn" style={{ gridColumn: '1 / -1' }}>
                  {loading ? 'Scheduling…' : 'Schedule Meeting'}
                </button>
              </form>
            </div>
          </div>

          {/* Meetings table — cancelled rows excluded */}
          <div className="nm-card">
            <div className="nm-table-wrap">
              <table className="nm-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Teams</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Meet Link</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {meetings.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '28px 16px' }}>
                        No meetings yet
                      </td>
                    </tr>
                  )}
                  {meetings.map(m => (
                    <tr key={m.id}>
                      <td>{m.title}</td>
                      <td className="dim">{parseTeamNames(m.team_names) || '—'}</td>
                      <td className="dim">{m.meeting_date || '—'}</td>
                      <td className="dim">{m.meeting_time || '—'}</td>
                      <td className="dim">{m.duration_minutes}m</td>
                      <td><Badge label={m.status} /></td>
                      <td>
                        {m.meet_link
                          ? <a href={m.meet_link} target="_blank" rel="noreferrer" className="nm-link"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Video size={11} /> Join
                            </a>
                          : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td>
                        {m.status === 'Scheduled' && (
                          <button className="nm-btn-sm"
                            style={{ color: 'var(--error)', borderColor: 'rgba(224,82,82,0.3)' }}
                            onClick={() => setCancelConfirm(m.id)}
                            aria-label="Cancel meeting">
                            <X size={11} /> Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── RIGHT: glassmorphic KPI card ── */}
        <UpcomingKPI
          upcoming={upcoming}
          loadingUpcoming={loadingUpcoming}
          onCancelUpcoming={handleCancelFromCard}
        />
      </div>

      {/* Cancel confirmation dialog (from table) */}
      {cancelConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="nm-card" style={{ maxWidth: 380, width: '90%', padding: 24 }}>
            <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: 8 }}>Cancel this meeting?</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
              The meeting will be cancelled for all invited participants.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="nm-btn-ghost" style={{ padding: '7px 16px' }} onClick={() => setCancelConfirm(null)} disabled={cancelling}>
                Keep Meeting
              </button>
              <button className="nm-btn" style={{ padding: '7px 16px', background: 'var(--error)' }} onClick={handleCancelFromTable} disabled={cancelling}>
                {cancelling ? 'Cancelling…' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Responsive: stack on small screens */}
      <style>{`
        @media (max-width: 900px) {
          .meetings-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <Toast toasts={toasts} dismiss={dismiss} />
    </div>
  )
}
