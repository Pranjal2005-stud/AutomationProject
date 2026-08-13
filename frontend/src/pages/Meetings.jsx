import { useEffect, useState } from 'react'
import { CalendarPlus, Video } from 'lucide-react'
import { getMeetings, scheduleMeeting } from '../api/services'
import Badge from '../components/Badge'
import Toast, { useToast } from '../components/Toast'

const ERR = { fontSize: '0.6875rem', color: 'var(--error)', marginTop: 5, fontWeight: 500 }
const LABEL = { fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block' }

export default function Meetings() {
  const [meetings, setMeetings] = useState([])
  const [form, setForm] = useState({ title: '', participants: '', duration_minutes: 30, preferred_date: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const { toasts, toast, dismiss } = useToast()

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const validate = () => {
    const e = {}
    if (!form.title.trim()) e.title = 'Title is required'
    const emails = form.participants.split(',').map(p => p.trim()).filter(Boolean)
    if (!emails.length) e.participants = 'At least one participant is required'
    else if (emails.some(p => !EMAIL_RE.test(p))) e.participants = 'One or more emails are invalid'
    const dur = Number(form.duration_minutes)
    if (!dur || dur < 15 || dur > 120) e.duration_minutes = 'Duration must be between 15 and 120 minutes'
    if (!form.preferred_date) e.preferred_date = 'Preferred date is required'
    return e
  }

  const load = () => getMeetings().then(r => setMeetings(r.data))
  useEffect(() => { load() }, [])

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
      await scheduleMeeting({
        ...form,
        participants: form.participants.split(',').map(p => p.trim()).filter(Boolean),
        duration_minutes: Number(form.duration_minutes),
      })
      toast('Meeting scheduled successfully', 'success')
      load()
      setForm({ title: '', participants: '', duration_minutes: 30, preferred_date: '' })
      setErrors({})
    } catch (err) {
      toast('Failed: ' + (err.response?.data?.detail || err.message), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="nm-page">
      <div className="nm-page-header">
        <div>
          <h1 className="nm-page-title">Meetings</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>Schedule and manage Google Calendar meetings</p>
        </div>
      </div>

      <div className="nm-card" style={{ marginBottom: 24, maxWidth: 640 }}>
        <div className="nm-card-header">
          <span className="nm-card-title">Schedule New Meeting</span>
          <CalendarPlus size={15} style={{ color: 'var(--text-muted)' }} />
        </div>
        <div className="nm-card-body">
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LABEL}>Meeting Title</label>
              <input
                className="nm-input"
                style={errors.title ? { borderColor: 'var(--error)' } : {}}
                placeholder="e.g. Sprint Planning"
                value={form.title}
                onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setErrors(v => ({ ...v, title: '' })) }}
                aria-label="Meeting title"
              />
              {errors.title && <p style={ERR}>{errors.title}</p>}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LABEL}>Participants</label>
              <input
                className="nm-input"
                style={errors.participants ? { borderColor: 'var(--error)' } : {}}
                placeholder="alice@example.com, bob@example.com"
                value={form.participants}
                onChange={e => { setForm(f => ({ ...f, participants: e.target.value })); setErrors(v => ({ ...v, participants: '' })) }}
                aria-label="Participants"
              />
              {errors.participants && <p style={ERR}>{errors.participants}</p>}
            </div>
            <div>
              <label style={LABEL}>Duration (minutes)</label>
              <input
                type="number"
                min={15}
                max={120}
                className="nm-input"
                style={errors.duration_minutes ? { borderColor: 'var(--error)' } : {}}
                placeholder="30"
                value={form.duration_minutes}
                onChange={e => { setForm(f => ({ ...f, duration_minutes: e.target.value })); setErrors(v => ({ ...v, duration_minutes: '' })) }}
                aria-label="Duration in minutes"
              />
              {errors.duration_minutes && <p style={ERR}>{errors.duration_minutes}</p>}
            </div>
            <div>
              <label style={LABEL}>Preferred Date</label>
              <input
                type="date"
                className="nm-input"
                style={errors.preferred_date ? { borderColor: 'var(--error)' } : {}}
                value={form.preferred_date}
                onChange={e => { setForm(f => ({ ...f, preferred_date: e.target.value })); setErrors(v => ({ ...v, preferred_date: '' })) }}
                aria-label="Preferred date"
              />
              {errors.preferred_date && <p style={ERR}>{errors.preferred_date}</p>}
            </div>
            <button type="submit" disabled={loading} className="nm-btn" style={{ gridColumn: '1 / -1' }} aria-label="Schedule meeting">
              {loading ? 'Scheduling…' : 'Schedule Meeting'}
            </button>
          </form>
        </div>
      </div>

      <div className="nm-card">
        <div className="nm-table-wrap">
          <table className="nm-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Date</th>
                <th>Time</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Meet Link</th>
              </tr>
            </thead>
            <tbody>
              {meetings.map(m => (
                <tr key={m.id}>
                  <td>{m.title}</td>
                  <td className="dim">{m.meeting_date || '—'}</td>
                  <td className="dim">{m.meeting_time || '—'}</td>
                  <td className="dim">{m.duration_minutes}m</td>
                  <td><Badge label={m.status} /></td>
                  <td>
                    {m.meet_link
                      ? <a href={m.meet_link} target="_blank" rel="noreferrer" className="nm-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Video size={11} /> Join
                        </a>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Toast toasts={toasts} dismiss={dismiss} />
    </div>
  )
}
