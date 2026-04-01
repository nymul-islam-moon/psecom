import { useEffect, useState } from 'react'
import { getTransactions, getAccounts, postEvent } from '../services/api'
import { formatCurrency, formatDate } from '../utils/format'
import { generateId } from '../utils/uuid'
import Modal from '../components/Modal'
import Toast from '../components/Toast'

const EMPTY_FORM = {
  type: 'expense',
  sub_type: '',
  to_recipient: '',
  amount: '',
  currency: 'BDT',
  account_id: '',
  category: '',
  note: '',
}

// sub_type options per transaction type
const SUB_TYPES = {
  income:  [{ value: '',        label: 'Regular Income' },
            { value: 'initial', label: 'Initial Balance (pre-existing money)' },
            { value: 'borrow',  label: 'Borrowed — someone gave you money, you owe it back' }],
  expense: [{ value: '',        label: 'Regular Expense (cash/card)' },
            { value: 'sent_to', label: 'Sent to someone (transfer out)' },
            { value: 'lent',    label: 'Lent — you gave money to someone, they owe you back' }],
}

const SUB_TYPE_BADGE = {
  initial: { label: 'initial',  color: 'var(--text-muted)', bg: 'var(--bg-overlay)' },
  borrow:  { label: 'borrowed', color: '#f59e0b',            bg: 'rgba(245,158,11,0.12)' },
  lent:    { label: 'lent',     color: '#06b6d4',            bg: 'rgba(6,182,212,0.1)' },
  sent_to: { label: 'sent to',  color: 'var(--blue-text)',   bg: 'rgba(99,102,241,0.1)' },
}

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

