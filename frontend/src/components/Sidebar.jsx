import { NavLink } from 'react-router-dom'

const links = [
  { to: '/',             label: 'Dashboard',      icon: '⬡',  desc: 'Overview' },
  { to: '/transactions', label: 'Transactions',   icon: '⇄',  desc: 'Money flow' },
  { to: '/accounts',     label: 'Accounts',       icon: '◈',  desc: 'Your wallets' },
  { to: '/analytics',    label: 'Analytics',      icon: '◉',  desc: 'Insights' },
  { to: '/deleted',      label: 'Deleted',        icon: '○',  desc: 'Soft deleted' },
  { to: '/discord',      label: 'Discord Schema', icon: '◇',  desc: 'Event helper' },
]

export default function Sidebar() {
  return (
    <aside style={{
      width: 230,
      background: '#0d1117',
      minHeight: '100vh',
      padding: '20px 10px',
      borderRight: '1px solid #21293d',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Logo */}
      <div style={{ padding: '8px 14px 28px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, boxShadow: '0 0 16px rgba(99,102,241,0.4)',
          }}>৳</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f4ff', letterSpacing: '-0.01em' }}>Economy</div>
            <div style={{ fontSize: 10, color: '#4a556b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Personal</div>
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
              color: isActive ? '#a5b4fc' : '#8892a4',
              background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
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
      <div style={{ padding: '16px 14px 4px', borderTop: '1px solid #21293d' }}>
        <div style={{ fontSize: 11, color: '#4a556b', lineHeight: 1.6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
            Event-sourced ledger
          </div>
          <div style={{ marginTop: 2, paddingLeft: 12 }}>Discord · MySQL · React</div>
        </div>
      </div>
    </aside>
  )
}
