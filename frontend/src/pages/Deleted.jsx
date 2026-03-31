import { useEffect, useState } from 'react'
import { getDeletedTransactions } from '../services/api'
import { formatCurrency, formatDate } from '../utils/format'

export default function Deleted() {
  const [transactions, setTransactions] = useState([])

  useEffect(() => {
    getDeletedTransactions().then(r => setTransactions(r.data))
  }, [])

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Deleted Records</h1>
      <p style={{ color: '#64748b', marginBottom: 24, fontSize: 14 }}>
        Soft-deleted transactions. Data is preserved in Discord and the events log — nothing is ever permanently lost.
      </p>

      <div className="card">
        <table>
          <thead>
            <tr><th>ID</th><th>Type</th><th>Amount</th><th>Category</th><th>Note</th><th>Deleted At</th></tr>
          </thead>
          <tbody>
            {transactions.map(t => (
              <tr key={t.id} style={{ opacity: 0.65 }}>
                <td style={{ color: '#64748b', fontSize: 12, fontFamily: 'monospace' }}>{t.id.slice(0, 8)}…</td>
                <td><span className={`badge badge-${t.type}`}>{t.type}</span></td>
                <td>{formatCurrency(t.amount, t.currency)}</td>
                <td style={{ color: '#94a3b8' }}>{t.category || '—'}</td>
                <td style={{ color: '#94a3b8' }}>{t.note || '—'}</td>
                <td style={{ color: '#ef4444', fontSize: 12 }}>{formatDate(t.deleted_at)}</td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>No deleted records</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
