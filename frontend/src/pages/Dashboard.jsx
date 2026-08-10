import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Mail, Ticket, CalendarDays, CheckCircle, Clock, Activity } from 'lucide-react'
import { getStats, getCharts, getRecent, pollGmail } from '../api/services'
import StatCard from '../components/StatCard'
import Badge from '../components/Badge'
import Toast, { useToast } from '../components/Toast'

const PIE_COLORS = ['#b9ce9c', '#8972b9', '#4a6490', '#243550', '#6a8fbf']

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [charts, setCharts] = useState(null)
  const [recent, setRecent] = useState(null)
  const [polling, setPolling] = useState(false)
  const { toasts, toast, dismiss } = useToast()

  useEffect(() => {
    getStats().then(r => setStats(r.data))
    getCharts().then(r => setCharts(r.data))
    getRecent().then(r => setRecent(r.data))
  }, [])

  const handlePoll = async () => {
    setPolling(true)
    try {
      const r = await pollGmail()
      toast(`Poll complete: ${r.data.created} tickets created, ${r.data.fetched} emails fetched`, 'success')
      getStats().then(r => setStats(r.data))
    } catch {
      toast('Gmail poll failed — check credentials', 'error')
    } finally {
      setPolling(false)
    }
  }

  return (
    <div className="p-6 space-y-6" style={{ background: 'var(--background)', minHeight: '100%' }}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Dashboard</h2>
        <button
          onClick={handlePoll}
          disabled={polling}
          className="skeuo-btn"
          aria-label="Poll Gmail now"
        >
          {polling ? 'Polling…' : '⟳ Poll Gmail Now'}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Total Emails" value={stats?.total_emails} icon={Mail} />
        <StatCard title="Pending" value={stats?.pending_emails} icon={Clock} />
        <StatCard title="Processed" value={stats?.processed_emails} icon={CheckCircle} />
        <StatCard title="Tickets" value={stats?.tickets_created} icon={Ticket} />
        <StatCard title="Meetings" value={stats?.meetings_scheduled} icon={CalendarDays} />
        <StatCard title="Today" value={stats?.todays_activity} icon={Activity} />
      </div>

      {/* Charts */}
      {charts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="skeuo-panel">
            <h3 className="skeuo-panel-title">Emails per Day</h3>
            <div className="skeuo-panel-body">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={charts.emails_per_day}>
                  <defs>
                    <linearGradient id="barGradA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#b9ce9c" />
                      <stop offset="100%" stopColor="#8972b9" />
                    </linearGradient>
                    <linearGradient id="barGradB" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8972b9" />
                      <stop offset="100%" stopColor="#354a6a" />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {charts.emails_per_day?.map((_, i) => (
                      <Cell key={i} fill={i % 2 === 0 ? 'url(#barGradA)' : 'url(#barGradB)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="skeuo-panel">
            <h3 className="skeuo-panel-title">Tickets by Priority</h3>
            <div className="skeuo-panel-body">
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
        </div>
      )}

      {/* Recent Activity */}
      {recent && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="skeuo-panel">
            <h3 className="skeuo-panel-title">Recent Emails</h3>
            <div className="skeuo-panel-body space-y-2">
              {recent.emails?.map(e => (
                <div key={e.id} className="flex items-center justify-between text-sm">
                  <span className="truncate max-w-[160px]" style={{ color: 'var(--text)' }}>{e.subject || '(No Subject)'}</span>
                  <Badge label={e.status} />
                </div>
              ))}
            </div>
          </div>
          <div className="skeuo-panel">
            <h3 className="skeuo-panel-title">Recent Tickets</h3>
            <div className="skeuo-panel-body space-y-2">
              {recent.tickets?.map(t => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <span className="font-mono" style={{ color: 'var(--text)' }}>{t.jira_key || '—'}</span>
                  <Badge label={t.priority} />
                </div>
              ))}
            </div>
          </div>
          <div className="skeuo-panel">
            <h3 className="skeuo-panel-title">Recent Meetings</h3>
            <div className="skeuo-panel-body space-y-2">
              {recent.meetings?.map(m => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <span className="truncate max-w-[160px]" style={{ color: 'var(--text)' }}>{m.title}</span>
                  <Badge label={m.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Toast toasts={toasts} dismiss={dismiss} />
    </div>
  )
}
