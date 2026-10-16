import { useEffect, useState } from 'react'
import { Search, ChevronLeft, ChevronRight, Trash2, RefreshCw } from 'lucide-react'
import { getEmails, createTicketForEmail, retryEmail, deleteEmail, pollGmail } from '../api/services'
import Badge from '../components/Badge'
import Select from '../components/Select'
import Toast, { useToast } from '../components/Toast'
import { playNamedSound } from '../components/Toast'

export default function Emails() {
  const [emails, setEmails] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [skip, setSkip] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [searched, setSearched] = useState(false)
  const [polling, setPolling] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const { toasts, toast, dismiss } = useToast()
  const limit = 20

  const load = (resetSkip = false) => {
    const effectiveSkip = resetSkip ? 0 : skip
    if (resetSkip) setSkip(0)
    const params = { skip: effectiveSkip, limit }
    if (search) params.search = search
    if (status) params.status = status
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    getEmails(params).then(r => {
      setEmails(r.data)
      setHasMore(r.data.length === limit)
      setSearched(true)
    })
  }

  useEffect(() => { load() }, [skip, status, dateFrom, dateTo]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePoll = async () => {
    setPolling(true)
    try {
      const r = await pollGmail()
      const { fetched = 0, processed = 0 } = r.data
      if (fetched > 0) playNamedSound('new_email')
      if (processed > 0) setTimeout(() => playNamedSound('ticket_created'), 600)
      toast(`Fetched ${fetched} emails, created ${processed} tickets`, 'success')
      load(true)
    } catch (e) {
      toast('Poll failed: ' + (e.response?.data?.detail || e.message), 'error')
    } finally { setPolling(false) }
  }

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

  const handleDelete = async () => {
    if (!deleteConfirmId) return
    setDeleting(true)
    try {
      await deleteEmail(deleteConfirmId)
      toast('Email deleted', 'success')
      setDeleteConfirmId(null)
      load()
    } catch (e) {
      toast('Delete failed: ' + (e.response?.data?.detail || e.message), 'error')
    } finally { setDeleting(false) }
  }

  return (
    <div className="nm-page">
      <div className="nm-page-header">
        <div>
          <h1 className="nm-page-title">Emails</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>Incoming email processing queue</p>
        </div>
        <button onClick={handlePoll} disabled={polling} className="nm-btn" aria-label="Fetch new emails">
          <RefreshCw size={13} style={{ animation: polling ? 'spin 1s linear infinite' : 'none' }} />
          {polling ? 'Fetching…' : 'Fetch Emails'}
        </button>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <div className="nm-filter-bar" style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 280 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            className="nm-input"
            style={{ paddingLeft: 32 }}
            placeholder="Search subject, sender…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            aria-label="Search emails"
          />
        </div>
        <Select
          value={status}
          onChange={val => { setStatus(val); setSkip(0) }}
          placeholder="All Statuses"
          options={[
            { value: '', label: 'All Statuses' },
            ...['Pending', 'Processing', 'Processed', 'LLM_Failed', 'Jira_Failed'].map(s => ({ value: s, label: s }))
          ]}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="date"
            className="nm-input"
            style={{ width: 140 }}
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setSkip(0) }}
            aria-label="From date"
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>to</span>
          <input
            type="date"
            className="nm-input"
            style={{ width: 140 }}
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setSkip(0) }}
            aria-label="To date"
          />
          {(dateFrom || dateTo) && (
            <button
              className="nm-btn-ghost"
              style={{ padding: '6px 10px', fontSize: '0.6875rem' }}
              onClick={() => { setDateFrom(''); setDateTo(''); setSkip(0) }}
              aria-label="Clear date filter"
            >
              Clear
            </button>
          )}
        </div>
        <button onClick={() => load(true)} className="nm-btn" aria-label="Run search">Search</button>
      </div>

      <div className="nm-card" style={{ marginBottom: 16, overflow: 'visible' }}>
        <div className="nm-table-wrap">
          <table className="nm-table">
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
              {emails.length > 0 ? emails.map(e => (
                <tr key={e.id}>
                  <td className="dim">{e.sender_email}</td>
                  <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.subject || '—'}</td>
                  <td>{e.priority ? <Badge label={e.priority} /> : '—'}</td>
                  <td><Badge label={e.status} /></td>
                  <td className="mono">{e.jira_issue_key || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {!e.ticket_created && (
                        <button onClick={() => handleTicket(e.id)} className="nm-btn-sm primary" aria-label={`Create ticket for email ${e.id}`}>
                          Create Ticket
                        </button>
                      )}
                      {(e.status === 'LLM_Failed' || e.status === 'Jira_Failed') && (
                        <button onClick={() => handleRetry(e.id)} className="nm-btn-sm" aria-label={`Retry email ${e.id}`}>
                          Retry
                        </button>
                      )}
                      <button onClick={() => setDeleteConfirmId(e.id)} className="nm-btn-sm" style={{ color: 'var(--error)', borderColor: 'rgba(224,82,82,0.3)' }} aria-label={`Delete email ${e.id}`}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: 10 }}>
                      <Search size={32} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                      <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
                        {searched ? 'No results found' : 'No emails yet'}
                      </p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
                        {searched && (search || status)
                          ? `No emails match${search ? ` "${search}"` : ''}${status ? ` with status "${status}"` : ''}. Try adjusting your filters.`
                          : 'Emails will appear here once Gmail is polled.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button disabled={skip === 0} onClick={() => setSkip(s => Math.max(0, s - limit))} className="nm-btn-ghost" aria-label="Previous page">
          <ChevronLeft size={14} /> Prev
        </button>
        <button disabled={!hasMore} onClick={() => setSkip(s => s + limit)} className="nm-btn-ghost" aria-label="Next page">
          Next <ChevronRight size={14} />
        </button>
      </div>

      {deleteConfirmId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="nm-card" style={{ maxWidth: 380, width: '90%', padding: 24 }}>
            <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: 8 }}>Delete this email?</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
              This will permanently remove the email from the system. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="nm-btn-ghost" style={{ padding: '7px 16px' }} onClick={() => setDeleteConfirmId(null)} disabled={deleting}>Cancel</button>
              <button className="nm-btn" style={{ padding: '7px 16px', background: 'var(--error)' }} onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toasts={toasts} dismiss={dismiss} />
    </div>
  )
}
