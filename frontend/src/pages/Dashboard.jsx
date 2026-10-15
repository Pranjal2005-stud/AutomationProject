import { useEffect, useState, useRef, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Mail, Ticket, CalendarDays, CheckCircle, Clock, Activity, RefreshCw, ChevronDown } from 'lucide-react'
import { getStats, getCharts, getRecent, pollGmail, getTicketHeatmap } from '../api/services'
import StatCard from '../components/StatCard'
import Badge from '../components/Badge'
import Toast, { useToast } from '../components/Toast'
import { playNamedSound } from '../components/Toast'
import UpcomingMeetings from '../components/UpcomingMeetings'

const CHART_COLORS = ['#FD630F', '#E6B428', '#43AB92', '#C0CB75', '#AAB4C2']
const PRIORITY_COLORS = { Highest: '#E05252', High: '#FD630F', Medium: '#E6B428', Low: '#43AB92', Lowest: '#6B7A8D' }
const TICK_STYLE = { fill: '#AAB4C2', fontSize: 11 }

const ROW_BORDER = '1px solid rgba(255,255,255,0.06)'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [charts, setCharts] = useState(null)
  const [recent, setRecent] = useState(null)
  const [heatmap, setHeatmap] = useState([])
  const [polling, setPolling] = useState(false)
  const [countdown, setCountdown] = useState(300)
  const [showAllEmails, setShowAllEmails] = useState(false)
  const { toasts, toast, dismiss } = useToast()
  const countdownRef = useRef(null)

  const refreshData = () => {
    getStats().then(r => setStats(r.data))
    getCharts().then(r => setCharts(r.data))
    getRecent().then(r => setRecent(r.data))
    getTicketHeatmap().then(r => setHeatmap(r.data)).catch(() => {})
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
        toast(`Auto-poll — ${r.data.fetched} emails fetched, ${r.data.processed} tickets created`, 'info')
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
      const { fetched = 0, processed = 0 } = r.data
      if (fetched > 0) playNamedSound('new_email')
      if (processed > 0) setTimeout(() => playNamedSound('ticket_created'), 600)
      toast(`Poll complete — ${processed} tickets created, ${fetched} emails fetched`, 'success')
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
        <StatCard title="Upcoming"      value={stats?.meetings_scheduled} icon={CalendarDays} iconColor="#43AB92" />
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
                  <XAxis dataKey="label" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                  <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} width={26} />
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
              <span className="nm-card-title">Ticket Priority Heatmap</span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Last 14 days</span>
            </div>
            <div className="nm-card-body">
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={heatmap} barCategoryGap="30%" barGap={1}>
                  <XAxis dataKey="date" tick={TICK_STYLE} axisLine={false} tickLine={false}
                    tickFormatter={v => v.slice(5)} />
                  <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} width={26} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border-strong)', borderRadius: 10 }}
                  />
                  <Legend iconSize={8} iconType="circle"
                    formatter={v => <span style={{ color: '#AAB4C2', fontSize: 11 }}>{v}</span>} />
                  {Object.entries(PRIORITY_COLORS).map(([p, color]) => (
                    <Bar key={p} dataKey={p} stackId="a" fill={color} radius={p === 'Lowest' ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                  ))}
                </BarChart>
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
              showMore: true
            },
            {
              title: 'Recent Tickets',
              items: recent.tickets,
              left: t => <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 500 }}>{t.jira_key || '—'}</span>,
              right: t => <Badge label={t.priority} />,
            },
          ].map(({ title, items, left, right, showMore }) => {
            const isEmails = title === 'Recent Emails'
            const displayItems = isEmails && !showAllEmails ? items?.slice(0, 4) : items
            const hasMoreItems = isEmails && items?.length > 4

            return (
              <div key={title} className="nm-card">
                <div className="nm-card-header">
                  <span className="nm-card-title">{title}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {displayItems?.map((item, i) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 20px',
                        borderBottom: i < displayItems.length - 1 ? ROW_BORDER : (hasMoreItems && !showAllEmails ? ROW_BORDER : 'none'),
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
                  
                  {/* Show More Button for Emails */}
                  {isEmails && hasMoreItems && !showAllEmails && (
                    <div style={{
                      padding: '10px 20px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <button 
                        onClick={() => setShowAllEmails(true)}
                        style={{
                          background: 'rgba(253, 99, 15, 0.1)',
                          border: '1px solid rgba(253, 99, 15, 0.3)',
                          borderRadius: 6,
                          padding: '6px 12px',
                          color: '#FD630F',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.background = 'rgba(253, 99, 15, 0.15)'
                          e.target.style.borderColor = 'rgba(253, 99, 15, 0.5)'
                        }}
                        onMouseOut={(e) => {
                          e.target.style.background = 'rgba(253, 99, 15, 0.1)'
                          e.target.style.borderColor = 'rgba(253, 99, 15, 0.3)'
                        }}
                      >
                        Show {items.length - 4} more
                        <ChevronDown size={12} />
                      </button>
                    </div>
                  )}
                  
                  {/* Show Less Option */}
                  {isEmails && showAllEmails && hasMoreItems && (
                    <div style={{
                      padding: '10px 20px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <button 
                        onClick={() => setShowAllEmails(false)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: 6,
                          padding: '6px 12px',
                          color: 'rgba(255, 255, 255, 0.7)',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                        }}
                        onMouseOut={(e) => {
                          e.target.style.background = 'rgba(255, 255, 255, 0.05)'
                        }}
                      >
                        Show less
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
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
