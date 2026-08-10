import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Emails from './pages/Emails'
import Tickets from './pages/Tickets'
import Meetings from './pages/Meetings'
import Logs from './pages/Logs'
import Settings from './pages/Settings'

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <BrowserRouter>
      <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-auto">
          <div className="flex justify-end px-6 pt-4">
            <button
              onClick={toggle}
              className="skeuo-theme-toggle"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark'
                ? <><Sun size={14} /> Light mode</>
                : <><Moon size={14} /> Dark mode</>}
            </button>
          </div>
          <main className="flex-1">
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
    </BrowserRouter>
  )
}
