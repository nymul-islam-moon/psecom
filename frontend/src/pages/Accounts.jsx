import { useEffect, useState } from 'react'
import { getAccounts, postEvent } from '../services/api'
import { formatDate } from '../utils/format'
import { generateId } from '../utils/uuid'
import Modal from '../components/Modal'
import Toast from '../components/Toast'

const ACCOUNT_TYPES = [
  { value: 'cash',   label: '💵 Cash' },
  { value: 'bank',   label: '🏦 Bank' },
  { value: 'card',   label: '💳 Card' },
  { value: 'bkash',  label: '📱 bKash' },
  { value: 'nagad',  label: '📱 Nagad' },
  { value: 'rocket', label: '📱 Rocket' },
  { value: 'upay',   label: '📱 Upay' },
  { value: 'tap',    label: '📱 Tap' },
]

const EMPTY_FORM = { name: '', type: 'cash', currency: 'BDT', parent_id: '' }

export default function Accounts() {
  const [accounts, setAccounts] = useState([])
  const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const load = () => getAccounts().then(r => setAccounts(r.data))
  useEffect(() => { load() }, [])

  const showToast = (message, type = 'success') => setToast({ message, type })

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setEditing(null)
    setError('')
    setModal('create')
  }

  const openEdit = (account) => {
    setForm({ name: account.name, type: account.type, currency: account.currency, parent_id: account.parent_id || '' })
    setEditing(account)
    setError('')
    setModal('edit')
  }

  const handleSave = async () => {
    if (!form.name) { setError('Name is required.'); return }
    setSaving(true)
    setError('')
    try {
      if (modal === 'create') {
        await postEvent({
          event_id: generateId(),
          action: 'insert',
          entity: 'account',
          source: 'app',
          data: { id: generateId(), name: form.name, type: form.type, currency: form.currency, parent_id: form.parent_id || null },
        })
        showToast(`Account "${form.name}" created successfully!`)
      } else {
        await postEvent({
          event_id: generateId(),
          action: 'update',
          entity: 'account',
          target_id: editing.id,
          source: 'app',
          data: { name: form.name, type: form.type, currency: form.currency, parent_id: form.parent_id || null },
        })
        showToast(`Account "${form.name}" updated successfully!`)
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

  const handleDelete = async (account) => {
    if (!confirm(`Delete account "${account.name}"? This removes it from state (event log is preserved).`)) return
    try {
      await postEvent({
        event_id: generateId(),
        action: 'delete',
        entity: 'account',
        target_id: account.id,
        source: 'app',
        data: {},
      })
      showToast(`Account "${account.name}" deleted.`)
      load()
    } catch (e) {
      showToast(e.response?.data?.detail || 'Delete failed.', 'error')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Accounts</h1>
        <button className="btn-primary" onClick={openCreate}>+ New Account</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {accounts.map(a => (
          <div key={a.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{a.name}</div>
              <span className={`badge badge-${a.type}`}>{a.type}</span>
            </div>
            <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>
              Currency: <span style={{ color: '#e2e8f0' }}>{a.currency}</span>
            </div>
            {a.parent_id && (
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>
                Sub-account of: <span style={{ color: '#e2e8f0', fontSize: 11 }}>{accounts.find(x => x.id === a.parent_id)?.name || a.parent_id}</span>
              </div>
            )}
            <div style={{ color: '#64748b', fontSize: 12, marginBottom: 14 }}>Created {formatDate(a.created_at)}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-ghost" style={{ flex: 1, fontSize: 13 }} onClick={() => openEdit(a)}>✏️ Edit</button>
              <button className="btn-danger" style={{ flex: 1, fontSize: 13 }} onClick={() => handleDelete(a)}>🗑️ Delete</button>
            </div>
          </div>
        ))}
        {accounts.length === 0 && (
          <div style={{ color: '#64748b', padding: 24 }}>No accounts yet. Click "+ New Account" to add one.</div>
        )}
      </div>

      {modal && (
        <Modal title={modal === 'create' ? 'New Account' : 'Edit Account'} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Name *</label>
              <input placeholder="e.g. My Wallet, Main Bank" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {ACCOUNT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Currency</label>
              <input placeholder="USD" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label style={labelStyle}>Parent Account (optional)</label>
              <select value={form.parent_id} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}>
                <option value="">— None —</option>
                {accounts.filter(a => !editing || a.id !== editing.id).map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
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
