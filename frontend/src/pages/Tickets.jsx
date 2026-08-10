import { useEffect, useState } from 'react'
import { getTickets, getTicketJiraUrl } from '../api/services'
import Badge from '../components/Badge'

export default function Tickets() {
  const [tickets, setTickets] = useState([])

  useEffect(() => {
    getTickets().then(r => setTickets(r.data))
  }, [])

  const openJira = async (id) => {
    try {
      const r = await getTicketJiraUrl(id)
      window.open(r.data.url, '_blank')
    } catch {
      alert('Could not get Jira URL')
    }
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Jira Tickets</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-3">Jira Key</th>
              <th className="px-4 py-3">Summary</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tickets.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-semibold text-blue-600">{t.jira_key || '—'}</td>
                <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{t.summary}</td>
                <td className="px-4 py-3"><Badge label={t.priority} /></td>
                <td className="px-4 py-3 text-gray-600">{t.issue_type}</td>
                <td className="px-4 py-3"><Badge label={t.status} /></td>
                <td className="px-4 py-3 text-gray-500">{t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3">
                  {t.jira_key && (
                    <button onClick={() => openJira(t.id)} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                      Open in Jira
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
