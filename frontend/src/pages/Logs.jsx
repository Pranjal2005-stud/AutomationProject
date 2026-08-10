import { useEffect, useState } from 'react'
import { getLogs } from '../api/services'
import Badge from '../components/Badge'

export default function Logs() {
  const [logs, setLogs] = useState([])

  const load = () => getLogs(200).then(r => setLogs(r.data))
  useEffect(() => { load() }, [])

  return (
    <div className="p-6 space-y-4" style={{ background: 'var(--background)', minHeight: '100%' }}>
      <div className="flex items-center justify-between">
        <h2 className="skeuo-page-title">Processing Logs</h2>
        <button onClick={load} className="skeuo-btn" aria-label="Refresh logs">
          Refresh
        </button>
      </div>
      <div className="skeuo-panel overflow-hidden">
        <table className="skeuo-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Module</th>
              <th>Action</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id}>
                <td className="dim whitespace-nowrap">{l.timestamp ? new Date(l.timestamp).toLocaleString() : '—'}</td>
                <td>{l.module}</td>
                <td className="dim">{l.action}</td>
                <td>
                  <Badge label={
                    l.status === 'success' ? 'Processed'
                    : l.status === 'failed' ? 'Jira_Failed'
                    : 'Processing'
                  } />
                </td>
                <td className="dim">{l.duration_ms != null ? `${l.duration_ms}ms` : '—'}</td>
                <td className="dim max-w-xs truncate">{l.details || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
