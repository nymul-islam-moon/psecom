import { useEffect, useState } from 'react'
import { getAccounts, postEvent } from '../services/api'
import { formatCurrency } from '../utils/format'
import { generateId } from '../utils/uuid'
import api from '../services/api'
import Toast from '../components/Toast'

const PAIRS = [
  { from: 'BDT', to: 'USD', label: '৳ BDT → $ USD' },
  { from: 'USD', to: 'BDT', label: '$ USD → ৳ BDT' },
]

const labelStyle = { display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5, fontWeight: 500 }

const PreviewRow = ({ label, value, color, bold }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
    <span style={{ color: color || 'var(--text-primary)', fontWeight: bold ? 700 : 500 }}>{value}</span>
  </div>
)

export default function Convert() {
  const [accounts, setAccounts]   = useState([])
  const [balances, setBalances]   = useState({})
  const [pair, setPair]           = useState(PAIRS[0])
  const [fromAccount, setFrom]    = useState('')
  const [toAccount, setTo]        = useState('')
  const [amount, setAmount]       = useState('')
  const [rate, setRate]           = useState('')
  const [charge, setCharge]       = useState('')
  const [note, setNote]           = useState('')
  const [saving, setSaving]       = useState(false)
  const [preview, setPreview]     = useState(null)
  const [toast, setToast]         = useState(null)

  const load = async () => {
    const r = await getAccounts()
    setAccounts(r.data)
    const bals = {}
    await Promise.all(r.data.map(async a => {
      try { bals[a.id] = (await api.get(`/accounts/${a.id}/balance`)).data }
      catch { bals[a.id] = { balance: 0 } }
    }))
    setBalances(bals)
  }
  useEffect(() => { load() }, [])

  const fromAccounts = accounts.filter(a => a.currency?.toUpperCase() === pair.from)
  const toAccounts   = accounts.filter(a => a.currency?.toUpperCase() === pair.to)

  useEffect(() => {
    const amt = parseFloat(amount) || 0
    const r   = parseFloat(rate)   || 0
    const chg = parseFloat(charge) || 0
    if (amt <= 0 || r <= 0) { setPreview(null); return }
    const received    = amt * r
    const totalDeduct = amt + chg
    const srcBalance  = balances[fromAccount]?.balance || 0
    setPreview({ amt, received, chg, totalDeduct, srcBalance, canAfford: totalDeduct <= srcBalance })
  }, [amount, rate, charge, fromAccount, balances])

  const handleConvert = async () => {
    if (!fromAccount || !toAccount)  { setToast({ message: 'Select both accounts.', type: 'error' }); return }
    if (!amount || !rate)            { setToast({ message: 'Amount and rate are required.', type: 'error' }); return }
    if (!preview?.canAfford)         { setToast({ message: `Insufficient balance. Have ${formatCurrency(preview?.srcBalance||0, pair.from)}, need ${formatCurrency(preview?.totalDeduct||0, pair.from)}.`, type: 'error' }); return }
    setSaving(true)
    try {
      const convNote = note || `Convert ${formatCurrency(preview.amt, pair.from)} → ${formatCurrency(preview.received, pair.to)} @ ${rate}`
      await postEvent({ event_id: generateId(), action: 'insert', entity: 'transaction', source: 'app', data: { id: generateId(), type: 'expense', amount: preview.amt, currency: pair.from, account_id: fromAccount, category: 'Currency Conversion', note: convNote } })
      await postEvent({ event_id: generateId(), action: 'insert', entity: 'transaction', source: 'app', data: { id: generateId(), type: 'income',  amount: preview.received, currency: pair.to, account_id: toAccount, category: 'Currency Conversion', note: convNote } })
      if (preview.chg > 0) {
        await postEvent({ event_id: generateId(), action: 'insert', entity: 'transaction', source: 'app', data: { id: generateId(), type: 'expense', amount: preview.chg, currency: pair.from, account_id: fromAccount, category: 'Conversion Charge', note: `Charge for: ${convNote}` } })
      }
      setToast({ message: `Converted ${formatCurrency(preview.amt, pair.from)} → ${formatCurrency(preview.received, pair.to)}${preview.chg > 0 ? ` (charge: ${formatCurrency(preview.chg, pair.from)})` : ''}`, type: 'success' })
      setAmount(''); setRate(''); setCharge(''); setNote(''); setFrom(''); setTo(''); setPreview(null)
      load()
    } catch (e) { setToast({ message: e.response?.data?.detail || 'Conversion failed.', type: 'error' }) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ animation: 'fadeUp 0.3s ease', maxWidth: 600 }}>
      <div className="page-header">
        <div>
          <div className="page-title">Currency Conversion</div>
          <div className="page-subtitle">Convert between BDT and USD — charges included</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        {/* Direction */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Conversion Direction</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {PAIRS.map(p => (
              <button key={p.label} onClick={() => { setPair(p); setFrom(''); setTo('') }} style={{
                flex: 1, padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: pair.from === p.from ? 'var(--accent-subtle)' : 'var(--bg-surface)',
                border: `1px solid ${pair.from === p.from ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
                color: pair.from === p.from ? 'var(--accent)' : 'var(--text-secondary)',
              }}>{p.label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>From Account ({pair.from})</label>
            <select value={fromAccount} onChange={e => setFrom(e.target.value)}>
              <option value="">— Select —</option>
              {fromAccounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(balances[a.id]?.balance||0, pair.from)})</option>)}
            </select>
            {fromAccount && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>Balance: <span style={{ color: 'var(--green-text)' }}>{formatCurrency(balances[fromAccount]?.balance||0, pair.from)}</span></div>}
          </div>
          <div>
            <label style={labelStyle}>To Account ({pair.to})</label>
            <select value={toAccount} onChange={e => setTo(e.target.value)}>
              <option value="">— Select —</option>
              {toAccounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(balances[a.id]?.balance||0, pair.to)})</option>)}
            </select>
            {toAccount && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>Balance: <span style={{ color: 'var(--green-text)' }}>{formatCurrency(balances[toAccount]?.balance||0, pair.to)}</span></div>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div><label style={labelStyle}>Amount ({pair.from})</label><input type="number" min="0" step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} /></div>
          <div><label style={labelStyle}>Rate (1 {pair.from} = ? {pair.to})</label><input type="number" min="0" step="0.0001" placeholder="e.g. 0.0091" value={rate} onChange={e => setRate(e.target.value)} /></div>
          <div><label style={labelStyle}>Charge ({pair.from})</label><input type="number" min="0" step="0.01" placeholder="0.00" value={charge} onChange={e => setCharge(e.target.value)} /></div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Note (optional)</label>
          <input placeholder="e.g. Bank conversion" value={note} onChange={e => setNote(e.target.value)} />
        </div>

        {preview && (
          <div style={{ background: 'var(--bg-surface)', border: `1px solid ${preview.canAfford ? 'rgba(99,102,241,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Preview</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <PreviewRow label="You send"     value={formatCurrency(preview.amt, pair.from)}      color="var(--red-text)" />
              <PreviewRow label="Charge"       value={formatCurrency(preview.chg, pair.from)}      color="var(--orange-text)" />
              <PreviewRow label="Total deduct" value={formatCurrency(preview.totalDeduct, pair.from)} color="var(--red-text)" bold />
              <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
              <PreviewRow label="You receive"  value={formatCurrency(preview.received, pair.to)}   color="var(--green-text)" bold />
              <PreviewRow label="Src balance"  value={formatCurrency(preview.srcBalance, pair.from)} color={preview.canAfford ? 'var(--green-text)' : 'var(--red-text)'} />
            </div>
            {!preview.canAfford && (
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--red-text)', background: 'rgba(239,68,68,0.08)', borderRadius: 8, padding: '8px 12px', border: '1px solid rgba(239,68,68,0.2)' }}>
                Insufficient balance — need {formatCurrency(preview.totalDeduct, pair.from)}, have {formatCurrency(preview.srcBalance, pair.from)}.
              </div>
            )}
          </div>
        )}

        <button className="btn-primary" onClick={handleConvert} disabled={saving || !preview || !preview.canAfford} style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14 }}>
          {saving ? 'Processing…' : `⇌ Convert ${amount ? formatCurrency(parseFloat(amount)||0, pair.from) : ''}`}
        </button>
      </div>

      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>How conversion works</div>
        {[
          ['1', 'Source account is debited the full amount (expense)'],
          ['2', 'Destination account is credited the converted amount (income)'],
          ['3', 'Charge (if any) is recorded as a separate expense on the source account'],
        ].map(([n, text]) => (
          <div key={n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, background: 'var(--accent-subtle)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>{n}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', paddingTop: 2 }}>{text}</div>
          </div>
        ))}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
