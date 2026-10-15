const map = {
  Pending:    'badge-pending',
  Processing: 'badge-processing',
  Processed:  'badge-processed',
  LLM_Failed: 'badge-failed',
  Jira_Failed:'badge-failed',
  Scheduled:  'badge-scheduled',
  Completed:  'badge-completed',
  Open:       'badge-open',
  High:       'badge-high',
  Highest:    'badge-high',
  Medium:     'badge-medium',
  Low:        'badge-low',
  Lowest:     'badge-lowest',
}

const display = {
  LLM_Failed:  'LLM Failed',
  Jira_Failed: 'Jira Failed',
}

export default function Badge({ label }) {
  return (
    <span className={`nm-badge ${map[label] || 'badge-gray'}`}>
      {display[label] || label}
    </span>
  )
}
