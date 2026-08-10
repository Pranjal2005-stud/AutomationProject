const map = {
  Pending:    'badge-yellow',
  Processing: 'badge-blue',
  Processed:  'badge-green',
  LLM_Failed: 'badge-red',
  Jira_Failed:'badge-red',
  Scheduled:  'badge-blue',
  Completed:  'badge-green',
  Open:       'badge-yellow',
  High:       'badge-red',
  Highest:    'badge-red',
  Medium:     'badge-yellow',
  Low:        'badge-green',
  Lowest:     'badge-gray',
}

export default function Badge({ label }) {
  return (
    <span className={`skeuo-badge ${map[label] || 'badge-gray'}`}>
      {label}
    </span>
  )
}
