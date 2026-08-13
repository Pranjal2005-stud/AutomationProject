import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from './components/Sidebar'
import PrismBackground from './components/PrismBackground'
import Tour, { useTour } from './components/Tour'
import Dashboard from './pages/Dashboard'
import Emails from './pages/Emails'
import Tickets from './pages/Tickets'
import Meetings from './pages/Meetings'
import Logs from './pages/Logs'
import Settings from './pages/Settings'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { active: tourActive, startTour, endTour } = useTour()

  return (
    <BrowserRouter>
      <div className="flex min-h-screen" style={{ background: 'var(--background)', position: 'relative' }}>
        <PrismBackground />
        {/* Desktop sidebar */}
        <div className="hidden md:block" style={{ position: 'relative', zIndex: 1 }}>
          <Sidebar onStartTour={startTour} />
        </div>

        {/* Mobile sidebar */}
        {sidebarOpen && (
          <div className="md:hidden">
            <div className="nm-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
            <div className="nm-sidebar-mobile open">
              <Sidebar onClose={() => setSidebarOpen(false)} onStartTour={startTour} />
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0" style={{ position: 'relative', zIndex: 1 }}>
          {/* Mobile header */}
          <header
            className="md:hidden flex items-center gap-3 px-4 py-3 sticky top-0 z-30"
            style={{ background: 'rgba(43,53,67,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}
          >
            <button
              onClick={() => setSidebarOpen(true)}
              className="nm-btn-ghost"
              style={{ padding: '7px', borderRadius: '9px' }}
              aria-label="Open navigation"
            >
              <Menu size={17} />
            </button>
            <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>AI Operations</span>
          </header>

          <main className="flex-1 min-w-0">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/emails" element={<Emails />} />
              <Route path="/tickets" element={<Tickets />} />
              <Route path="/meetings" element={<Meetings />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>
      {tourActive && <Tour onDone={endTour} />}
    </BrowserRouter>
  )
}
