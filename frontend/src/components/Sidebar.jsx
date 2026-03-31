import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/transactions', label: 'Transactions', icon: '💸' },
  { to: '/accounts', label: 'Accounts', icon: '🏦' },
  { to: '/analytics', label: 'Analytics', icon: '📈' },
  { to: '/deleted', label: 'Deleted', icon: '🗑️' },
]

export default function Sidebar() {
  return (
    <aside style={{ width: 220, background: '#1e293b', minHeight: '100vh', padding: '24px 12px', borderRight: '1px solid #334155', flexShrink: 0 }}>
      <div style={{ fontSize: 18, fontWeight: 700, padding: '0 12px 24px', color: '#a5b4fc' }}>
        💰 Personal Economy
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 8,
              color: isActive ? '#a5b4fc' : '#94a3b8',
              background: isActive ? '#312e81' : 'transparent',
              fontWeight: isActive ? 600 : 400,
              fontSize: 14,
            })}
          >
            <span>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
