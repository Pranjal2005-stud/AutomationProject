const map = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Processing: 'bg-blue-100 text-blue-700',
  Processed: 'bg-green-100 text-green-700',
  LLM_Failed: 'bg-red-100 text-red-700',
  Jira_Failed: 'bg-red-100 text-red-700',
  Scheduled: 'bg-blue-100 text-blue-700',
  Completed: 'bg-green-100 text-green-700',
  Open: 'bg-yellow-100 text-yellow-700',
  High: 'bg-red-100 text-red-700',
  Highest: 'bg-red-200 text-red-800',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low: 'bg-green-100 text-green-700',
  Lowest: 'bg-gray-100 text-gray-600',
}

export default function Badge({ label }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${map[label] || 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  )
}
