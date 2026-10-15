import { useState, useCallback } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

const ICONS = {
  success: <CheckCircle size={16} className="toast-icon" />,
  error:   <XCircle    size={16} className="toast-icon" />,
  info:    <Info       size={16} className="toast-icon" />,
}

let _id = 0

function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = type === 'error' ? 320 : type === 'success' ? 880 : 660
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.35)
  } catch { /* ignore if audio not available */ }
}

// Named sounds for specific events
export function playNamedSound(name) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const gain = ctx.createGain()
    gain.connect(ctx.destination)

    if (name === 'new_email') {
      // Two ascending soft pings — like a mail notification
      [440, 554].forEach((freq, i) => {
        const osc = ctx.createOscillator()
        osc.connect(gain)
        osc.type = 'sine'
        osc.frequency.value = freq
        const t = ctx.currentTime + i * 0.18
        gain.gain.setValueAtTime(0.14, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28)
        osc.start(t)
        osc.stop(t + 0.28)
      })
    } else if (name === 'ticket_created') {
      // Three quick rising tones — like a task completion chime
      [523, 659, 784].forEach((freq, i) => {
        const osc = ctx.createOscillator()
        osc.connect(gain)
        osc.type = 'triangle'
        osc.frequency.value = freq
        const t = ctx.currentTime + i * 0.13
        gain.gain.setValueAtTime(0.16, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
        osc.start(t)
        osc.stop(t + 0.22)
      })
    }
  } catch { /* ignore */ }
}

export function useToast() {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) =>
    setToasts(t => t.filter(x => x.id !== id)), [])

  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++_id
    playSound(type)
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
