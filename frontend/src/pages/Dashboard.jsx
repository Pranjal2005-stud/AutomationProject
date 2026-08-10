import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Mail, Ticket, CalendarDays, CheckCircle, Clock, Activity } from 'lucide-react'
import { getStats, getCharts, getRecent, pollGmail } from '../api/services'
import StatCard from '../components/StatCard'
import Badge from '../components/Badge'

const PIE_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6']

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [charts, setCharts] = useState(null)
  const [recent, setRecent] = useState(null)
  const [polling, setPolling] = useState(false)

  useEffect(() => {
    getStats().then(r => setStats(r.data))
    getCharts().then(r => setCharts(r.data))
    getRecent().then(r => setRecent(r.data))
  }, [])

  const handlePoll = async () => {
    setPolling(true)
    try {
      const r = await pollGmail()
      alert(`Poll complete: ${r.data.created} tickets created, ${r.data.fetched} emails fetched`)
      getStats().then(r => setStats(r.data))
    } catch {
      alert('Gmail poll failed — check credentials')
    } finally {
      setPolling(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
        <button
          onClick={handlePoll}
          disabled={polling}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {polling ? 'Polling...' : '⟳ Poll Gmail Now'}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Total Emails" value={stats?.total_emails} icon={Mail} color="blue" />
        <StatCard title="Pending" value={stats?.pending_emails} icon={Clock} color="yellow" />
        <StatCard title="Processed" value={stats?.processed_emails} icon={CheckCircle} color="green" />
        <StatCard title="Tickets" value={stats?.tickets_created} icon={Ticket} color="purple" />
        <StatCard title="Meetings" value={stats?.meetings_scheduled} icon={CalendarDays} color="indigo" />
        <StatCard title="Today" value={stats?.todays_activity} icon={Activity} color="red" />
      </div>

      {/* Charts */}
      {charts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Emails per Day</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.emails_per_day}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Tickets by Priority</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={charts.tickets_by_priority} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={80} label>
                  {charts.tickets_by_priority.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {recent && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Emails</h3>
            <div className="space-y-2">
              {recent.emails?.map(e => (
                <div key={e.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 truncate max-w-[160px]">{e.subject || '(No Subject)'}</span>
                  <Badge label={e.status} />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Tickets</h3>
            <div className="space-y-2">
              {recent.tickets?.map(t => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 font-mono">{t.jira_key || '—'}</span>
                  <Badge label={t.priority} />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Meetings</h3>
            <div className="space-y-2">
              {recent.meetings?.map(m => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 truncate max-w-[160px]">{m.title}</span>
                  <Badge label={m.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
