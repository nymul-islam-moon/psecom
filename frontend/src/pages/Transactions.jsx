import { useEffect, useState } from 'react'
import { getTransactions, getAccounts, postEvent } from '../services/api'
import { formatCurrency, formatDate } from '../utils/format'
import { generateId } from '../utils/uuid'
import Modal from '../components/Modal'
import Toast from '../components/Toast'

const EMPTY_FORM = {
  type: 'expense', amount: '', currency: 'BDT',
  account_id: '', category: '', note: '',
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [accounts, setAccounts] = useState([])
  const [filter, setFilter] = useState({ type: '', category: '' })
  const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => setToast({ message, type })

  const load = () => {
    const params = {}
    if (filter.type) params.type = filter.type
    if (filter.category) params.category = filter.category
    getTransactions(params).then(r => setTransactions(r.data))
  }

  useEffect(() => { load() }, [filter])
  useEffect(() => { getAccounts().then(r => setAccounts(r.data)) }, [])

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setEditing(null)
    setError('')
    setModal('create')
  }

  const openEdit = (txn) => {
    setForm({
      type: txn.type, amount: txn.amount, currency: txn.currency,
      account_id: txn.account_id, category: txn.category || '', note: txn.note || '',
    })
    setEditing(txn)
    setError('')
    setModal('edit')
  }

  const handleSave = async () => {
    if (!form.amount || !form.account_id) {
      setError('Amount and Account are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (modal === 'create') {
        await postEvent({
          event_id: generateId(),
          action: 'insert',
          entity: 'transaction',
          source: 'app',
          data: { id: generateId(), ...form, amount: parseFloat(form.amount) },
        })
        showToast('Transaction created successfully!')
      } else {
        await postEvent({
          event_id: generateId(),
          action: 'update',
          entity: 'transaction',
          target_id: editing.id,
          source: 'app',
          data: { ...form, amount: parseFloat(form.amount) },
        })
        showToast('Transaction updated successfully!')
      }
      setModal(null)
      load()
    } catch (e) {
      const msg = e.response?.data?.detail || 'Something went wrong.'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (txn) => {
    if (!confirm(`Delete "${txn.note || txn.id}"? It moves to Deleted records and can be restored.`)) return
    try {
      await postEvent({
        event_id: generateId(),
        action: 'delete',
        entity: 'transaction',
        target_id: txn.id,
        source: 'app',
        data: {},
      })
      showToast('Transaction deleted (can be restored from Deleted page).')
      load()
    } catch (e) {
      showToast(e.response?.data?.detail || 'Delete failed.', 'error')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Transactions</h1>
        <button className="btn-primary" onClick={openCreate}>+ New Transaction</button>
      </div>

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
            <tr><th>Type</th><th>Amount</th><th>Account</th><th>Category</th><th>Note</th><th>Date</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {transactions.map(t => (
              <tr key={t.id}>
                <td><span className={`badge badge-${t.type}`}>{t.type}</span></td>
                <td style={{ fontWeight: 600 }}>{formatCurrency(t.amount, t.currency)}</td>
                <td style={{ color: '#94a3b8' }}>{accounts.find(a => a.id === t.account_id)?.name || t.account_id}</td>
                <td style={{ color: '#94a3b8' }}>{t.category || '—'}</td>
                <td style={{ color: '#94a3b8', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.note || '—'}</td>
                <td style={{ color: '#64748b', fontSize: 12 }}>{formatDate(t.created_at)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => openEdit(t)}>✏️ Edit</button>
                    <button className="btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleDelete(t)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>No transactions. Click "+ New Transaction" to add one.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal === 'create' ? 'New Transaction' : 'Edit Transaction'} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Amount *</label>
              <input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Currency</label>
              <input placeholder="USD" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label style={labelStyle}>Account *</label>
              <select value={form.account_id} onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}>
                <option value="">— Select account —</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Category</label>
              <input placeholder="e.g. Food, Salary, Transport" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Note</label>
              <textarea rows={2} placeholder="Optional note" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} style={{ resize: 'vertical' }} />
            </div>
            {error && <div style={{ color: '#fca5a5', fontSize: 13 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 5 }
