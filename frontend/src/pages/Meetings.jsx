import { useEffect, useState } from 'react'
import { getMeetings, scheduleMeeting } from '../api/services'
import Badge from '../components/Badge'
import Toast, { useToast } from '../components/Toast'

export default function Meetings() {
  const [meetings, setMeetings] = useState([])
  const [form, setForm] = useState({ title: '', participants: '', duration_minutes: 30, preferred_date: '' })
  const [loading, setLoading] = useState(false)
  const { toasts, toast, dismiss } = useToast()

  const load = () => getMeetings().then(r => setMeetings(r.data))
  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
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
    } catch (err) {
      toast('Failed: ' + (err.response?.data?.detail || err.message), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6" style={{ background: 'var(--background)', minHeight: '100%' }}>
      <h2 className="skeuo-page-title">Meetings</h2>

      <div className="skeuo-panel">
        <h3 className="skeuo-panel-title">Schedule New Meeting</h3>
        <div className="skeuo-panel-body">
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <input
              required
              className="skeuo-input col-span-2"
              placeholder="Meeting Title"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              aria-label="Meeting title"
            />
            <input
              required
              className="skeuo-input col-span-2"
              placeholder="Participants (comma-separated emails)"
              value={form.participants}
              onChange={e => setForm(f => ({ ...f, participants: e.target.value }))}
              aria-label="Participants"
            />
            <input
              type="number"
              min={15}
              max={120}
              className="skeuo-input"
              placeholder="Duration (minutes)"
              value={form.duration_minutes}
              onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
              aria-label="Duration in minutes"
            />
            <input
              type="date"
              className="skeuo-input"
              value={form.preferred_date}
              onChange={e => setForm(f => ({ ...f, preferred_date: e.target.value }))}
              aria-label="Preferred date"
            />
            <button type="submit" disabled={loading} className="skeuo-btn col-span-2" aria-label="Schedule meeting">
              {loading ? 'Scheduling…' : 'Schedule Meeting'}
            </button>
          </form>
        </div>
      </div>

      <div className="skeuo-panel overflow-hidden">
        <table className="skeuo-table">
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
                    ? <a href={m.meet_link} target="_blank" rel="noreferrer" className="skeuo-link">Join</a>
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Toast toasts={toasts} dismiss={dismiss} />
    </div>
  )
}
