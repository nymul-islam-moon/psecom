import { useEffect, useState } from 'react'
import { getAccounts } from '../services/api'
import { formatDate } from '../utils/format'

export default function Accounts() {
  const [accounts, setAccounts] = useState([])

  useEffect(() => {
    getAccounts().then(r => setAccounts(r.data))
  }, [])

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Accounts</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {accounts.map(a => (
          <div key={a.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{a.name}</div>
              <span className={`badge badge-${a.type}`}>{a.type}</span>
            </div>
            <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>
              Currency: <span style={{ color: '#e2e8f0' }}>{a.currency}</span>
            </div>
            {a.parent_id && (
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>
                Parent: <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{a.parent_id.slice(0, 8)}…</span>
              </div>
            )}
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>Created {formatDate(a.created_at)}</div>
          </div>
        ))}
        {accounts.length === 0 && (
          <div style={{ color: '#64748b', padding: 24 }}>No accounts yet. Add one via Discord or the Events API.</div>
        )}
      </div>
    </div>
  )
}
