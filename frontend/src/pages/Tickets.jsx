import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { getTickets, getTicketJiraUrl } from '../api/services'
import Badge from '../components/Badge'
import Toast, { useToast } from '../components/Toast'

export default function Tickets() {
  const [tickets, setTickets] = useState([])
  const { toasts, toast, dismiss } = useToast()

  useEffect(() => {
    getTickets().then(r => setTickets(r.data))
  }, [])

  const openJira = async (id) => {
    try {
      const r = await getTicketJiraUrl(id)
      window.open(r.data.url, '_blank')
    } catch {
      toast('Could not get Jira URL', 'error')
    }
  }

  return (
    <div className="nm-page">
      <div className="nm-page-header">
        <div>
          <h1 className="nm-page-title">Jira Tickets</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>Auto-created from processed emails</p>
        </div>
        <span style={{
          fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)',
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          padding: '4px 12px', borderRadius: 20
        }}>
          {tickets.length} tickets
        </span>
      </div>

      <div className="nm-card">
        <div className="nm-table-wrap">
          <table className="nm-table">
            <thead>
              <tr>
                <th>Jira Key</th>
                <th>Summary</th>
                <th>Priority</th>
                <th>Type</th>
                <th>Status</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t.id}>
                  <td className="mono">{t.jira_key || '—'}</td>
                  <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.summary}</td>
                  <td><Badge label={t.priority} /></td>
                  <td className="dim">{t.issue_type}</td>
                  <td><Badge label={t.status} /></td>
                  <td className="dim">{t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</td>
                  <td>
                    {t.jira_key && (
                      <button onClick={() => openJira(t.id)} className="nm-btn-sm" aria-label={`Open ${t.jira_key} in Jira`}>
                        <ExternalLink size={11} /> Open
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Toast toasts={toasts} dismiss={dismiss} />
    </div>
  )
}
