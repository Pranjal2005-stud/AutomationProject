import { useEffect, useState } from 'react'
import { getMeetings, scheduleMeeting } from '../api/services'
import Badge from '../components/Badge'

export default function Meetings() {
  const [meetings, setMeetings] = useState([])
  const [form, setForm] = useState({ title: '', participants: '', duration_minutes: 30, preferred_date: '' })
  const [loading, setLoading] = useState(false)

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
      load()
      setForm({ title: '', participants: '', duration_minutes: 30, preferred_date: '' })
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Meetings</h2>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Schedule New Meeting</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <input required className="border border-gray-300 rounded-lg px-3 py-2 text-sm col-span-2" placeholder="Meeting Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <input required className="border border-gray-300 rounded-lg px-3 py-2 text-sm col-span-2" placeholder="Participants (comma-separated emails)" value={form.participants} onChange={e => setForm(f => ({ ...f, participants: e.target.value }))} />
          <input type="number" min={15} max={120} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Duration (minutes)" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} />
          <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.preferred_date} onChange={e => setForm(f => ({ ...f, preferred_date: e.target.value }))} />
          <button type="submit" disabled={loading} className="col-span-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Scheduling...' : 'Schedule Meeting'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Meet Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {meetings.map(m => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-700">{m.title}</td>
                <td className="px-4 py-3 text-gray-600">{m.meeting_date || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{m.meeting_time || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{m.duration_minutes}m</td>
                <td className="px-4 py-3"><Badge label={m.status} /></td>
                <td className="px-4 py-3">
                  {m.meet_link ? <a href={m.meet_link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs">Join</a> : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
