export default function StatCard({ title, value, icon: Icon }) {
  return (
    <div className="skeuo-stat-card" role="region" aria-label={title}>
      <div className="skeuo-icon-wrap" aria-hidden="true">
        <Icon size={20} />
      </div>
      <div>
        <p className="skeuo-stat-label">{title}</p>
        <p className="skeuo-stat-value">{value ?? '—'}</p>
      </div>
    </div>
  )
}
