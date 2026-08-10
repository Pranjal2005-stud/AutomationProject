import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Mail, Ticket, CalendarDays, ScrollText, Settings } from 'lucide-react'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/emails', label: 'Emails', icon: Mail },
  { to: '/tickets', label: 'Jira Tickets', icon: Ticket },
  { to: '/meetings', label: 'Meetings', icon: CalendarDays },
  { to: '/logs', label: 'Logs', icon: ScrollText },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  return (
    <aside className="skeuo-sidebar w-64 min-h-screen flex flex-col">
      <div className="skeuo-sidebar-header">
        <h1 className="skeuo-sidebar-title">AI Operations</h1>
        <p className="skeuo-sidebar-sub">Workplace Automation</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Main navigation">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `skeuo-nav-link${isActive ? ' active' : ''}`}
            aria-label={label}
          >
            <span className="skeuo-nav-icon" aria-hidden="true">
              <Icon size={15} />
            </span>
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
