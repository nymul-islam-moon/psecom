import { useEffect } from 'react'

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [message])

  if (!message) return null

  const colors = {
    success: { bg: '#14532d', color: '#86efac', border: '#166534' },
    error:   { bg: '#450a0a', color: '#fca5a5', border: '#7f1d1d' },
  }
  const c = colors[type] || colors.success

  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 2000,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      borderRadius: 10, padding: '14px 20px', fontSize: 14, fontWeight: 500,
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', gap: 10,
      animation: 'slideIn 0.2s ease',
    }}>
      <span>{type === 'success' ? '✅' : '❌'}</span>
      {message}
      <span onClick={onClose} style={{ marginLeft: 8, cursor: 'pointer', opacity: 0.7 }}>✕</span>
    </div>
  )
}
