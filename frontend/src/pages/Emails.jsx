import { useEffect, useState } from 'react'
import { getEmails, createTicketForEmail, retryEmail } from '../api/services'
import Badge from '../components/Badge'
import Toast, { useToast } from '../components/Toast'

export default function Emails() {
  const [emails, setEmails] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [skip, setSkip] = useState(0)
  const { toasts, toast, dismiss } = useToast()
  const limit = 20

  const load = () => {
    const params = { skip, limit }
    if (search) params.search = search
    if (status) params.status = status
    getEmails(params).then(r => setEmails(r.data))
  }

  useEffect(() => { load() }, [skip, status])

  const handleTicket = async (id) => {
    try {
      const r = await createTicketForEmail(id)
      toast(`Ticket created: ${r.data.jira_key}`, 'success')
      load()
    } catch (e) {
      toast('Failed: ' + (e.response?.data?.detail || e.message), 'error')
    }
  }

  const handleRetry = async (id) => {
    try {
      await retryEmail(id)
      toast('Email queued for retry', 'info')
      load()
    } catch (e) {
      toast('Retry failed: ' + (e.response?.data?.detail || e.message), 'error')
    }
  }

  return (
    <div className="p-6 space-y-4" style={{ background: 'var(--background)', minHeight: '100%' }}>
      <h2 className="skeuo-page-title">Emails</h2>

      <div className="skeuo-filter-bar">
        <input
          className="skeuo-input"
          style={{ width: '16rem' }}
          placeholder="Search subject, sender…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          aria-label="Search emails"
        />
        <select
          className="skeuo-input"
          style={{ width: 'auto' }}
          value={status}
          onChange={e => { setStatus(e.target.value); setSkip(0) }}
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          {['Pending', 'Processing', 'Processed', 'LLM_Failed', 'Jira_Failed'].map(s => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button onClick={load} className="skeuo-btn" aria-label="Run search">
          Search
        </button>
      </div>

      <div className="skeuo-panel overflow-hidden">
        <table className="skeuo-table">
          <thead>
            <tr>
              <th>Sender</th>
              <th>Subject</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Jira Key</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {emails.map(e => (
              <tr key={e.id}>
                <td className="dim">{e.sender_email}</td>
                <td className="max-w-xs truncate">{e.subject || '—'}</td>
                <td>{e.priority ? <Badge label={e.priority} /> : '—'}</td>
                <td><Badge label={e.status} /></td>
                <td className="mono">{e.jira_issue_key || '—'}</td>
                <td>
                  <div className="flex gap-2">
                    {!e.ticket_created && (
                      <button onClick={() => handleTicket(e.id)} className="skeuo-btn-sm accent" aria-label={`Create ticket for email ${e.id}`}>
                        Create Ticket
                      </button>
                    )}
                    {(e.status === 'LLM_Failed' || e.status === 'Jira_Failed') && (
                      <button onClick={() => handleRetry(e.id)} className="skeuo-btn-sm" aria-label={`Retry email ${e.id}`}>
                        Retry
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <button disabled={skip === 0} onClick={() => setSkip(s => Math.max(0, s - limit))} className="skeuo-btn" aria-label="Previous page">
          ← Prev
        </button>
        <button onClick={() => setSkip(s => s + limit)} className="skeuo-btn" aria-label="Next page">
          Next →
        </button>
      </div>

      <Toast toasts={toasts} dismiss={dismiss} />
    </div>
  )
}
