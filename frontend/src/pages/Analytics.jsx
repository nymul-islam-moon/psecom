import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'
import { getTransactions } from '../services/api'
import { formatCurrency, formatShortDate } from '../utils/format'

const COLORS = { income: '#86efac', expense: '#fca5a5', transfer: '#93c5fd' }
const PIE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

export default function Analytics() {
  const [transactions, setTransactions] = useState([])

  useEffect(() => {
    getTransactions({ limit: 500 }).then(r => setTransactions(r.data))
  }, [])

  // Group by date for timeline
  const byDate = transactions.reduce((acc, t) => {
    const day = t.created_at.slice(0, 10)
    if (!acc[day]) acc[day] = { date: day, income: 0, expense: 0 }
    if (t.type === 'income') acc[day].income += parseFloat(t.amount)
    if (t.type === 'expense') acc[day].expense += parseFloat(t.amount)
    return acc
  }, {})
  const timelineData = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)).slice(-30)

  // Group by category for pie
  const byCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const cat = t.category || 'Uncategorized'
      acc[cat] = (acc[cat] || 0) + parseFloat(t.amount)
      return acc
    }, {})
  const categoryData = Object.entries(byCategory).map(([name, value]) => ({ name, value }))

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0)

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Analytics</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ color: '#94a3b8', fontSize: 13 }}>Total Income</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#86efac' }}>{formatCurrency(totalIncome)}</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ color: '#94a3b8', fontSize: 13 }}>Total Expenses</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#fca5a5' }}>{formatCurrency(totalExpense)}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Income vs Expenses (last 30 days)</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={timelineData}>
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={d => formatShortDate(d)} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
            <Legend />
            <Bar dataKey="income" fill="#86efac" name="Income" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" fill="#fca5a5" name="Expense" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {categoryData.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Expenses by Category</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
