export default function StatCard({ title, value, icon: Icon, iconColor, iconBg, change, changeLabel }) {
  const changeDir = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
  const changeSign = change > 0 ? '↑' : change < 0 ? '↓' : ''

  return (
    <div className="nm-stat-card" role="region" aria-label={title}>
      <div
        className="nm-stat-icon"
        aria-hidden="true"
        style={{
          color: iconColor || 'var(--primary)',
          background: iconBg || 'var(--surface-inset)',
          borderColor: iconColor ? `${iconColor}22` : 'var(--border)',
        }}
      >
        <Icon size={17} />
      </div>
      <p className="nm-stat-label">{title}</p>
      <p className="nm-stat-value">{value ?? '—'}</p>
      {changeLabel && (
        <p className={`nm-stat-change ${changeDir}`}>
          {changeSign} {changeLabel}
        </p>
      )}
    </div>
  )
}
