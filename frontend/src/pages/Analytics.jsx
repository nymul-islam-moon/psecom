import { useEffect, useState } from 'react'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts'
import { getTransactions } from '../services/api'
import { formatCurrency, formatShortDate } from '../utils/format'

const PIE_COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#f97316']

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      {label && <div style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>}
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color || 'var(--text-primary)', fontWeight: 600 }}>
          {p.name}: {formatCurrency(p.value)}
        </div>
      ))}
    </div>
  )
}

export default function Analytics() {
  const [transactions, setTransactions] = useState([])
  useEffect(() => { getTransactions({ limit: 1000 }).then(r => setTransactions(r.data)) }, [])

  // Filter to BDT only so amounts are never mixed across currencies in charts
  const bdtTxns = transactions.filter(t => (t.currency || 'BDT').toUpperCase() === 'BDT')

  const totalIncome  = bdtTxns.filter(t => t.type==='income').reduce((s,t) => s+parseFloat(t.amount), 0)
  const totalExpense = bdtTxns.filter(t => t.type==='expense').reduce((s,t) => s+parseFloat(t.amount), 0)
  const savingsRate  = totalIncome > 0 ? ((totalIncome-totalExpense)/totalIncome*100).toFixed(1) : 0

  const byDate = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i)
    const key = d.toISOString().slice(0,10)
    byDate[key] = { date: key, income: 0, expense: 0 }
  }
  bdtTxns.forEach(t => {
    const day = (t.created_at||'').slice(0,10)
    if (byDate[day]) {
      if (t.type==='income')  byDate[day].income  += parseFloat(t.amount)
      if (t.type==='expense') byDate[day].expense += parseFloat(t.amount)
    }
  })
  const timelineData = Object.values(byDate).map(d => ({ ...d, date: formatShortDate(d.date) }))

  const byCategory = bdtTxns.filter(t=>t.type==='expense').reduce((acc,t) => {
    const cat = t.category || 'Uncategorized'
    acc[cat] = (acc[cat]||0) + parseFloat(t.amount)
    return acc
  }, {})
  const categoryData = Object.entries(byCategory).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({ name, value }))

  const byMonth = bdtTxns.reduce((acc,t) => {
    const m = (t.created_at||'').slice(0,7)
    if (!acc[m]) acc[m] = { month: m, income: 0, expense: 0 }
    if (t.type==='income')  acc[m].income  += parseFloat(t.amount)
    if (t.type==='expense') acc[m].expense += parseFloat(t.amount)
    return acc
  }, {})
  const monthlyData = Object.values(byMonth).sort((a,b)=>a.month.localeCompare(b.month)).slice(-6)

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Analytics</div>
          <div className="page-subtitle">Financial insights</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Total Income</div>
          <div className="stat-value" style={{ color: 'var(--green-text)' }}>{formatCurrency(totalIncome)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Expenses</div>
          <div className="stat-value" style={{ color: 'var(--red-text)' }}>{formatCurrency(totalExpense)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Savings Rate</div>
          <div className="stat-value" style={{ color: savingsRate >= 0 ? 'var(--green-text)' : 'var(--red-text)' }}>{savingsRate}%</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Cash Flow — Last 30 Days (BDT ৳)</div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={timelineData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="aIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="aExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="income"  stroke="#10b981" strokeWidth={2} fill="url(#aIncome)"  name="Income" />
            <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fill="url(#aExpense)" name="Expense" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Monthly Comparison (BDT ৳)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="income"  fill="#10b981" name="Income"  radius={[4,4,0,0]} opacity={0.85} />
              <Bar dataKey="expense" fill="#ef4444" name="Expense" radius={[4,4,0,0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Expense by Category</div>
          {categoryData.length === 0 ? (
            <div className="empty-state">No expense data</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {categoryData.map((_,i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend formatter={v => <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
