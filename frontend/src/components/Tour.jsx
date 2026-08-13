import { useState, useEffect, useCallback, useRef } from 'react'
import { X, ChevronRight, ChevronLeft, Zap } from 'lucide-react'

const TOUR_KEY = 'ai_ops_tour_done'

const STEPS = [
  {
    id: 'sidebar-logo',
    title: 'Welcome to AI Operations',
    description: 'Your intelligent workplace automation hub. Emails are read, tickets are created, and meetings are scheduled — all automatically.',
    position: 'right',
  },
  {
    id: 'nav-dashboard',
    title: 'Dashboard',
    description: 'Get a real-time overview of your automation pipeline — email stats, ticket counts, meeting activity, and live charts.',
    position: 'right',
  },
  {
    id: 'nav-emails',
    title: 'Emails',
    description: 'Browse all incoming emails processed by the system. Search, filter by status, manually create tickets, or retry failed ones.',
    position: 'right',
  },
  {
    id: 'nav-tickets',
    title: 'Jira Tickets',
    description: 'View all Jira issues auto-created from emails by the LLM. Open them directly in Jira with one click.',
    position: 'right',
  },
  {
    id: 'nav-meetings',
    title: 'Meetings',
    description: 'Schedule Google Calendar meetings with automatic free-slot detection. Participants receive invites instantly.',
    position: 'right',
  },
  {
    id: 'nav-logs',
    title: 'Processing Logs',
    description: 'Full audit trail of every pipeline event — module, action, status, duration, and details for debugging.',
    position: 'right',
  },
  {
    id: 'nav-settings',
    title: 'Settings',
    description: 'Check the status of all your API credentials — Groq, Jira, Gmail, and Google Calendar — at a glance.',
    position: 'right',
  },
  {
    id: 'tour-poll-btn',
    title: 'Poll Gmail',
    description: 'Trigger an immediate Gmail poll. The scheduler runs every 2 minutes automatically, but you can force it anytime here.',
    position: 'bottom',
  },
  {
    id: 'tour-stat-cards',
    title: 'Live Statistics',
    description: 'Key metrics updated after every poll — total emails, pending queue, processed count, tickets, meetings, and today\'s activity.',
    position: 'bottom',
  },
  {
    id: 'tour-charts',
    title: 'Charts',
    description: 'Visualize email volume over time and ticket distribution by priority to spot trends and bottlenecks.',
    position: 'top',
  },
]

function getRect(id) {
  const el = document.getElementById(id)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right }
}

const PAD = 10
const POP_W = 320

function calcPopover(rect, position, winW, winH) {
  if (!rect) return { top: winH / 2 - 100, left: winW / 2 - POP_W / 2 }
  let top, left

  if (position === 'right') {
    top = rect.top + rect.height / 2 - 80
    left = rect.right + PAD + 8
    if (left + POP_W > winW - 8) { left = rect.left - POP_W - PAD - 8; }
  } else if (position === 'bottom') {
    top = rect.bottom + PAD + 8
    left = rect.left + rect.width / 2 - POP_W / 2
  } else {
    top = rect.top - PAD - 8 - 180
    left = rect.left + rect.width / 2 - POP_W / 2
  }

  top = Math.max(8, Math.min(top, winH - 200))
  left = Math.max(8, Math.min(left, winW - POP_W - 8))
  return { top, left }
}

