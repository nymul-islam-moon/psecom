import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTransactions, getAccounts, triggerSync } from '../services/api'
import { formatCurrency, formatDate } from '../utils/format'

export default function Dashboard() {
  const [transactions, setTransactions] = useState([])
  const [accounts, setAccounts] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const navigate = useNavigate()

  const load = () => {
    getTransactions({ limit: 10 }).then(r => setTransactions(r.data))
    getAccounts().then(r => setAccounts(r.data))
  }

  useEffect(() => { load() }, [])

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + parseFloat(t.amount), 0)
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + parseFloat(t.amount), 0)

  const handleSync = async () => {
    setSyncing(true)
    setSyncMsg('')
    try {
      await triggerSync()
      setSyncMsg('Sync started! Refresh in a moment.')
      setTimeout(() => { setSyncMsg(''); load() }, 3000)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Dashboard</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" onClick={() => navigate('/transactions')}>+ Add Transaction</button>
          <button className="btn-ghost" onClick={handleSync} disabled={syncing}>
            {syncing ? 'Syncing…' : '🔄 Sync Discord'}
          </button>
        </div>
      </div>

      {syncMsg && <div style={{ background: '#14532d', color: '#86efac', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{syncMsg}</div>}

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Recent Transactions</h2>
            <button className="btn-ghost" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => navigate('/transactions')}>View all</button>
          </div>
          <table>
            <thead>
              <tr><th>Type</th><th>Amount</th><th>Category</th><th>Note</th><th>Date</th></tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id}>
                  <td><span className={`badge badge-${t.type}`}>{t.type}</span></td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(t.amount, t.currency)}</td>
                  <td style={{ color: '#94a3b8' }}>{t.category || '—'}</td>
                  <td style={{ color: '#94a3b8', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.note || '—'}</td>
                  <td style={{ color: '#64748b', fontSize: 12 }}>{formatDate(t.created_at)}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>No transactions yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Accounts</h2>
            <button className="btn-ghost" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => navigate('/accounts')}>Manage</button>
          </div>
          {accounts.map(a => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #334155' }}>
              <div>
                <div style={{ fontWeight: 500 }}>{a.name}</div>
                <span className={`badge badge-${a.type}`}>{a.type}</span>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12 }}>{a.currency}</div>
            </div>
          ))}
          {accounts.length === 0 && (
            <div style={{ color: '#64748b', textAlign: 'center', padding: 16 }}>
              No accounts.{' '}
              <span style={{ color: '#6366f1', cursor: 'pointer' }} onClick={() => navigate('/accounts')}>Add one →</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
