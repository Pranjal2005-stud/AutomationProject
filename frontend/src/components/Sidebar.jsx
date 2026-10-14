import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Mail, Ticket, CalendarDays, ScrollText, Settings, Zap, X, Users } from 'lucide-react'

const links = [
  { to: '/',         label: 'Dashboard', icon: LayoutDashboard },
  { to: '/emails',   label: 'Emails',    icon: Mail },
  { to: '/tickets',  label: 'Tickets',   icon: Ticket },
  { to: '/meetings', label: 'Meetings',  icon: CalendarDays },
  { to: '/teams',    label: 'Teams',     icon: Users },
  { to: '/logs',     label: 'Logs',      icon: ScrollText },
  { to: '/settings', label: 'Settings',  icon: Settings },
]

export default function Sidebar({ onClose, onStartTour }) {
  return (
    <aside className="nm-sidebar">
      {/* Logo */}
      <div className="nm-sidebar-logo" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div id="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 5 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 9,
              background: 'linear-gradient(135deg, #FD630F 0%, #e8570a 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, boxShadow: '0 2px 8px rgba(253,99,15,0.4)'
            }}>
              <Zap size={15} color="#fff" />
            </div>
            <span className="nm-sidebar-logo-title">AI Operations</span>
          </div>
          <p className="nm-sidebar-logo-sub">Workplace Automation</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="nm-btn-ghost"
            style={{ padding: '5px', borderRadius: '7px' }}
            aria-label="Close navigation"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav
        className="flex-1 px-3 py-4"
        style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        aria-label="Main navigation"
      >
        <p className="nm-nav-section">Menu</p>
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            id={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={({ isActive }) => `nm-nav-link${isActive ? ' active' : ''}`}
          >
            <span className="nm-nav-icon" aria-hidden="true">
              <Icon size={15} />
            </span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="nm-accent-dot" style={{ background: 'var(--success)' }} />
            <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Groq · Jira · Google</p>
          </div>
          {onStartTour && (
            <button
              onClick={onStartTour}
              style={{
                background: 'none', border: '1px solid rgba(253,99,15,0.3)', borderRadius: 7,
                color: '#FD630F', fontSize: '0.6875rem', fontWeight: 500,
                padding: '3px 9px', cursor: 'pointer', fontFamily: 'inherit',
                transition: 'background 150ms, border-color 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(253,99,15,0.1)'; e.currentTarget.style.borderColor = 'rgba(253,99,15,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'rgba(253,99,15,0.3)' }}
            >
              Tour
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