function SubTypeBadge({ sub_type, to_recipient }) {
  if (!sub_type) return null
  const s = SUB_TYPE_BADGE[sub_type]
  if (!s) return null
  return (
    <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, background: s.bg, color: s.color, fontWeight: 500, marginLeft: 5 }}>
      {s.label}{sub_type === 'sent_to' && to_recipient ? `: ${to_recipient}` : ''}
    </span>
  )
}

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
  const openEdit = (t) => {
    setForm({
      type: t.type, sub_type: t.sub_type || '', to_recipient: t.to_recipient || '',
      amount: t.amount, currency: t.currency, account_id: t.account_id,
      category: t.category || '', note: t.note || '',
    })
    setSelected(t); setError(''); setModal('edit')
  }
  const openView = (t) => { setSelected(t); setModal('view') }

  const handleTypeChange = (val) => setForm(f => ({ ...f, type: val, sub_type: '', to_recipient: '' }))

  const handleSave = async () => {
    if (!form.amount || !form.account_id) { setError('Amount and Account are required.'); return }
    if (form.sub_type === 'sent_to' && !form.to_recipient) { setError('Please enter who you sent money to.'); return }
    setSaving(true); setError('')
    const data = {
      ...form,
      amount: parseFloat(form.amount),
      sub_type: form.sub_type || null,
      to_recipient: form.sub_type === 'sent_to' ? form.to_recipient : null,
    }
    try {
      if (modal === 'create') {
        await postEvent({ event_id: generateId(), action: 'insert', entity: 'transaction', source: 'app', data: { id: generateId(), ...data } })
        showToast('Transaction created!')
      } else {
        await postEvent({ event_id: generateId(), action: 'update', entity: 'transaction', target_id: selected.id, source: 'app', data })
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

  const subTypeOptions = SUB_TYPES[form.type] || []

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
          <option value="transfer">Transfer (auto)</option>
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
                <td>
                  <span className={`badge badge-${t.type}`}>{t.type}</span>
                  <SubTypeBadge sub_type={t.sub_type} to_recipient={t.to_recipient} />
                </td>
                <td style={{ fontWeight: 600, color: t.type === 'income' ? 'var(--green-text)' : t.type === 'expense' ? 'var(--red-text)' : 'var(--blue-text)' }}>
                  {formatCurrency(t.amount, t.currency)}
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{accountName(t.account_id)}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{t.category || '—'}</td>
                <td style={{ color: 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.note || '—'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDate(t.created_at)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button className="btn-icon" title="View"   onClick={() => openView(t)}    style={{ fontSize: 12 }}>👁</button>
                    {t.type !== 'transfer' && (
                      <button className="btn-icon" title="Edit" onClick={() => openEdit(t)}   style={{ fontSize: 12 }}>✏️</button>
                    )}
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
            <DetailRow label="Type"     value={<><span className={`badge badge-${selected.type}`}>{selected.type}</span><SubTypeBadge sub_type={selected.sub_type} to_recipient={selected.to_recipient} /></>} />
            <DetailRow label="Amount"   value={<span style={{ fontWeight: 700, fontSize: 18, color: selected.type === 'income' ? 'var(--green-text)' : 'var(--red-text)' }}>{formatCurrency(selected.amount, selected.currency)}</span>} />
            <DetailRow label="Account"  value={accountName(selected.account_id)} />
            {selected.sub_type === 'sent_to' && selected.to_recipient && (
              <DetailRow label="Sent To" value={selected.to_recipient} />
            )}
            {selected.sub_type === 'borrow' && (
              <DetailRow label="Debt" value={<span style={{ color: '#f59e0b' }}>You owe this money back</span>} />
            )}
            {selected.sub_type === 'lent' && (
              <DetailRow label="Receivable" value={<span style={{ color: '#06b6d4' }}>They owe you this money back</span>} />
            )}
            <DetailRow label="Category" value={selected.category || '—'} />
            <DetailRow label="Note"     value={selected.note || '—'} />
            <DetailRow label="Date"     value={formatDate(selected.created_at)} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              {selected.type !== 'transfer' && (
                <button className="btn-ghost" onClick={() => { setModal(null); openEdit(selected) }}>✏️ Edit</button>
              )}
              <button className="btn-ghost" onClick={() => setModal(null)}>Close</button>
            </div>
          </div>
        </Modal>
      )}

      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'New Transaction' : 'Edit Transaction'} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <Field label="Type">
              <select value={form.type} onChange={e => handleTypeChange(e.target.value)}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </Field>

            <Field label={form.type === 'income' ? 'Income Kind' : 'Expense Kind'}>
              <select value={form.sub_type} onChange={e => setForm(f => ({ ...f, sub_type: e.target.value, to_recipient: '' }))}>
                {subTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>

            {form.sub_type === 'sent_to' && (
              <Field label="Sent To (person or service) *">
                <input placeholder="e.g. Landlord, bKash 01700…, Electricity Bill" value={form.to_recipient} onChange={e => setForm(f => ({ ...f, to_recipient: e.target.value }))} />
              </Field>
            )}

            {form.sub_type === 'borrow' && (
              <div style={{ fontSize: 12, color: '#f59e0b', padding: '8px 12px', background: 'rgba(245,158,11,0.08)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)' }}>
                This amount will increase your balance but is tracked as debt — you owe it back. Use the Note field to record who lent it to you.
              </div>
            )}

            {form.sub_type === 'lent' && (
              <div style={{ fontSize: 12, color: '#06b6d4', padding: '8px 12px', background: 'rgba(6,182,212,0.08)', borderRadius: 8, border: '1px solid rgba(6,182,212,0.2)' }}>
                This amount will decrease your balance — you gave money to someone and they owe you back. Use the Note field to record who you lent it to.
              </div>
            )}

            {form.sub_type === 'initial' && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 12px', background: 'var(--bg-overlay)', borderRadius: 8, border: '1px solid var(--border)' }}>
                Use this for money that already existed before you started tracking. It adds to your balance but is not counted as earned income.
              </div>
            )}

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
              <input placeholder="e.g. Food, Salary, Rent" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
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
