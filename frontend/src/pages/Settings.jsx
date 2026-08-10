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
      <h2 className="text-xl font-bold text-gray-800">Settings</h2>

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-sm text-blue-800">
        All credentials are loaded from your <code className="font-mono bg-blue-100 px-1 rounded">.env</code> file at{' '}
        <code className="font-mono bg-blue-100 px-1 rounded">backend/.env</code>. Edit that file and restart the server to apply changes.
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
        {FIELDS.map(({ key, label, secret }) => {
          const val = env[key]
          const configured = isSet(key)
          return (
            <div key={key} className="px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">
                  {!val ? 'Not set' : secret ? '••••••••' : val}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {configured ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <CheckCircle size={15} /> Configured
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                    <XCircle size={15} /> Not configured
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-sm text-gray-600 space-y-1">
        <p className="font-semibold text-gray-700">How to configure:</p>
        <p>1. Open <code className="font-mono bg-gray-100 px-1 rounded">backend/.env</code></p>
        <p>2. Fill in the missing values</p>
        <p>3. Restart the backend server: <code className="font-mono bg-gray-100 px-1 rounded">uvicorn main:app --reload</code></p>
      </div>
    </div>
  )
}
