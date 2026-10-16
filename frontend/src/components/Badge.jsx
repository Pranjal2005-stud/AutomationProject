const map = {
  // Email statuses
  Pending:      'badge-pending',
  Processing:   'badge-processing',
  Processed:    'badge-processed',
  LLM_Failed:   'badge-failed',
  Jira_Failed:  'badge-failed',
  // Meeting statuses
  Scheduled:    'badge-scheduled',
  Completed:    'badge-completed',
  Cancelled:    'badge-cancelled',
  // Jira ticket statuses
  Open:         'badge-open',
  'To Do':      'badge-todo',
  'In Progress':'badge-inprogress',
  'In Review':  'badge-inreview',
  Done:         'badge-done',
  Resolved:     'badge-resolved',
  Closed:       'badge-closed',
  Blocked:      'badge-blocked',
  "Won't Fix":  'badge-wontfix',
  Duplicate:    'badge-duplicate',
  // Priority
  Highest:      'badge-high',
  High:         'badge-high',
  Medium:       'badge-medium',
  Low:          'badge-low',
  Lowest:       'badge-lowest',
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
