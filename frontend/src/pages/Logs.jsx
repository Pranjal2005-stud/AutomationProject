import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { getLogs } from '../api/services'
import Badge from '../components/Badge'

export default function Logs() {
  const [logs, setLogs] = useState([])

  const load = () => getLogs(200).then(r => setLogs(r.data))
  useEffect(() => { load() }, [])

  return (
    <div className="nm-page">
      <div className="nm-page-header">
        <div>
          <h1 className="nm-page-title">Processing Logs</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>System activity and pipeline events</p>
        </div>
        <button onClick={load} className="nm-btn-ghost" aria-label="Refresh logs">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="nm-card">
        <div className="nm-table-wrap">
          <table className="nm-table">
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
                  <td className="dim" style={{ whiteSpace: 'nowrap' }}>
                    {l.timestamp ? new Date(l.timestamp).toLocaleString() : '—'}
                  </td>
                  <td style={{ color: 'var(--text-primary)' }}>{l.module}</td>
                  <td className="dim">{l.action}</td>
                  <td>
                    <Badge label={
                      l.status === 'success' ? 'Processed'
                      : l.status === 'failed' ? 'Jira_Failed'
                      : 'Processing'
                    } />
                  </td>
                  <td className="dim">{l.duration_ms != null ? `${l.duration_ms}ms` : '—'}</td>
                  <td className="dim" style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.details || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
