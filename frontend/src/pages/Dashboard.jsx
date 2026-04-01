import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { getTransactions, getAccounts, triggerSync } from '../services/api'
import { formatCurrency, formatDate, formatShortDate } from '../utils/format'
import Toast from '../components/Toast'
import YearEndModal from '../components/YearEndModal'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {formatCurrency(p.value)}
        </div>
      ))}
    </div>
  )
}

function calcByCurrency(transactions) {
  const map = {}
  transactions.forEach(t => {
    const cur = (t.currency || 'BDT').toUpperCase()
    if (!map[cur]) map[cur] = { income: 0, expense: 0 }
    if (t.type === 'income')  map[cur].income  += parseFloat(t.amount)
    if (t.type === 'expense') map[cur].expense += parseFloat(t.amount)
  })
  return Object.entries(map).map(([currency, v]) => ({
    currency, income: v.income, expense: v.expense, balance: v.income - v.expense,
  }))
}

export default function Dashboard() {
  const [transactions, setTransactions] = useState([])
  const [accounts, setAccounts]         = useState([])
  const [syncing, setSyncing]           = useState(false)
  const [showYearEnd, setShowYearEnd]   = useState(false)
  const [toast, setToast]               = useState(null)
  const navigate = useNavigate()

  const load = () => {
    getTransactions({ limit: 200 }).then(r => setTransactions(r.data))
    getAccounts().then(r => setAccounts(r.data))
  }
  useEffect(() => { load() }, [])

  const currencyTotals = calcByCurrency(transactions)

  const byDate = {}
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    byDate[key] = { date: key, income: 0, expense: 0 }
  }
  transactions.forEach(t => {
    const day = (t.created_at || '').slice(0, 10)
    if (byDate[day] && (t.currency || 'BDT').toUpperCase() === 'BDT') {
      if (t.type === 'income')  byDate[day].income  += parseFloat(t.amount)
      if (t.type === 'expense') byDate[day].expense += parseFloat(t.amount)
    }
  })
  const chartData = Object.values(byDate).map(d => ({ ...d, date: formatShortDate(d.date) }))

  const handleSync = async () => {
    setSyncing(true)
    try {
      await triggerSync()
      setToast({ message: 'Sync started — refreshing in 3s…', type: 'success' })
      setTimeout(() => load(), 3000)
    } catch { setToast({ message: 'Sync failed', type: 'error' }) }
    finally { setSyncing(false) }
  }


  const recent = transactions.slice(0, 8)

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Your financial overview</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" onClick={() => navigate('/transactions')}>+ New Transaction</button>
          <button className="btn-ghost" onClick={() => navigate('/convert')} style={{ fontSize: 12 }}>⇌ Convert</button>
          <button className="btn-ghost" onClick={handleSync} disabled={syncing}>{syncing ? '⟳ Syncing…' : '⟳ Sync Discord'}</button>
          <button className="btn-danger" onClick={() => setShowYearEnd(true)} style={{ fontSize: 12 }}>⚠ Year Reset</button>
        </div>
      </div>

      {currencyTotals.length === 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
          {[['Total Income','↑','var(--green-text)'],['Total Expenses','↓','var(--red-text)'],['Net Balance','◎','var(--text-secondary)']].map(([label, icon, color]) => (
            <div key={label} className="stat-card">
              <div className="stat-icon">{icon}</div>
              <div className="stat-label">{label}</div>
              <div className="stat-value" style={{ color }}>৳0.00</div>
            </div>
          ))}
        </div>
      ) : (
        currencyTotals.map(({ currency, income, expense, balance }) => (
          <div key={currency} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              {currency} Summary
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              <div className="stat-card">
                <div className="stat-icon">↑</div>
                <div className="stat-label">Income</div>
                <div className="stat-value" style={{ color: 'var(--green-text)' }}>{formatCurrency(income, currency)}</div>
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                  {transactions.filter(t => t.type === 'income' && (t.currency||'BDT').toUpperCase() === currency).length} transactions
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">↓</div>
                <div className="stat-label">Expenses</div>
                <div className="stat-value" style={{ color: 'var(--red-text)' }}>{formatCurrency(expense, currency)}</div>
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                  {transactions.filter(t => t.type === 'expense' && (t.currency||'BDT').toUpperCase() === currency).length} transactions
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">◎</div>
                <div className="stat-label">Net Balance</div>
                <div className="stat-value" style={{ color: balance >= 0 ? 'var(--green-text)' : 'var(--red-text)' }}>{formatCurrency(balance, currency)}</div>
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>{accounts.length} accounts</div>
              </div>
            </div>
          </div>
        ))
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>Last 14 Days</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>BDT transactions only</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="income"  stroke="#10b981" strokeWidth={2} fill="url(#gIncome)"  name="Income" />
              <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fill="url(#gExpense)" name="Expense" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Accounts</div>
            <button className="btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => navigate('/accounts')}>Manage →</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {accounts.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">◈</div>
                <div>No accounts yet</div>
                <button className="btn-ghost" style={{ marginTop: 10, fontSize: 12 }} onClick={() => navigate('/accounts')}>+ Add account</button>
              </div>
            )}
            {accounts.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 9, background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{a.name}</div>
                  <span className={`badge badge-${a.type}`}>{a.type}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.currency}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Recent Transactions</div>
          <button className="btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => navigate('/transactions')}>View all →</button>
        </div>
        <table>
          <thead>
            <tr><th>Type</th><th>Amount</th><th>Category</th><th>Note</th><th>Date</th></tr>
          </thead>
          <tbody>
            {recent.map(t => (
              <tr key={t.id}>
                <td><span className={`badge badge-${t.type}`}>{t.type}</span></td>
                <td style={{ fontWeight: 600, color: t.type === 'income' ? 'var(--green-text)' : t.type === 'expense' ? 'var(--red-text)' : 'var(--blue-text)' }}>
                  {formatCurrency(t.amount, t.currency)}
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{t.category || '—'}</td>
                <td style={{ color: 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.note || '—'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDate(t.created_at)}</td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr><td colSpan={5}><div className="empty-state">No transactions yet</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {showYearEnd && (
        <YearEndModal
          onClose={() => setShowYearEnd(false)}
          onDone={() => {
            setToast({ message: 'Year-end reset started. Refresh in ~60 seconds.', type: 'success' })
            setTimeout(() => load(), 60000)
          }}
        />
      )}
    </div>
  )
}
