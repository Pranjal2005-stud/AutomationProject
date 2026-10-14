import { useEffect, useState, useRef, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Mail, Ticket, CalendarDays, CheckCircle, Clock, Activity, RefreshCw } from 'lucide-react'
import { getStats, getCharts, getRecent, pollGmail } from '../api/services'
import StatCard from '../components/StatCard'
import Badge from '../components/Badge'
import Toast, { useToast } from '../components/Toast'
import UpcomingMeetings from '../components/UpcomingMeetings'

const CHART_COLORS = ['#FD630F', '#E6B428', '#43AB92', '#C0CB75', '#AAB4C2']

const ROW_BORDER = '1px solid rgba(255,255,255,0.06)'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [charts, setCharts] = useState(null)
  const [recent, setRecent] = useState(null)
  const [polling, setPolling] = useState(false)
  const [countdown, setCountdown] = useState(300)
  const { toasts, toast, dismiss } = useToast()
  const countdownRef = useRef(null)

  const refreshData = () => {
    getStats().then(r => setStats(r.data))
    getCharts().then(r => setCharts(r.data))
    getRecent().then(r => setRecent(r.data))
  }

  const resetCountdown = useCallback(() => {
    setCountdown(300)
  }, [])

  useEffect(() => { refreshData() }, [])

  // Auto-poll every 5 minutes
  useEffect(() => {
    const autoPoll = async () => {
      try {
        const r = await pollGmail()
        toast(`Auto-poll — ${r.data.fetched} emails fetched, ${r.data.created} tickets created`, 'info')
        refreshData()
      } catch {
        toast('Auto-poll failed', 'error')
      }
    }
    const interval = setInterval(() => {
      autoPoll()
      resetCountdown()
    }, 300_000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown ticker
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown(c => (c <= 1 ? 300 : c - 1))
    }, 1000)
    return () => clearInterval(countdownRef.current)
  }, [])

  const handlePoll = async () => {
    setPolling(true)
    resetCountdown()
    try {
      const r = await pollGmail()
      toast(`Poll complete — ${r.data.created} tickets created, ${r.data.fetched} emails fetched`, 'success')
      refreshData()
    } catch {
      toast('Gmail poll failed — check credentials', 'error')
    } finally {
      setPolling(false)
    }
  }

  const mm = String(Math.floor(countdown / 60)).padStart(2, '0')
  const ss = String(countdown % 60).padStart(2, '0')

  return (
    <div className="nm-page">
      <div className="nm-page-header">
        <div>
          <h1 className="nm-page-title">Dashboard</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Overview of your automation pipeline
          </p>
        </div>
        <button id="tour-poll-btn" onClick={handlePoll} disabled={polling} className="nm-btn" aria-label="Poll Gmail now">
          <RefreshCw size={13} style={{ animation: polling ? 'spin 1s linear infinite' : 'none' }} />
          <span>{polling ? 'Polling…' : 'Poll Gmail'}</span>
          {!polling && (
            <span style={{
              marginLeft: 4,
              padding: '1px 7px',
              borderRadius: 20,
              background: 'rgba(0,0,0,0.2)',
              fontSize: '0.6875rem',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.02em',
              color: 'rgba(255,255,255,0.7)',
            }}>{mm}:{ss}</span>
          )}
        </button>
      </div>

      {/* Stat Cards */}
      <div id="tour-stat-cards" className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4" style={{ marginBottom: 24 }}>
        <StatCard title="Total Emails"  value={stats?.total_emails}       icon={Mail}         iconColor="#FD630F" />
        <StatCard title="Pending"       value={stats?.pending_emails}     icon={Clock}        iconColor="#E6B428" />
        <StatCard title="Processed"     value={stats?.processed_emails}   icon={CheckCircle}  iconColor="#43AB92" />
        <StatCard title="Tickets"       value={stats?.tickets_created}    icon={Ticket}       iconColor="#C0CB75" />
        <StatCard title="Meetings"      value={stats?.meetings_scheduled} icon={CalendarDays} iconColor="#43AB92" />
        <StatCard title="Today"         value={stats?.todays_activity}    icon={Activity}     iconColor="#E6B428" />
      </div>

      {/* Charts */}
      {charts && (
        <div id="tour-charts" className="grid grid-cols-1 lg:grid-cols-2 gap-5" style={{ marginBottom: 24 }}>
          <div className="nm-card">
            <div className="nm-card-header">
              <span className="nm-card-title">Emails per Day</span>
            </div>
            <div className="nm-card-body">
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={charts.emails_per_day} barCategoryGap="38%">
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={26} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border-strong)', borderRadius: 10 }}
                  />
                  <Bar dataKey="value" fill="#FD630F" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="nm-card">
            <div className="nm-card-header">
              <span className="nm-card-title">Tickets by Priority</span>
            </div>
            <div className="nm-card-body">
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie
                    data={charts.tickets_by_priority}
                    dataKey="value"
                    nameKey="label"
                    cx="50%" cy="50%"
                    outerRadius={78}
                    innerRadius={38}
                    paddingAngle={3}
                  >
                    {charts.tickets_by_priority.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend iconSize={9} iconType="circle" />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border-strong)', borderRadius: 10 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity + Upcoming Meetings */}
      {recent && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {[
            {
              title: 'Recent Emails',
              items: recent.emails,
              left: e => e.subject || '(No Subject)',
              right: e => <Badge label={e.status} />,
            },
            {
              title: 'Recent Tickets',
              items: recent.tickets,
              left: t => <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 500 }}>{t.jira_key || '—'}</span>,
              right: t => <Badge label={t.priority} />,
            },
          ].map(({ title, items, left, right }) => (
            <div key={title} className="nm-card">
              <div className="nm-card-header">
                <span className="nm-card-title">{title}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {items?.map((item, i) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 20px',
                      borderBottom: i < items.length - 1 ? ROW_BORDER : 'none',
                    }}
                  >
                    <span style={{
                      fontSize: '0.8125rem', color: 'var(--text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160
                    }}>
                      {left(item)}
                    </span>
                    {right(item)}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <UpcomingMeetings />
        </div>
      )}

      <Toast toasts={toasts} dismiss={dismiss} />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
