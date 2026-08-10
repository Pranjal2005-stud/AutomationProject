import { useEffect, useState } from 'react'
import api from '../api/client'
import { CheckCircle, XCircle } from 'lucide-react'

const FIELDS = [
  { key: 'GROQ_API_KEY', label: 'Groq API Key', secret: true },
  { key: 'GROQ_MODEL', label: 'Groq Model', secret: false },
  { key: 'JIRA_URL', label: 'Jira URL', secret: false },
  { key: 'JIRA_EMAIL', label: 'Jira Email', secret: false },
  { key: 'JIRA_API_TOKEN', label: 'Jira API Token', secret: true },
  { key: 'JIRA_PROJECT_KEY', label: 'Jira Project Key', secret: false },
  { key: 'GMAIL_CREDENTIALS_FILE', label: 'Gmail Credentials File', secret: false },
  { key: 'GOOGLE_CALENDAR_ID', label: 'Google Calendar ID', secret: false },
]

export default function Settings() {
  const [env, setEnv] = useState({})

  useEffect(() => {
    api.get('/settings/env').then(r => setEnv(r.data))
  }, [])

  const isSet = (key) => {
    const val = env[key]
    return val && val !== '' && !val.startsWith('your-') && !val.startsWith('your@')
  }

  return (
    <div className="p-6 space-y-4 max-w-2xl">
      <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Settings</h2>

      <div className="skeuo-info-box skeuo-info-box-accent">
        All credentials are loaded from your <code className="skeuo-code">.env</code> file at{' '}
        <code className="skeuo-code">backend/.env</code>. Edit that file and restart the server to apply changes.
      </div>

      <div className="skeuo-panel">
        {FIELDS.map(({ key, label, secret }, idx) => {
          const val = env[key]
          const configured = isSet(key)
          return (
            <div
              key={key}
              className="px-5 py-4 flex items-center justify-between"
              style={{
                borderBottom: idx < FIELDS.length - 1 ? '1px solid var(--panel-border)' : 'none',
              }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{label}</p>
                <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-dim)' }}>
                  {!val ? 'Not set' : secret ? '••••••••' : val}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {configured ? (
                  <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--primary)' }}>
                    <CheckCircle size={15} /> Configured
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--accent)' }}>
                    <XCircle size={15} /> Not configured
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="skeuo-info-box">
        <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>How to configure:</p>
        <p>1. Open <code className="skeuo-code">backend/.env</code></p>
        <p>2. Fill in the missing values</p>
        <p>3. Restart the backend: <code className="skeuo-code">uvicorn main:app --reload</code></p>
      </div>
    </div>
  )
}
