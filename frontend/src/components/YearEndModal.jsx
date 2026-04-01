import { useState, useEffect } from 'react'
import { getYearEndPreview, executeYearEnd } from '../services/api'
import { formatCurrency } from '../utils/format'
import Modal from './Modal'

/**
 * Year-End Reset Modal — 4 steps:
 *   loading   → fetch preview from API
 *   preview   → show carryforward table, user checks confirmation box
 *   executing → API call in progress, spinner
 *   done      → success summary
 *   error     → show error message
 */
export default function YearEndModal({ onClose, onDone }) {
  const [step, setStep]       = useState('loading')
  const [preview, setPreview] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [result, setResult]   = useState(null)
  const [errMsg, setErrMsg]   = useState('')

  useEffect(() => {
    getYearEndPreview()
      .then(r => { setPreview(r.data); setStep('preview') })
      .catch(e => {
        setErrMsg(e.response?.data?.detail || 'Failed to load preview.')
        setStep('error')
      })
  }, [])

  const handleExecute = async () => {
    setStep('executing')
    try {
      const r = await executeYearEnd()
      setResult(r.data)
      setStep('done')
    } catch (e) {
      setErrMsg(e.response?.data?.detail || 'Year-end reset failed.')
      setStep('error')
    }
  }

  if (step === 'loading') return (
    <Modal title="Year-End Reset" onClose={onClose} width={560}>
      <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 14 }}>
        Loading carryforward preview…
      </div>
    </Modal>
  )

  if (step === 'executing') return (
    <Modal title="Year-End Reset" onClose={() => {}} width={560}>
      <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 14 }}>
        Posting carryforward events to Discord…
        <div style={{ fontSize: 12, marginTop: 8 }}>Do not close this window.</div>
      </div>
    </Modal>
  )

  if (step === 'error') return (
    <Modal title="Year-End Reset" onClose={onClose} width={560}>
      <div style={{ color: 'var(--red-text)', padding: '12px 16px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', marginBottom: 16, fontSize: 13 }}>
        {errMsg}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-ghost" onClick={onClose}>Close</button>
      </div>
    </Modal>
  )

  if (step === 'done') {
    const cf = result?.carried_forward || {}
    return (
      <Modal title="Year-End Reset — Done" onClose={() => { onDone?.(); onClose() }} width={560}>
        <div style={{ color: 'var(--green-text)', padding: '12px 16px', background: 'rgba(16,185,129,0.08)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)', marginBottom: 16, fontSize: 13 }}>
          Carryforward events posted to Discord successfully.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          <SummaryRow label="Accounts re-created"     value={cf.accounts} />
          <SummaryRow label="Opening balances posted" value={cf.opening_balances} />
          <SummaryRow label="Borrows carried forward" value={cf.borrows} />
          <SummaryRow label="Lents carried forward"   value={cf.lents} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 16 }}>
          Old Discord messages are being deleted in the background. The system will auto-sync once purge completes.
          <strong style={{ color: 'var(--text-secondary)', display: 'block', marginTop: 6 }}>
            Refresh the app in ~60 seconds to see your clean new year.
          </strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-primary" onClick={() => { onDone?.(); onClose() }}>Done</button>
        </div>
      </Modal>
    )
  }

  // ── PREVIEW step ───────────────────────────────────────────────────────────
  const { account_balances = [], borrows = [], lents = [], summary = {} } = preview || {}

  return (
    <Modal title="Year-End Reset — Preview" onClose={onClose} width={640}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Warning */}
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 13 }}>
          <strong style={{ color: 'var(--red-text)' }}>This permanently deletes all transaction history and Discord messages.</strong>
          <div style={{ marginTop: 4, color: 'var(--text-secondary)', fontSize: 12 }}>
            The items below are automatically carried forward. Everything else is gone forever.
          </div>
        </div>

        {/* Account balances */}
        <Section title={`Account Opening Balances — ${summary.accounts_with_balance} of ${summary.accounts_total} have a non-zero balance`}>
          {account_balances.length === 0
            ? <Empty>No accounts found.</Empty>
            : (
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr><Th>Account</Th><Th>Type</Th><Th align="right">Balance</Th><Th align="center">Carry?</Th></tr>
                </thead>
                <tbody>
                  {account_balances.map(a => (
                    <tr key={a.account_id} style={{ borderBottom: '1px solid var(--border)', opacity: a.carry ? 1 : 0.45 }}>
                      <Td>{a.account_name}</Td>
                      <Td><span className={`badge badge-${a.account_type}`}>{a.account_type}</span></Td>
                      <Td align="right" style={{ fontWeight: 600, color: a.balance >= 0 ? 'var(--green-text)' : 'var(--red-text)' }}>
                        {formatCurrency(Math.abs(a.balance), a.currency)}
                        {a.balance < 0 && <span style={{ fontSize: 11, marginLeft: 4 }}>(overdraft)</span>}
                      </Td>
                      <Td align="center">
                        {a.carry
                          ? <span style={{ color: 'var(--green-text)', fontSize: 12, fontWeight: 600 }}>YES</span>
                          : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>zero — skip</span>}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </Section>

        {/* Open borrows */}
        <Section title={`You Owe (borrowed) — ${borrows.length} unresolved`}>
          {borrows.length === 0
            ? <Empty>None — nothing to carry forward.</Empty>
            : (
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead><tr><Th>Note</Th><Th align="right">Amount</Th></tr></thead>
                <tbody>
                  {borrows.map(b => (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <Td style={{ color: 'var(--text-secondary)' }}>{b.note || b.category || '—'}</Td>
                      <Td align="right" style={{ fontWeight: 600, color: '#f59e0b' }}>{formatCurrency(b.amount, b.currency)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </Section>

        {/* Open lents */}
        <Section title={`They Owe You (lent) — ${lents.length} unresolved`}>
          {lents.length === 0
            ? <Empty>None — nothing to carry forward.</Empty>
            : (
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead><tr><Th>Note</Th><Th align="right">Amount</Th></tr></thead>
                <tbody>
                  {lents.map(l => (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <Td style={{ color: 'var(--text-secondary)' }}>{l.note || l.category || '—'}</Td>
                      <Td align="right" style={{ fontWeight: 600, color: '#06b6d4' }}>{formatCurrency(l.amount, l.currency)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </Section>

        {/* Confirmation checkbox */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)', padding: '12px 14px', background: 'var(--bg-surface)', borderRadius: 8, border: `1px solid ${confirmed ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`, transition: 'border-color 0.15s' }}>
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
          <span>
            I understand this will permanently delete all history and Discord messages.
            The balances and open debts listed above will be carried forward automatically.
          </span>
        </label>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            onClick={handleExecute}
            disabled={!confirmed}
            style={{
              padding: '8px 20px', borderRadius: 8, fontWeight: 600, fontSize: 13,
              cursor: confirmed ? 'pointer' : 'not-allowed',
              background: confirmed ? 'rgba(239,68,68,0.15)' : 'var(--bg-overlay)',
              color: confirmed ? 'var(--red-text)' : 'var(--text-muted)',
              border: `1px solid ${confirmed ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
              transition: 'all 0.15s',
            }}
          >
            Execute Year-End Reset
          </button>
        </div>

      </div>
    </Modal>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  )
}

function Empty({ children }) {
  return <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 0' }}>{children}</div>
}

function Th({ children, align = 'left' }) {
  return (
    <th style={{ textAlign: align, padding: '6px 10px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>
      {children}
    </th>
  )
}

function Td({ children, align = 'left', style: s = {} }) {
  return <td style={{ textAlign: align, padding: '8px 10px', color: 'var(--text-primary)', ...s }}>{children}</td>
}

function SummaryRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', borderRadius: 6, background: 'var(--bg-surface)', border: '1px solid var(--border)', fontSize: 13 }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <strong style={{ color: 'var(--text-primary)' }}>{value}</strong>
    </div>
  )
}
