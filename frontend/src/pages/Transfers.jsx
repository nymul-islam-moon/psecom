import { useEffect, useState } from 'react'
import { getTransfers, getAccounts, postEvent } from '../services/api'
import { formatCurrency, formatDate } from '../utils/format'
import { generateId } from '../utils/uuid'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import api from '../services/api'

const EMPTY_FORM = {
  from_account_id: '',
  to_account_id: '',
  from_amount: '',
  from_currency: 'BDT',
  to_amount: '',
  to_currency: 'BDT',
  charge: '0',
  note: '',
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

export default function Transfers() {
  const [transfers, setTransfers]       = useState([])
  const [accounts, setAccounts]         = useState([])
  const [modal, setModal]               = useState(null)
  const [selected, setSelected]         = useState(null)
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState('')
  const [toast, setToast]               = useState(null)
  const [fromBalance, setFromBalance]   = useState(null)  // { balance, currency }
  const [loadingBal, setLoadingBal]     = useState(false)

  const showToast = (message, type = 'success') => setToast({ message, type })
  const load = () => getTransfers().then(r => setTransfers(r.data))

  useEffect(() => { load() }, [])
  useEffect(() => { getAccounts().then(r => setAccounts(r.data)) }, [])

  const accountName = (id) => accounts.find(a => a.id === id)?.name || id

  const openCreate = () => { setForm(EMPTY_FORM); setError(''); setFromBalance(null); setModal('create') }
  const openView   = (t) => { setSelected(t); setModal('view') }

  // Fetch balance when from_account is selected
  const handleFromAccountChange = async (id) => {
    setForm(f => {
      const acct = accounts.find(a => a.id === id)
      return { ...f, from_account_id: id, from_currency: acct?.currency || f.from_currency }
    })
    setFromBalance(null)
    if (!id) return
    setLoadingBal(true)
    try {
      const res = await api.get(`/accounts/${id}/balance`)
      setFromBalance({ balance: res.data.balance, currency: res.data.currency })
    } catch { setFromBalance(null) }
    finally { setLoadingBal(false) }
  }

  // Auto-fill to_amount when from_amount changes (same currency = same amount)
  const handleFromAmount = (val) => {
    setForm(f => ({
      ...f,
      from_amount: val,
      to_amount: f.from_currency === f.to_currency ? val : f.to_amount,
    }))
  }

  // Derived: total sender will pay
  const totalDebit = (parseFloat(form.from_amount) || 0) + (parseFloat(form.charge) || 0)
  const isOverspend = fromBalance !== null && totalDebit > fromBalance.balance && totalDebit > 0

  const handleSave = async () => {
    const { from_account_id, to_account_id, from_amount, to_amount } = form
    if (!from_account_id || !to_account_id) { setError('Select both accounts.'); return }
    if (from_account_id === to_account_id) { setError('From and To accounts must be different.'); return }
    if (!from_amount || !to_amount) { setError('Enter both amounts.'); return }

    setSaving(true); setError('')
    try {
      await postEvent({
        event_id: generateId(),
        action: 'insert',
        entity: 'transfer',
        source: 'app',
        data: {
          id: generateId(),
          from_account_id,
          to_account_id,
          from_amount: parseFloat(from_amount),
          from_currency: form.from_currency,
          to_amount: parseFloat(to_amount),
          to_currency: form.to_currency,
          charge: parseFloat(form.charge) || 0,
          note: form.note,
        },
      })
      showToast('Transfer recorded!')
      setModal(null)
      load()
    } catch (e) {
      const msg = e.response?.data?.detail || 'Something went wrong.'
      setError(msg); showToast(msg, 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (t) => {
    if (!confirm('Delete this transfer? Both debit and credit transactions will be reversed.')) return
    try {
      await postEvent({ event_id: generateId(), action: 'delete', entity: 'transfer', target_id: t.id, source: 'app', data: {} })
      showToast('Transfer deleted.')
      load()
    } catch (e) { showToast(e.response?.data?.detail || 'Delete failed.', 'error') }
  }

  const isCross = (t) => t.from_currency !== t.to_currency

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Transfers</div>
          <div className="page-subtitle">{transfers.length} records</div>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ New Transfer</button>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr><th>From</th><th>To</th><th>Sent</th><th>Received</th><th>Charge</th><th>Note</th><th>Date</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {transfers.map(t => (
              <tr key={t.id}>
                <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{accountName(t.from_account_id)}</td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{accountName(t.to_account_id)}</td>
                <td style={{ fontWeight: 600, color: 'var(--red-text)' }}>
                  {formatCurrency(parseFloat(t.from_amount) + parseFloat(t.charge), t.from_currency)}
                  {t.charge > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
                      (+{formatCurrency(t.charge, t.from_currency)} fee)
                    </span>
                  )}
                </td>
                <td style={{ fontWeight: 600, color: 'var(--green-text)' }}>
                  {formatCurrency(t.to_amount, t.to_currency)}
                  {isCross(t) && (
                    <span style={{ fontSize: 11, color: 'var(--blue-text)', marginLeft: 4 }}>
                      ({t.from_currency}→{t.to_currency})
                    </span>
                  )}
                </td>
                <td style={{ color: t.charge > 0 ? 'var(--red-text)' : 'var(--text-muted)', fontSize: 13 }}>
                  {t.charge > 0 ? formatCurrency(t.charge, t.from_currency) : '—'}
                </td>
                <td style={{ color: 'var(--text-secondary)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.note || '—'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDate(t.created_at)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button className="btn-icon" title="View"   onClick={() => openView(t)}     style={{ fontSize: 12 }}>👁</button>
                    <button className="btn-icon" title="Delete" onClick={() => handleDelete(t)} style={{ fontSize: 12, color: 'var(--red-text)' }}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
            {transfers.length === 0 && (
              <tr><td colSpan={8}><div className="empty-state"><div className="empty-state-icon">⇌</div>No transfers yet</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal === 'view' && selected && (
        <Modal title="Transfer Details" onClose={() => setModal(null)} width={440}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <DetailRow label="ID"       value={<span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{selected.id}</span>} />
            <DetailRow label="From"     value={accountName(selected.from_account_id)} />
            <DetailRow label="To"       value={accountName(selected.to_account_id)} />
            <DetailRow label="Sent"     value={<span style={{ fontWeight: 700, color: 'var(--red-text)' }}>{formatCurrency(parseFloat(selected.from_amount) + parseFloat(selected.charge), selected.from_currency)}</span>} />
            <DetailRow label="Charge"   value={selected.charge > 0 ? formatCurrency(selected.charge, selected.from_currency) : '—'} />
            <DetailRow label="Received" value={<span style={{ fontWeight: 700, color: 'var(--green-text)' }}>{formatCurrency(selected.to_amount, selected.to_currency)}</span>} />
            {isCross(selected) && <DetailRow label="Rate" value={`1 ${selected.from_currency} = ${(selected.to_amount / selected.from_amount).toFixed(4)} ${selected.to_currency}`} />}
            <DetailRow label="Note"     value={selected.note || '—'} />
            <DetailRow label="Date"     value={formatDate(selected.created_at)} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn-ghost" onClick={() => setModal(null)}>Close</button>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'create' && (
        <Modal title="New Transfer" onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="From Account *">
                <select value={form.from_account_id} onChange={e => handleFromAccountChange(e.target.value)}>
                  <option value="">— Select —</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                {form.from_account_id && (
                  <div style={{ marginTop: 5, fontSize: 12, color: isOverspend ? 'var(--red-text)' : 'var(--green-text)', fontWeight: 500 }}>
                    {loadingBal ? 'Loading balance…' : fromBalance !== null
                      ? `Available: ${formatCurrency(fromBalance.balance, fromBalance.currency)}`
                      : ''}
                  </div>
                )}
              </Field>
              <Field label="To Account *">
                <select value={form.to_account_id} onChange={e => setForm(f => ({ ...f, to_account_id: e.target.value }))}>
                  <option value="">— Select —</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
              <Field label="Send Amount *">
                <input type="number" min="0" step="0.01" placeholder="0.00" value={form.from_amount} onChange={e => handleFromAmount(e.target.value)} />
              </Field>
              <Field label="Currency">
                <input placeholder="BDT" value={form.from_currency} onChange={e => setForm(f => ({ ...f, from_currency: e.target.value.toUpperCase() }))} />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
              <Field label="Receive Amount *">
                <input type="number" min="0" step="0.01" placeholder="0.00" value={form.to_amount} onChange={e => setForm(f => ({ ...f, to_amount: e.target.value }))} />
              </Field>
              <Field label="Currency">
                <input placeholder="BDT" value={form.to_currency} onChange={e => setForm(f => ({ ...f, to_currency: e.target.value.toUpperCase() }))} />
              </Field>
            </div>

            <Field label="Charge / Fee (deducted from sender)">
              <input type="number" min="0" step="0.01" placeholder="0.00" value={form.charge} onChange={e => setForm(f => ({ ...f, charge: e.target.value }))} />
            </Field>

            <Field label="Note">
              <textarea rows={2} placeholder="e.g. Wallet to Bkash" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} style={{ resize: 'vertical' }} />
            </Field>

            {form.from_amount && form.to_amount && (
              <div style={{ borderRadius: 8, padding: '10px 14px', fontSize: 12, color: isOverspend ? 'var(--red-text)' : 'var(--text-secondary)', background: isOverspend ? 'rgba(239,68,68,0.08)' : 'var(--bg-overlay)', border: `1px solid ${isOverspend ? 'rgba(239,68,68,0.3)' : 'var(--border)'}` }}>
                {isOverspend ? (
                  <>
                    <strong>Insufficient balance!</strong> You need <strong>{formatCurrency(totalDebit, form.from_currency)}</strong> but only have <strong>{formatCurrency(fromBalance.balance, fromBalance.currency)}</strong> available.
                    {parseFloat(form.charge) > 0 && <> (That's {formatCurrency(parseFloat(form.from_amount), form.from_currency)} + {formatCurrency(parseFloat(form.charge), form.from_currency)} fee.)</>}
                  </>
                ) : (
                  <>
                    <strong style={{ color: 'var(--text-primary)' }}>Summary: </strong>
                    Sender pays <strong>{formatCurrency(totalDebit, form.from_currency)}</strong>
                    {parseFloat(form.charge) > 0 && <> ({formatCurrency(parseFloat(form.from_amount), form.from_currency)} + {formatCurrency(parseFloat(form.charge), form.from_currency)} fee)</>}
                    {' '}→ Receiver gets <strong>{formatCurrency(parseFloat(form.to_amount || 0), form.to_currency)}</strong>
                    {form.from_currency !== form.to_currency && parseFloat(form.from_amount) > 0 && (
                      <> @ rate {(parseFloat(form.to_amount) / parseFloat(form.from_amount)).toFixed(4)}</>
                    )}
                    {fromBalance !== null && (
                      <> · After transfer: <strong>{formatCurrency(fromBalance.balance - totalDebit, fromBalance.currency)}</strong> remaining</>
                    )}
                  </>
                )}
              </div>
            )}

            {error && <div style={{ color: 'var(--red-text)', fontSize: 13, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving || isOverspend}>{saving ? 'Saving…' : 'Transfer'}</button>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
