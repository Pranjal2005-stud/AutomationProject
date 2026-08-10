import { useEffect, useState } from 'react'
import { getEmails, createTicketForEmail, retryEmail } from '../api/services'
import Badge from '../components/Badge'

export default function Emails() {
  const [emails, setEmails] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [skip, setSkip] = useState(0)
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
      alert(`Ticket created: ${r.data.jira_key}`)
      load()
    } catch (e) {
      alert('Failed: ' + (e.response?.data?.detail || e.message))
    }
  }

  const handleRetry = async (id) => {
    await retryEmail(id)
    load()
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Emails</h2>

      <div className="flex gap-3">
        <input
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search subject, sender..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
        />
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
          value={status}
          onChange={e => { setStatus(e.target.value); setSkip(0) }}
        >
          <option value="">All Statuses</option>
          {['Pending', 'Processing', 'Processed', 'LLM_Failed', 'Jira_Failed'].map(s => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button onClick={load} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          Search
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-3">Sender</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Jira Key</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {emails.map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-700">{e.sender_email}</td>
                <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{e.subject || '—'}</td>
                <td className="px-4 py-3">{e.priority ? <Badge label={e.priority} /> : '—'}</td>
                <td className="px-4 py-3"><Badge label={e.status} /></td>
                <td className="px-4 py-3 font-mono text-blue-600">{e.jira_issue_key || '—'}</td>
                <td className="px-4 py-3 flex gap-2">
                  {!e.ticket_created && (
                    <button onClick={() => handleTicket(e.id)} className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200">
                      Create Ticket
                    </button>
                  )}
                  {(e.status === 'LLM_Failed' || e.status === 'Jira_Failed') && (
                    <button onClick={() => handleRetry(e.id)} className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200">
                      Retry
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <button disabled={skip === 0} onClick={() => setSkip(s => Math.max(0, s - limit))} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40">
          ← Prev
        </button>
        <button onClick={() => setSkip(s => s + limit)} className="px-3 py-1.5 text-sm border rounded-lg">
          Next →
        </button>
      </div>
    </div>
  )
}
