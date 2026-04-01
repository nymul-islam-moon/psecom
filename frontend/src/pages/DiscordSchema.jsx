import { useState } from 'react'
import { generateId } from '../utils/uuid'

const TEMPLATES = {
  'Add Transaction (expense)': {
    event_id: '__generate__', action: 'insert', entity: 'transaction',
    data: { id: '__generate__', type: 'expense', amount: 0, currency: 'BDT', account_id: 'your-account-id', category: 'Food', note: 'Description here' },
  },
  'Add Transaction (income)': {
    event_id: '__generate__', action: 'insert', entity: 'transaction',
    data: { id: '__generate__', type: 'income', amount: 0, currency: 'BDT', account_id: 'your-account-id', category: 'Salary', note: 'Description here' },
  },
  'Add Transaction (transfer)': {
    event_id: '__generate__', action: 'insert', entity: 'transaction',
    data: { id: '__generate__', type: 'transfer', amount: 0, currency: 'BDT', account_id: 'your-account-id', category: 'Transfer', note: 'From X to Y' },
  },
  'Update Transaction': {
    event_id: '__generate__', action: 'update', entity: 'transaction',
    target_id: 'existing-transaction-id', data: { amount: 0, category: 'NewCategory', note: 'Updated note' },
  },
  'Delete Transaction': {
    event_id: '__generate__', action: 'delete', entity: 'transaction',
    target_id: 'existing-transaction-id', data: {},
  },
  'Add Account (Cash)':   { event_id: '__generate__', action: 'insert', entity: 'account', data: { id: '__generate__', name: 'My Wallet', type: 'cash',   currency: 'BDT' } },
  'Add Account (Bank)':   { event_id: '__generate__', action: 'insert', entity: 'account', data: { id: '__generate__', name: 'My Bank',   type: 'bank',   currency: 'BDT' } },
  'Add Account (bKash)':  { event_id: '__generate__', action: 'insert', entity: 'account', data: { id: '__generate__', name: 'bKash',     type: 'bkash',  currency: 'BDT' } },
  'Add Account (Nagad)':  { event_id: '__generate__', action: 'insert', entity: 'account', data: { id: '__generate__', name: 'Nagad',     type: 'nagad',  currency: 'BDT' } },
  'Add Account (Rocket)': { event_id: '__generate__', action: 'insert', entity: 'account', data: { id: '__generate__', name: 'Rocket',    type: 'rocket', currency: 'BDT' } },
  'Update Account': {
    event_id: '__generate__', action: 'update', entity: 'account',
    target_id: 'existing-account-id', data: { name: 'New Name', type: 'bank' },
  },
}

function resolveIds(obj) {
  let result = JSON.stringify(obj)
  const matches = result.match(/"__generate__"/g) || []
  for (let i = 0; i < matches.length; i++) result = result.replace('"__generate__"', `"${generateId()}"`)
  return JSON.parse(result)
}

export default function DiscordSchema() {
  const [selected, setSelected] = useState(Object.keys(TEMPLATES)[0])
  const [json, setJson]         = useState('')
  const [copied, setCopied]     = useState(false)
  const [jsonError, setJsonError] = useState('')

  const generate = () => { setJson(JSON.stringify(resolveIds(TEMPLATES[selected]), null, 2)); setJsonError(''); setCopied(false) }

  const refreshIds = () => {
    if (!json || jsonError) return
    try {
      const obj = JSON.parse(json)
      obj.event_id = generateId()
      if (obj.data?.id) obj.data.id = generateId()
      setJson(JSON.stringify(obj, null, 2)); setCopied(false)
    } catch {}
  }

  const handleEdit = (val) => {
    setJson(val); setCopied(false)
    try { JSON.parse(val); setJsonError('') }
    catch { setJsonError('Invalid JSON — fix before copying') }
  }

  const handleCopy = () => {
    if (jsonError) return
    try { navigator.clipboard.writeText(JSON.stringify(JSON.parse(json))); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch {}
  }

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Discord Schema</div>
          <div className="page-subtitle">Generate JSON to post in your Discord finance channel</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>
        {/* Template list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Object.keys(TEMPLATES).map(name => (
            <button
              key={name}
              onClick={() => { setSelected(name); setJson(''); setCopied(false) }}
              style={{
                background: selected === name ? 'var(--accent-subtle)' : 'var(--bg-surface)',
                color: selected === name ? 'var(--accent)' : 'var(--text-secondary)',
                border: `1px solid ${selected === name ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
                borderRadius: 8, padding: '10px 14px',
                textAlign: 'left', fontSize: 13,
                fontWeight: selected === name ? 600 : 400,
              }}
            >{name}</button>
          ))}
        </div>

        {/* Editor */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={generate}>Generate JSON</button>
            {json && !jsonError && (
              <button className="btn-ghost" onClick={refreshIds}>🔄 New IDs</button>
            )}
            <button
              className="btn-ghost"
              onClick={handleCopy}
              disabled={!json || !!jsonError}
              style={copied ? { background: 'rgba(16,185,129,0.15)', color: 'var(--green-text)', border: '1px solid rgba(16,185,129,0.3)' } : {}}
            >
              {copied ? '✓ Copied!' : '📋 Copy for Discord'}
            </button>
          </div>

          {json ? (
            <>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Edit the values below, then click <strong style={{ color: 'var(--text-secondary)' }}>Copy for Discord</strong>.
              </div>
              <textarea
                value={json}
                onChange={e => handleEdit(e.target.value)}
                rows={20}
                style={{
                  fontFamily: 'monospace', fontSize: 13,
                  background: 'var(--bg-surface)',
                  border: `1px solid ${jsonError ? 'rgba(239,68,68,0.5)' : 'var(--border)'}`,
                  borderRadius: 8, color: 'var(--text-primary)',
                  padding: 14, resize: 'vertical',
                }}
              />
              {jsonError && <div style={{ color: 'var(--red-text)', fontSize: 13 }}>{jsonError}</div>}
            </>
          ) : (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>
              Click <strong style={{ color: 'var(--accent-light)' }}>Generate JSON</strong> to create a template for "{selected}"
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>How to use:</div>
            <ol style={{ color: 'var(--text-secondary)', fontSize: 13, paddingLeft: 18, lineHeight: 1.8 }}>
              <li>Click <strong>Generate JSON</strong> to create the template</li>
              <li>Edit the values (amount, category, note, account_id, etc.)</li>
              <li>Click <strong>Copy for Discord</strong> — copies as a single line</li>
              <li>Paste into your Discord finance channel and send</li>
              <li>The bot replies with ✅ and the data appears here instantly</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