export default function Tour({ onDone }) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState(null)
  const [popPos, setPopPos] = useState({ top: 0, left: 0 })
  const [visible, setVisible] = useState(false)
  const rafRef = useRef(null)

  const current = STEPS[step]

  const measure = useCallback(() => {
    const r = getRect(current.id)
    setRect(r)
    const pos = calcPopover(r, current.position, window.innerWidth, window.innerHeight)
    setPopPos(pos)
  }, [current])

  useEffect(() => {
    // Small delay so DOM is ready
    const t = setTimeout(() => {
      measure()
      setVisible(true)
    }, 80)
    return () => clearTimeout(t)
  }, [measure])

  // Keep rect in sync on scroll/resize
  useEffect(() => {
    const tick = () => { measure(); rafRef.current = requestAnimationFrame(tick) }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [measure])

  const finish = useCallback(() => {
    localStorage.setItem(TOUR_KEY, '1')
    setVisible(false)
    setTimeout(onDone, 200)
  }, [onDone])

  const next = () => {
    if (step < STEPS.length - 1) { setVisible(false); setTimeout(() => { setStep(s => s + 1); setVisible(true) }, 120) }
    else finish()
  }

  const prev = () => {
    if (step > 0) { setVisible(false); setTimeout(() => { setStep(s => s - 1); setVisible(true) }, 120) }
  }

  const spotPad = 8
  const spot = rect
    ? { top: rect.top - spotPad, left: rect.left - spotPad, width: rect.width + spotPad * 2, height: rect.height + spotPad * 2 }
    : null

  return (
    <>
      {/* Overlay with cutout */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9000, pointerEvents: 'auto' }}
        onClick={finish}
        aria-hidden="true"
      >
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <mask id="tour-mask">
              <rect width="100%" height="100%" fill="white" />
              {spot && (
                <rect
                  x={spot.left} y={spot.top}
                  width={spot.width} height={spot.height}
                  rx={12} ry={12}
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%" height="100%"
            fill="rgba(10,14,20,0.72)"
            mask="url(#tour-mask)"
          />
        </svg>

        {/* Spotlight border glow */}
        {spot && (
          <div
            style={{
              position: 'absolute',
              top: spot.top - 1, left: spot.left - 1,
              width: spot.width + 2, height: spot.height + 2,
              borderRadius: 13,
              border: '1.5px solid rgba(253,99,15,0.7)',
              boxShadow: '0 0 0 3px rgba(253,99,15,0.15), 0 0 24px rgba(253,99,15,0.25)',
              pointerEvents: 'none',
              transition: 'all 200ms ease',
            }}
          />
        )}
      </div>

      {/* Popover */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: popPos.top,
          left: popPos.left,
          width: POP_W,
          zIndex: 9001,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.97)',
          transition: 'opacity 180ms ease, transform 180ms ease',
          background: 'rgba(35,43,55,0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(253,99,15,0.25)',
          borderRadius: 16,
          boxShadow: '0 0 0 1px rgba(253,99,15,0.1), 0 8px 40px rgba(0,0,0,0.6), 0 0 30px rgba(253,99,15,0.08)',
          overflow: 'hidden',
        }}
      >
        {/* Top accent bar */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, #FD630F, #E6B428, #43AB92)' }} />

        <div style={{ padding: '18px 20px 16px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 7,
                background: 'linear-gradient(135deg,#FD630F,#e8570a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(253,99,15,0.4)', flexShrink: 0,
              }}>
                <Zap size={13} color="#fff" />
              </div>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                Tour {step + 1} / {STEPS.length}
              </span>
            </div>
            <button
              onClick={finish}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, lineHeight: 1, borderRadius: 5, transition: 'color 150ms' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              aria-label="Close tour"
            >
              <X size={15} />
            </button>
          </div>

          {/* Title */}
          <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 7, letterSpacing: '-0.01em' }}>
            {current.title}
          </p>

          {/* Description */}
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 18 }}>
            {current.description}
          </p>

          {/* Progress dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 16 }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  height: 4,
                  borderRadius: 2,
                  background: i === step ? '#FD630F' : i < step ? 'rgba(253,99,15,0.35)' : 'rgba(255,255,255,0.1)',
                  width: i === step ? 20 : 8,
                  transition: 'all 200ms ease',
                }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button
                onClick={prev}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '7px 14px', borderRadius: 9,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 500,
                  cursor: 'pointer', transition: 'background 150ms, color 150ms', fontFamily: 'inherit',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                <ChevronLeft size={14} /> Back
              </button>
            )}
            <button
              onClick={next}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '7px 14px', borderRadius: 9,
                background: '#FD630F', border: 'none',
                color: '#fff', fontSize: '0.8125rem', fontWeight: 600,
                cursor: 'pointer', transition: 'background 150ms, transform 100ms', fontFamily: 'inherit',
                boxShadow: '0 2px 12px rgba(253,99,15,0.35)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#e8570a'}
              onMouseLeave={e => e.currentTarget.style.background = '#FD630F'}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {step === STEPS.length - 1 ? 'Get Started' : 'Next'} <ChevronRight size={14} />
            </button>
          </div>

          {/* Skip */}
          {step < STEPS.length - 1 && (
            <button
              onClick={finish}
              style={{
                display: 'block', width: '100%', marginTop: 10, background: 'none', border: 'none',
                color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer',
                textAlign: 'center', fontFamily: 'inherit', transition: 'color 150ms',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              Skip tour
            </button>
          )}
        </div>
      </div>
    </>
  )
}

export function useTour() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) {
      const t = setTimeout(() => setActive(true), 800)
      return () => clearTimeout(t)
    }
  }, [])

  const startTour = () => { localStorage.removeItem(TOUR_KEY); setActive(true) }
  const endTour   = () => setActive(false)

  return { active, startTour, endTour }
}
