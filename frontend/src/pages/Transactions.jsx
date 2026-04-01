import { useEffect, useState } from 'react'
import { getTransactions, getAccounts, postEvent } from '../services/api'
import { formatCurrency, formatDate } from '../utils/format'
import { generateId } from '../utils/uuid'
import Modal from '../components/Modal'
import Toast from '../components/Toast'

const EMPTY_FORM = { type: 'expense', amount: '', currency: 'BDT', account_id: '', category: '', note: '' }

const Field = ({ label, children }) => (
  <div>
    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5, fontWeight: 500 }}>{label}</label>
    {children}
  </div>
)

const DetailRow = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
    <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{value}</span>
  </div>
)

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [accounts, setAccounts]         = useState([])
  const [filter, setFilter]             = useState({ type: '', category: '' })
  const [modal, setModal]               = useState(null)
  const [selected, setSelected]         = useState(null)
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState('')
  const [toast, setToast]               = useState(null)

  const showToast = (message, type = 'success') => setToast({ message, type })
  const load = () => {
    const params = {}
    if (filter.type) params.type = filter.type
    if (filter.category) params.category = filter.category
    getTransactions(params).then(r => setTransactions(r.data))
  }
  useEffect(() => { load() }, [filter])
  useEffect(() => { getAccounts().then(r => setAccounts(r.data)) }, [])

  const accountName = (id) => accounts.find(a => a.id === id)?.name || id
  const openCreate = () => { setForm(EMPTY_FORM); setSelected(null); setError(''); setModal('create') }
  const openEdit   = (t)  => { setForm({ type: t.type, amount: t.amount, currency: t.currency, account_id: t.account_id, category: t.category||'', note: t.note||'' }); setSelected(t); setError(''); setModal('edit') }
  const openView   = (t)  => { setSelected(t); setModal('view') }

  const handleSave = async () => {
    if (!form.amount || !form.account_id) { setError('Amount and Account are required.'); return }
    setSaving(true); setError('')
    try {
      if (modal === 'create') {
        await postEvent({ event_id: generateId(), action: 'insert', entity: 'transaction', source: 'app', data: { id: generateId(), ...form, amount: parseFloat(form.amount) } })
        showToast('Transaction created!')
      } else {
        await postEvent({ event_id: generateId(), action: 'update', entity: 'transaction', target_id: selected.id, source: 'app', data: { ...form, amount: parseFloat(form.amount) } })
        showToast('Transaction updated!')
      }
      setModal(null); load()
    } catch (e) {
      const msg = e.response?.data?.detail || 'Something went wrong.'
      setError(msg); showToast(msg, 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (t) => {
    if (!confirm(`Delete "${t.note || t.id}"? It can be restored from Deleted page.`)) return
    try {
      await postEvent({ event_id: generateId(), action: 'delete', entity: 'transaction', target_id: t.id, source: 'app', data: {} })
      showToast('Transaction deleted (restorable).')
      load()
    } catch (e) { showToast(e.response?.data?.detail || 'Delete failed.', 'error') }
  }

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Transactions</div>
          <div className="page-subtitle">{transactions.length} records</div>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ New Transaction</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <select value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))} style={{ maxWidth: 150 }}>
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="transfer">Transfer</option>
        </select>
        <input placeholder="Filter by category…" value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))} style={{ maxWidth: 220 }} />
        {(filter.type || filter.category) && (
          <button className="btn-ghost" onClick={() => setFilter({ type: '', category: '' })}>✕ Clear</button>
        )}
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
                <td style={{ fontWeight: 600, color: t.type === 'income' ? 'var(--green-text)' : t.type === 'expense' ? 'var(--red-text)' : 'var(--blue-text)' }}>
                  {formatCurrency(t.amount, t.currency)}
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{accountName(t.account_id)}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{t.category || '—'}</td>
                <td style={{ color: 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.note || '—'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDate(t.created_at)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button className="btn-icon" title="View"   onClick={() => openView(t)}   style={{ fontSize: 12 }}>👁</button>
                    <button className="btn-icon" title="Edit"   onClick={() => openEdit(t)}   style={{ fontSize: 12 }}>✏️</button>
                    <button className="btn-icon" title="Delete" onClick={() => handleDelete(t)} style={{ fontSize: 12, color: 'var(--red-text)' }}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-icon">⇄</div>No transactions yet</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal === 'view' && selected && (
        <Modal title="Transaction Details" onClose={() => setModal(null)} width={440}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <DetailRow label="ID"       value={<span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{selected.id}</span>} />
            <DetailRow label="Type"     value={<span className={`badge badge-${selected.type}`}>{selected.type}</span>} />
            <DetailRow label="Amount"   value={<span style={{ fontWeight: 700, fontSize: 18, color: selected.type === 'income' ? 'var(--green-text)' : 'var(--red-text)' }}>{formatCurrency(selected.amount, selected.currency)}</span>} />
            <DetailRow label="Account"  value={accountName(selected.account_id)} />
            <DetailRow label="Category" value={selected.category || '—'} />
            <DetailRow label="Note"     value={selected.note || '—'} />
            <DetailRow label="Date"     value={formatDate(selected.created_at)} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn-ghost" onClick={() => { setModal(null); openEdit(selected) }}>✏️ Edit</button>
              <button className="btn-ghost" onClick={() => setModal(null)}>Close</button>
            </div>
          </div>
        </Modal>
      )}

      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'New Transaction' : 'Edit Transaction'} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Type">
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="transfer">Transfer</option>
              </select>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
              <Field label="Amount *">
                <input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </Field>
              <Field label="Currency">
                <input placeholder="BDT" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))} />
              </Field>
            </div>
            <Field label="Account *">
              <select value={form.account_id} onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}>
                <option value="">— Select account —</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
              </select>
            </Field>
            <Field label="Category">
              <input placeholder="e.g. Food, Salary, Transport" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
            </Field>
            <Field label="Note">
              <textarea rows={2} placeholder="Optional note" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} style={{ resize: 'vertical' }} />
            </Field>
            {error && <div style={{ color: 'var(--red-text)', fontSize: 13, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
