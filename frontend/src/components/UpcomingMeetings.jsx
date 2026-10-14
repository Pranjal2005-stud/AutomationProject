import { useEffect, useState } from 'react'
import { Video, MoreVertical, Calendar, Clock, Users, ExternalLink } from 'lucide-react'
import { getUpcomingMeetings, cancelMeeting } from '../api/services'

function Avatar({ email }) {
  const initials = email ? email.slice(0, 2).toUpperCase() : '??'
  const hue = email ? (email.charCodeAt(0) * 37 + email.charCodeAt(1) * 17) % 360 : 0
  return (
    <span style={{
      width: 26, height: 26, borderRadius: '50%',
      background: `hsl(${hue},45%,35%)`,
      border: '2px solid rgba(255,255,255,0.12)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.5625rem', fontWeight: 700, color: '#fff',
      flexShrink: 0, marginLeft: -6,
    }}>
      {initials}
    </span>
  )
}

function formatMeetingTime(date, time) {
  if (!date || !time) return '—'
  try {
    const dt = new Date(`${date}T${time}:00Z`)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setUTCDate(today.getUTCDate() + 1)

    const isToday = dt.toISOString().slice(0, 10) === today.toISOString().slice(0, 10)
    const isTomorrow = dt.toISOString().slice(0, 10) === tomorrow.toISOString().slice(0, 10)

    const dayLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    const timeLabel = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' })
    return `${dayLabel} · ${timeLabel}`
  } catch {
    return `${date} ${time}`
  }
}

function parseTeamNames(teamNamesJson) {
  if (!teamNamesJson) return null
  try {
    const arr = JSON.parse(teamNamesJson)
    return Array.isArray(arr) && arr.length ? arr.join(', ') : null
  } catch {
    return teamNamesJson
  }
}

function MeetingCard({ meeting, onCancel }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const teamLabel = parseTeamNames(meeting.team_names)
  const attendees = meeting.attendees || []

  const handleCancel = async () => {
    setCancelling(true)
    try {
      await cancelMeeting(meeting.id)
      onCancel(meeting.id)
    } catch (err) {
      console.error('Cancel failed', err)
    } finally {
      setCancelling(false)
      setConfirming(false)
    }
  }

  return (
    <div style={{
      padding: '14px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      position: 'relative',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
            {meeting.title}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <Clock size={10} />
            <span>{formatMeetingTime(meeting.meeting_date, meeting.meeting_time)}</span>
          </div>
          {teamLabel && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.6875rem', color: 'var(--primary)', marginBottom: 6 }}>
              <Users size={10} />
              <span>{teamLabel}</span>
            </div>
          )}
          {/* Avatars + count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', paddingLeft: 6 }}>
              {attendees.slice(0, 4).map((a, i) => <Avatar key={i} email={a.email} />)}
            </div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              {attendees.length} participant{attendees.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Three-dot menu */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 4px', borderRadius: 6, display: 'flex' }}
            aria-label="Meeting options"
          >
            <MoreVertical size={14} />
          </button>
          {menuOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setMenuOpen(false)} />
              <div style={{
                position: 'absolute', right: 0, top: 22, zIndex: 20,
                background: 'var(--surface-2)', border: '1px solid var(--border-strong)',
                borderRadius: 10, boxShadow: 'var(--nm-raised-hover)', minWidth: 150, overflow: 'hidden',
              }}>
                {meeting.calendar_link && (
                  <a href={meeting.calendar_link} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', fontSize: '0.75rem', color: 'var(--text-secondary)', textDecoration: 'none', cursor: 'pointer' }}
                    onClick={() => setMenuOpen(false)}
                  >
                    <Calendar size={12} /> View Details
                  </a>
                )}
                <button
                  onClick={() => { setMenuOpen(false); setConfirming(true) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', fontSize: '0.75rem', color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}
                >
                  Cancel Meeting
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Join button */}
      {meeting.meet_link && (
        <a
          href={meeting.meet_link}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            marginTop: 10, padding: '6px 14px', borderRadius: 8,
            background: 'rgba(67,171,146,0.15)', border: '1px solid rgba(67,171,146,0.3)',
            color: 'var(--success)', fontSize: '0.75rem', fontWeight: 500,
            textDecoration: 'none', transition: 'background 150ms',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(67,171,146,0.25)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(67,171,146,0.15)'}
        >
          <Video size={11} /> Join Meeting
        </a>
      )}

      {/* Cancel confirmation */}
      {confirming && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="nm-card" style={{ maxWidth: 360, width: '90%', padding: 24 }}>
            <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: 8 }}>Cancel this meeting?</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
              The meeting will be cancelled for all invited participants.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="nm-btn-ghost" style={{ padding: '7px 16px' }} onClick={() => setConfirming(false)} disabled={cancelling}>Keep Meeting</button>
              <button className="nm-btn" style={{ padding: '7px 16px', background: 'var(--error)' }} onClick={handleCancel} disabled={cancelling}>
                {cancelling ? 'Cancelling…' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function UpcomingMeetings() {
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    getUpcomingMeetings()
      .then(r => setMeetings(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCancelled = (id) => setMeetings(prev => prev.filter(m => m.id !== id))

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
      maxHeight: 520,
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 18px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.03)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(67,171,146,0.15)', border: '1px solid rgba(67,171,146,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={13} style={{ color: 'var(--success)' }} />
          </div>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Upcoming Meetings</span>
        </div>
        {meetings.length > 0 && (
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', background: 'var(--surface-inset)', padding: '2px 8px', borderRadius: 10, border: '1px solid var(--border)' }}>
            {meetings.length}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Loading…</div>
        )}
        {!loading && meetings.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <Calendar size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 10px', display: 'block' }} />
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>No upcoming meetings</p>
          </div>
        )}
        {!loading && meetings.map(m => (
          <MeetingCard key={m.id} meeting={m} onCancel={handleCancelled} />
        ))}
      </div>
    </div>
  )
}
