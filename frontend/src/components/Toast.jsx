import { useState, useCallback } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

const ICONS = {
  success: <CheckCircle size={16} className="toast-icon" />,
  error:   <XCircle    size={16} className="toast-icon" />,
  info:    <Info       size={16} className="toast-icon" />,
}

let _id = 0

export function useToast() {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) =>
    setToasts(t => t.filter(x => x.id !== id)), [])

  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++_id
    setToasts(t => [...t, { id, message, type }])
    if (duration > 0) setTimeout(() => dismiss(id), duration)
  }, [dismiss])

  return { toasts, toast, dismiss }
}

export default function Toast({ toasts, dismiss }) {
  if (!toasts.length) return null
  return (
    <div className="nm-toast-container" role="region" aria-live="polite" aria-label="Notifications">
      {toasts.map(({ id, message, type }) => (
        <div key={id} className={`nm-toast ${type}`} role="alert">
          {ICONS[type]}
          <span style={{ flex: 1 }}>{message}</span>
          <button className="toast-close" onClick={() => dismiss(id)} aria-label="Dismiss notification">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
