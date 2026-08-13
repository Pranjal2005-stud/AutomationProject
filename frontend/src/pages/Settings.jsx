import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Info } from 'lucide-react'
import api from '../api/client'

const FIELDS = [
  { key: 'GROQ_API_KEY',           label: 'Groq API Key',           secret: true },
  { key: 'GROQ_MODEL',             label: 'Groq Model',             secret: false },
  { key: 'JIRA_URL',               label: 'Jira URL',               secret: false },
  { key: 'JIRA_EMAIL',             label: 'Jira Email',             secret: false },
  { key: 'JIRA_API_TOKEN',         label: 'Jira API Token',         secret: true },
  { key: 'JIRA_PROJECT_KEY',       label: 'Jira Project Key',       secret: false },
  { key: 'GMAIL_CREDENTIALS_FILE', label: 'Gmail Credentials File', secret: false },
  { key: 'GOOGLE_CALENDAR_ID',     label: 'Google Calendar ID',     secret: false },
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

  const configuredCount = FIELDS.filter(f => isSet(f.key)).length

  return (
    <div className="nm-page" style={{ maxWidth: 700 }}>
      <div className="nm-page-header">
        <div>
          <h1 className="nm-page-title">Settings</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>Environment configuration status</p>
        </div>
        <span style={{
          fontSize: '0.75rem', fontWeight: 500,
          color: configuredCount === FIELDS.length ? 'var(--success)' : 'var(--secondary)',
          background: configuredCount === FIELDS.length ? 'var(--success-dim)' : 'var(--secondary-dim)',
          border: `1px solid ${configuredCount === FIELDS.length ? 'rgba(67,171,146,0.25)' : 'rgba(230,180,40,0.25)'}`,
          padding: '4px 12px', borderRadius: 20
        }}>
          {configuredCount}/{FIELDS.length} configured
        </span>
      </div>

      <div className="nm-info-box" style={{ marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Info size={15} style={{ color: 'var(--secondary)', flexShrink: 0, marginTop: 2 }} />
        <span>
          All credentials are loaded from your <code className="nm-code">.env</code> file at{' '}
          <code className="nm-code">backend/.env</code>. Edit that file and restart the server to apply changes.
        </span>
      </div>

      <div className="nm-card" style={{ marginBottom: 20 }}>
        {FIELDS.map(({ key, label, secret }, idx) => {
          const val = env[key]
          const configured = isSet(key)
          return (
            <div key={key}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 3 }}>{label}</p>
                  <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                    {!val ? 'Not set' : secret ? '••••••••' : val}
                  </p>
                </div>
                {configured ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 500, color: 'var(--success)', whiteSpace: 'nowrap' }}>
                    <CheckCircle size={13} /> Configured
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 500, color: 'var(--error)', whiteSpace: 'nowrap' }}>
                    <XCircle size={13} /> Not set
                  </span>
                )}
              </div>
              {idx < FIELDS.length - 1 && <hr className="nm-divider" />}
            </div>
          )
        })}
      </div>

      <div className="nm-info-box">
        <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>How to configure</p>
        <p>1. Open <code className="nm-code">backend/.env</code></p>
        <p>2. Fill in the missing values</p>
        <p>3. Restart the backend: <code className="nm-code">uvicorn main:app --reload</code></p>
      </div>
    </div>
  )
}
