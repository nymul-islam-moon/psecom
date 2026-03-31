import { useEffect, useState } from 'react'
import { getTransactions, getAccounts, triggerSync } from '../services/api'
import { formatCurrency, formatDate } from '../utils/format'

export default function Dashboard() {
  const [transactions, setTransactions] = useState([])
  const [accounts, setAccounts] = useState([])
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    getTransactions({ limit: 5 }).then(r => setTransactions(r.data))
    getAccounts().then(r => setAccounts(r.data))
  }, [])

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0)

  const handleSync = async () => {
    setSyncing(true)
    try { await triggerSync() } finally { setSyncing(false) }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Dashboard</h1>
        <button className="btn-primary" onClick={handleSync} disabled={syncing}>
          {syncing ? 'Syncing...' : '🔄 Sync Discord'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        <div className="card">
          <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>Total Income</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#86efac' }}>{formatCurrency(totalIncome)}</div>
        </div>
        <div className="card">
          <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>Total Expenses</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#fca5a5' }}>{formatCurrency(totalExpense)}</div>
        </div>
        <div className="card">
          <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>Balance</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: totalIncome - totalExpense >= 0 ? '#86efac' : '#fca5a5' }}>
            {formatCurrency(totalIncome - totalExpense)}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Recent Transactions</h2>
          <table>
            <thead>
              <tr><th>Type</th><th>Amount</th><th>Category</th><th>Date</th></tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id}>
                  <td><span className={`badge badge-${t.type}`}>{t.type}</span></td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(t.amount, t.currency)}</td>
                  <td style={{ color: '#94a3b8' }}>{t.category || '—'}</td>
                  <td style={{ color: '#94a3b8', fontSize: 12 }}>{formatDate(t.created_at)}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>No transactions yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Accounts</h2>
          {accounts.map(a => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #334155' }}>
              <div>
                <div style={{ fontWeight: 500 }}>{a.name}</div>
                <span className={`badge badge-${a.type}`}>{a.type}</span>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12 }}>{a.currency}</div>
            </div>
          ))}
          {accounts.length === 0 && <div style={{ color: '#64748b', textAlign: 'center', padding: 16 }}>No accounts yet</div>}
        </div>
      </div>
    </div>
  )
}
