import { useEffect, useState } from 'react'
import { ExternalLink, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { getTickets, getTicketJiraUrl, syncTicketsFromJira, updateTicketPriority } from '../api/services'
import Badge from '../components/Badge'
import Select from '../components/Select'
import Toast, { useToast } from '../components/Toast'

const PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Lowest']
const PRIORITY_OPTIONS = PRIORITIES.map(p => ({ value: p, label: p }))
const PAGE_SIZE = 20

export default function Tickets() {
  const [tickets, setTickets] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [priority, setPriority] = useState('')
  const [sort, setSort] = useState('desc')
  const [syncing, setSyncing] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)
  const { toasts, toast, dismiss } = useToast()

  const load = (p = page) =>
    getTickets({ priority: priority || undefined, sort, skip: p * PAGE_SIZE, limit: PAGE_SIZE })
      .then(r => { setTickets(r.data); setTotal(r.headers?.['x-total-count'] ? Number(r.headers['x-total-count']) : r.data.length + p * PAGE_SIZE) })

  useEffect(() => { setPage(0); load(0) }, [priority, sort]) // eslint-disable-line
  useEffect(() => { load() }, [page]) // eslint-disable-line

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const handleSync = async () => {
    setSyncing(true)
    try {
      const r = await syncTicketsFromJira()
      toast(`Synced ${r.data.synced} new, updated ${r.data.updated} tickets`, 'success')
      load(0); setPage(0)
    } catch {
      toast('Jira sync failed — check credentials', 'error')
    } finally {
      setSyncing(false)
    }
  }

  const handlePriorityChange = async (ticketId, newPriority) => {
    setUpdatingId(ticketId)
    try {
      await updateTicketPriority(ticketId, newPriority)
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, priority: newPriority } : t))
      toast(`Priority updated to ${newPriority}`, 'success')
    } catch {
      toast('Failed to update priority', 'error')
    } finally {
      setUpdatingId(null)
    }
  }

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)',
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            padding: '4px 12px', borderRadius: 20
          }}>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total || tickets.length + page * PAGE_SIZE)} of {total || '?'}
          </span>
          <button onClick={handleSync} disabled={syncing} className="nm-btn" aria-label="Sync from Jira">
            <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? 'Syncing…' : 'Sync from Jira'}
          </button>
        </div>
      </div>

      <div className="nm-filter-bar" style={{ marginBottom: 20 }}>
        <Select
          value={priority}
          onChange={setPriority}
          placeholder="All Priorities"
          options={[
            { value: '', label: 'All Priorities' },
            ...['Highest', 'High', 'Medium', 'Low', 'Lowest'].map(p => ({ value: p, label: p }))
          ]}
        />
        <Select
          value={sort}
          onChange={setSort}
          placeholder="Date"
          options={[
            { value: 'desc', label: 'Newest First' },
            { value: 'asc', label: 'Oldest First' },
          ]}
          style={{ minWidth: 140 }}
        />
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t.id}>
                  <td className="mono">{t.jira_key || '—'}</td>
                  <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.summary}</td>
                  <td><Badge label={t.priority} /></td>
                  <td className="dim" style={{ whiteSpace: 'nowrap' }}>{t.issue_type || '—'}</td>
                  <td><Badge label={t.status} /></td>
                  <td className="dim" style={{ whiteSpace: 'nowrap' }}>{t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {t.priority ? (
                        <Select
                          value={t.priority}
                          onChange={val => handlePriorityChange(t.id, val)}
                          options={PRIORITY_OPTIONS}
                          style={{ minWidth: 110, opacity: updatingId === t.id ? 0.5 : 1, pointerEvents: updatingId === t.id ? 'none' : 'auto' }}
                        />
                      ) : '—'}
                      {t.jira_key && (
                        <button onClick={() => openJira(t.id)} className="nm-btn-sm" aria-label={`Open ${t.jira_key} in Jira`}>
                          <ExternalLink size={11} /> Open
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {(tickets.length === PAGE_SIZE || page > 0) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button className="nm-btn-sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
            <ChevronLeft size={13} /> Prev
          </button>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 60, textAlign: 'center' }}>
            Page {page + 1}
          </span>
          <button className="nm-btn-sm" onClick={() => setPage(p => p + 1)} disabled={tickets.length < PAGE_SIZE}>
            Next <ChevronRight size={13} />
          </button>
        </div>
      )}

      <Toast toasts={toasts} dismiss={dismiss} />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
