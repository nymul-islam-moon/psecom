import { useEffect } from 'react'

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [message])

  if (!message) return null

  const styles = {
    success: { bg: 'rgba(16,185,129,0.12)', color: '#6ee7b7', border: 'rgba(16,185,129,0.35)', icon: '✓' },
    error:   { bg: 'rgba(239,68,68,0.12)',  color: '#fca5a5', border: 'rgba(239,68,68,0.35)',  icon: '✕' },
  }
  const s = styles[type] || styles.success

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 2000,
      background: '#161b27',
      border: `1px solid ${s.border}`,
      borderRadius: 12,
      padding: '12px 18px',
      fontSize: 13.5,
      fontWeight: 500,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', gap: 10,
      animation: 'slideIn 0.25s cubic-bezier(0.175,0.885,0.32,1.275)',
      maxWidth: 360,
      color: '#f0f4ff',
    }}>
      <span style={{
        width: 24, height: 24, borderRadius: 6,
        background: s.bg, color: s.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, flexShrink: 0,
        border: `1px solid ${s.border}`,
      }}>{s.icon}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', color: '#4a556b', padding: '0 0 0 6px', fontSize: 14, cursor: 'pointer', flexShrink: 0 }}
      >✕</button>
    </div>
  )
}
