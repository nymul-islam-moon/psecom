import { useEffect, useState } from 'react'
import { getTransactions } from '../services/api'
import { formatCurrency, formatDate } from '../utils/format'

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [filter, setFilter] = useState({ type: '', category: '' })

  const load = () => {
    const params = {}
    if (filter.type) params.type = filter.type
    if (filter.category) params.category = filter.category
    getTransactions(params).then(r => setTransactions(r.data))
  }

  useEffect(load, [filter])

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Transactions</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <select value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))} style={{ maxWidth: 160 }}>
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="transfer">Transfer</option>
        </select>
        <input
          placeholder="Filter by category"
          value={filter.category}
          onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
          style={{ maxWidth: 200 }}
        />
      </div>

      <div className="card">
        <table>
          <thead>
            <tr><th>ID</th><th>Type</th><th>Amount</th><th>Account</th><th>Category</th><th>Note</th><th>Date</th></tr>
          </thead>
          <tbody>
            {transactions.map(t => (
              <tr key={t.id}>
                <td style={{ color: '#64748b', fontSize: 12, fontFamily: 'monospace' }}>{t.id.slice(0, 8)}…</td>
                <td><span className={`badge badge-${t.type}`}>{t.type}</span></td>
                <td style={{ fontWeight: 600 }}>{formatCurrency(t.amount, t.currency)}</td>
                <td style={{ color: '#94a3b8' }}>{t.account_id}</td>
                <td style={{ color: '#94a3b8' }}>{t.category || '—'}</td>
                <td style={{ color: '#94a3b8', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.note || '—'}</td>
                <td style={{ color: '#64748b', fontSize: 12 }}>{formatDate(t.created_at)}</td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>No transactions found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
