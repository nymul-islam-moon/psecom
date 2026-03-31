import { useEffect, useState } from 'react'
import { getAccounts, postEvent } from '../services/api'
import api from '../services/api'
import { formatCurrency, formatDate } from '../utils/format'
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

const TYPE_ICONS = { cash: '💵', bank: '🏦', card: '💳', bkash: '📱', nagad: '📱', rocket: '📱', upay: '📱', tap: '📱' }
const EMPTY_FORM = { name: '', type: 'cash', currency: 'BDT', parent_id: '' }
const labelStyle = { display: 'block', fontSize: 12, color: '#8892a4', marginBottom: 5, fontWeight: 500 }

export default function Accounts() {
  const [accounts, setAccounts]   = useState([])
  const [balances, setBalances]   = useState({}) // { account_id: { balance, income, expense } }
  const [modal, setModal]         = useState(null)
  const [selected, setSelected]   = useState(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [toast, setToast]         = useState(null)

  const showToast = (msg, type = 'success') => setToast({ message: msg, type })

  const load = async () => {
    const r = await getAccounts()
    setAccounts(r.data)
    // Fetch balances for all accounts
    const bals = {}
    await Promise.all(r.data.map(async a => {
      try {
        const b = await api.get(`/accounts/${a.id}/balance`)
        bals[a.id] = b.data
      } catch { bals[a.id] = { balance: 0, income: 0, expense: 0 } }
    }))
    setBalances(bals)
  }
  useEffect(() => { load() }, [])

  const openCreate = () => { setForm(EMPTY_FORM); setSelected(null); setError(''); setModal('create') }
  const openEdit   = (a)  => { setForm({ name: a.name, type: a.type, currency: a.currency, parent_id: a.parent_id || '' }); setSelected(a); setError(''); setModal('edit') }
  const openView   = (a)  => { setSelected(a); setModal('view') }

  const handleSave = async () => {
    if (!form.name) { setError('Name is required.'); return }
    setSaving(true); setError('')
    try {
      if (modal === 'create') {
        await postEvent({ event_id: generateId(), action: 'insert', entity: 'account', source: 'app', data: { id: generateId(), ...form, parent_id: form.parent_id || null } })
        showToast(`Account "${form.name}" created!`)
      } else {
        await postEvent({ event_id: generateId(), action: 'update', entity: 'account', target_id: selected.id, source: 'app', data: { ...form, parent_id: form.parent_id || null } })
        showToast(`Account "${form.name}" updated!`)
      }
      setModal(null); load()
    } catch (e) {
      const msg = e.response?.data?.detail || 'Something went wrong.'
      setError(msg); showToast(msg, 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (a) => {
    if (!confirm(`Delete account "${a.name}"?`)) return
    try {
      await postEvent({ event_id: generateId(), action: 'delete', entity: 'account', target_id: a.id, source: 'app', data: {} })
      showToast(`Account "${a.name}" deleted.`)
      load()
    } catch (e) { showToast(e.response?.data?.detail || 'Delete failed.', 'error') }
  }

  const totalBalance = Object.values(balances).reduce((s, b) => s + (b?.balance || 0), 0)

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Accounts</div>
          <div className="page-subtitle">{accounts.length} accounts · Total balance: {formatCurrency(totalBalance, 'BDT')}</div>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ New Account</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {accounts.map(a => {
          const bal = balances[a.id] || { balance: 0, income: 0, expense: 0 }
          return (
            <div key={a.id} style={{
              background: '#161b27',
              border: '1px solid #21293d',
              borderRadius: 16,
              padding: 20,
              display: 'flex', flexDirection: 'column', gap: 12,
              transition: 'all 0.2s',
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Glow strip */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', opacity: 0.6 }} />

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: '#0d1117', border: '1px solid #21293d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                    {TYPE_ICONS[a.type] || '◈'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#f0f4ff' }}>{a.name}</div>
                    <span className={`badge badge-${a.type}`}>{a.type}</span>
                  </div>
                </div>
              </div>

              {/* Balance */}
              <div style={{ background: '#0d1117', borderRadius: 10, padding: '12px 16px', border: '1px solid #21293d' }}>
                <div style={{ fontSize: 10, color: '#4a556b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Current Balance</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: bal.balance >= 0 ? '#6ee7b7' : '#fca5a5', letterSpacing: '-0.02em' }}>
                  {formatCurrency(bal.balance, a.currency)}
                </div>
              </div>

              {/* Income / Expense row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 10, color: '#4a556b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>In</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#6ee7b7' }}>{formatCurrency(bal.income, a.currency)}</div>
                </div>
                <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 10, color: '#4a556b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Out</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fca5a5' }}>{formatCurrency(bal.expense, a.currency)}</div>
                </div>
              </div>

              {a.parent_id && (
                <div style={{ fontSize: 11, color: '#4a556b' }}>
                  Sub-account of: <span style={{ color: '#8892a4' }}>{accounts.find(x => x.id === a.parent_id)?.name || a.parent_id}</span>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                <button className="btn-icon" style={{ flex: 1, justifyContent: 'center', fontSize: 12 }} onClick={() => openView(a)} title="View">👁 View</button>
                <button className="btn-icon" style={{ flex: 1, justifyContent: 'center', fontSize: 12 }} onClick={() => openEdit(a)} title="Edit">✏️ Edit</button>
                <button className="btn-icon" style={{ flex: 1, justifyContent: 'center', fontSize: 12, color: '#fca5a5' }} onClick={() => handleDelete(a)} title="Delete">🗑 Del</button>
              </div>
            </div>
          )
        })}
        {accounts.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            <div className="empty-state-icon">◈</div>
            No accounts yet. Click "+ New Account" to get started.
          </div>
        )}
      </div>

      {/* View Modal */}
      {modal === 'view' && selected && (
        <Modal title="Account Details" onClose={() => setModal(null)} width={420}>
          {(() => {
            const bal = balances[selected.id] || { balance: 0, income: 0, expense: 0 }
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: '#0d1117', borderRadius: 12, padding: 18, border: '1px solid #21293d', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#4a556b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Balance</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: bal.balance >= 0 ? '#6ee7b7' : '#fca5a5' }}>{formatCurrency(bal.balance, selected.currency)}</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 10, fontSize: 12 }}>
                    <span style={{ color: '#6ee7b7' }}>↑ {formatCurrency(bal.income, selected.currency)}</span>
                    <span style={{ color: '#fca5a5' }}>↓ {formatCurrency(bal.expense, selected.currency)}</span>
                  </div>
                </div>
                {[
                  ['Name',    selected.name],
                  ['Type',    <span className={`badge badge-${selected.type}`}>{selected.type}</span>],
                  ['Currency', selected.currency],
                  ['Created', formatDate(selected.created_at)],
                  ['ID',      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#4a556b' }}>{selected.id}</span>],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #21293d' }}>
                    <span style={{ fontSize: 11, color: '#4a556b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</span>
                    <span style={{ fontSize: 14, color: '#f0f4ff' }}>{v}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                  <button className="btn-ghost" onClick={() => { setModal(null); openEdit(selected) }}>✏️ Edit</button>
                  <button className="btn-ghost" onClick={() => setModal(null)}>Close</button>
                </div>
              </div>
            )
          })()}
        </Modal>
      )}

      {/* Create / Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'New Account' : 'Edit Account'} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Name *</label>
              <input placeholder="e.g. My Wallet, Main Bank" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Currency</label>
              <input placeholder="BDT" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label style={labelStyle}>Parent Account (optional)</label>
              <select value={form.parent_id} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}>
                <option value="">— None —</option>
                {accounts.filter(a => !selected || a.id !== selected.id).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            {error && <div style={{ color: '#fca5a5', fontSize: 13, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}
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
