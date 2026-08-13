import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export default function Select({ value, onChange, options, placeholder = 'Select…', style }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = options.find(o => (o.value ?? o) === value)
  const label = selected ? (selected.label ?? selected) : placeholder

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0, ...style }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          padding: '9px 12px 9px 13px',
          borderRadius: 10,
          background: 'var(--surface-inset)',
          border: `1px solid ${open ? 'rgba(253,99,15,0.5)' : 'var(--border)'}`,
          boxShadow: open
            ? 'var(--nm-inset), 0 0 0 3px rgba(253,99,15,0.1)'
            : 'var(--nm-inset)',
          color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          fontSize: '0.8125rem', fontWeight: 400,
          cursor: 'pointer', fontFamily: 'inherit',
          whiteSpace: 'nowrap', minWidth: 140,
          transition: 'border-color 180ms ease, box-shadow 180ms ease',
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{label}</span>
        <ChevronDown
          size={13}
          style={{
            color: 'var(--text-muted)', flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 180ms ease',
          }}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0,
            minWidth: '100%',
            background: 'rgba(35,43,55,0.97)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(253,99,15,0.2)',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(253,99,15,0.08)',
            zIndex: 200,
            overflow: 'hidden',
            animation: 'selectIn 150ms ease',
          }}
        >
          {options.map((opt, i) => {
            const val = opt.value ?? opt
            const lbl = opt.label ?? opt
            const isSelected = val === value
            return (
              <div
                key={i}
                role="option"
                aria-selected={isSelected}
                onClick={() => { onChange(val); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 14px',
                  fontSize: '0.8125rem', fontWeight: isSelected ? 500 : 400,
                  color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                  background: isSelected ? 'rgba(253,99,15,0.1)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 120ms ease, color 120ms ease',
                  borderBottom: i < options.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }
                }}
              >
                <span>{lbl}</span>
                {isSelected && <Check size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes selectIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
