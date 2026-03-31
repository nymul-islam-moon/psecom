import { NavLink } from 'react-router-dom'
import { useTheme } from '../utils/theme'

const links = [
  { to: '/',             label: 'Dashboard',      icon: '⬡' },
  { to: '/transactions', label: 'Transactions',   icon: '⇄' },
  { to: '/accounts',     label: 'Accounts',       icon: '◈' },
  { to: '/analytics',    label: 'Analytics',      icon: '◉' },
  { to: '/convert',      label: 'Convert',        icon: '⇌' },
  { to: '/deleted',      label: 'Deleted',        icon: '○' },
  { to: '/discord',      label: 'Discord Schema', icon: '◇' },
]

export default function Sidebar() {
  const { theme, toggle } = useTheme()
  const isLight = theme === 'light'

  return (
    <aside style={{
      width: 230,
      background: 'var(--bg-surface)',
      minHeight: '100vh',
      padding: '20px 10px',
      borderRight: '1px solid var(--border)',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Logo */}
      <div style={{ padding: '8px 14px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, boxShadow: '0 0 16px rgba(99,102,241,0.4)', color: '#fff',
          }}>৳</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Economy</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Personal</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 14px',
              borderRadius: 10,
              color: isActive ? '#6366f1' : 'var(--text-secondary)',
              background: isActive ? 'var(--accent-subtle)' : 'transparent',
              fontWeight: isActive ? 600 : 400,
              fontSize: 13.5,
              border: isActive ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
              transition: 'all 0.15s',
            })}
          >
            <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 14px 4px', borderTop: '1px solid var(--border)' }}>
        {/* Theme toggle */}
        <button
          onClick={toggle}
          style={{
            width: '100%',
            justifyContent: 'center',
            marginBottom: 12,
            background: 'var(--bg-overlay)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            borderRadius: 10,
            padding: '8px 14px',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s',
          }}
          title="Toggle light/dark mode"
        >
          <span style={{ fontSize: 15 }}>{isLight ? '🌙' : '☀️'}</span>
          {isLight ? 'Dark Mode' : 'Light Mode'}
        </button>

        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', flexShrink: 0 }} />
            Event-sourced ledger
          </div>
          <div style={{ marginTop: 2, paddingLeft: 12 }}>Discord · MySQL · React</div>
        </div>
      </div>
    </aside>
  )
}
