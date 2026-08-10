import { useEffect, useState } from 'react'
import { getLogs } from '../api/services'
import Badge from '../components/Badge'

export default function Logs() {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    getLogs(200).then(r => setLogs(r.data))
  }, [])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Processing Logs</h2>
        <button onClick={() => getLogs(200).then(r => setLogs(r.data))} className="text-sm px-3 py-1.5 border rounded-lg hover:bg-gray-50">
          Refresh
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.map(l => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{l.timestamp ? new Date(l.timestamp).toLocaleString() : '—'}</td>
                <td className="px-4 py-3 font-medium text-gray-700">{l.module}</td>
                <td className="px-4 py-3 text-gray-600">{l.action}</td>
                <td className="px-4 py-3"><Badge label={l.status === 'success' ? 'Processed' : l.status === 'failed' ? 'Jira_Failed' : 'Processing'} /></td>
                <td className="px-4 py-3 text-gray-500">{l.duration_ms != null ? `${l.duration_ms}ms` : '—'}</td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{l.details || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
