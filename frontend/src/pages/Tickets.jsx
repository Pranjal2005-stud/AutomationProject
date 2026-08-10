import { useEffect, useState } from 'react'
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
    <div className="p-6 space-y-4" style={{ background: 'var(--background)', minHeight: '100%' }}>
      <h2 className="skeuo-page-title">Jira Tickets</h2>
      <div className="skeuo-panel overflow-hidden">
        <table className="skeuo-table">
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
                <td className="max-w-xs truncate">{t.summary}</td>
                <td><Badge label={t.priority} /></td>
                <td className="dim">{t.issue_type}</td>
                <td><Badge label={t.status} /></td>
                <td className="dim">{t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</td>
                <td>
                  {t.jira_key && (
                    <button onClick={() => openJira(t.id)} className="skeuo-btn-sm" aria-label={`Open ${t.jira_key} in Jira`}>
                      Open in Jira
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Toast toasts={toasts} dismiss={dismiss} />
    </div>
  )
}
