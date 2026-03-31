import { useState } from 'react'
import { generateId } from '../utils/uuid'

const TEMPLATES = {
  'Add Transaction (expense)': {
    event_id: '__generate__',
    action: 'insert',
    entity: 'transaction',
    data: {
      id: '__generate__',
      type: 'expense',
      amount: 0,
      currency: 'USD',
      account_id: 'your-account-id',
      category: 'Food',
      note: 'Description here',
    },
  },
  'Add Transaction (income)': {
    event_id: '__generate__',
    action: 'insert',
    entity: 'transaction',
    data: {
      id: '__generate__',
      type: 'income',
      amount: 0,
      currency: 'USD',
      account_id: 'your-account-id',
      category: 'Salary',
      note: 'Description here',
    },
  },
  'Add Transaction (transfer)': {
    event_id: '__generate__',
    action: 'insert',
    entity: 'transaction',
    data: {
      id: '__generate__',
      type: 'transfer',
      amount: 0,
      currency: 'USD',
      account_id: 'your-account-id',
      category: 'Transfer',
      note: 'From X to Y',
    },
  },
  'Update Transaction': {
    event_id: '__generate__',
    action: 'update',
    entity: 'transaction',
    target_id: 'existing-transaction-id',
    data: {
      amount: 0,
      category: 'NewCategory',
      note: 'Updated note',
    },
  },
  'Delete Transaction': {
    event_id: '__generate__',
    action: 'delete',
    entity: 'transaction',
    target_id: 'existing-transaction-id',
    data: {},
  },
  'Add Account': {
    event_id: '__generate__',
    action: 'insert',
    entity: 'account',
    data: {
      id: '__generate__',
      name: 'My Account',
      type: 'cash',
      currency: 'USD',
    },
  },
  'Update Account': {
    event_id: '__generate__',
    action: 'update',
    entity: 'account',
    target_id: 'existing-account-id',
    data: {
      name: 'New Name',
      type: 'bank',
    },
  },
}

function resolveIds(obj) {
  const str = JSON.stringify(obj)
  let result = str
  const matches = str.match(/"__generate__"/g) || []
  for (let i = 0; i < matches.length; i++) {
    result = result.replace('"__generate__"', `"${generateId()}"`)
  }
  return JSON.parse(result)
}

export default function DiscordSchema() {
  const [selected, setSelected] = useState(Object.keys(TEMPLATES)[0])
  const [json, setJson] = useState('')
  const [copied, setCopied] = useState(false)
  const [jsonError, setJsonError] = useState('')

  const generate = () => {
    const resolved = resolveIds(TEMPLATES[selected])
    setJson(JSON.stringify(resolved, null, 2))
    setJsonError('')
    setCopied(false)
  }

  const handleEdit = (val) => {
    setJson(val)
    setCopied(false)
    try { JSON.parse(val); setJsonError('') }
    catch { setJsonError('Invalid JSON — fix before copying') }
  }

  const handleCopy = () => {
    if (jsonError) return
    // Collapse to single line for Discord
    try {
      const compact = JSON.stringify(JSON.parse(json))
      navigator.clipboard.writeText(compact)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Discord Message Schema</h1>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
        Select a template, customize the values, then copy and paste into your Discord finance channel.
        The bot will process it instantly.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>
        {/* Template list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Object.keys(TEMPLATES).map(name => (
            <button
              key={name}
              onClick={() => { setSelected(name); setJson(''); setCopied(false) }}
              style={{
                background: selected === name ? '#312e81' : '#1e293b',
                color: selected === name ? '#a5b4fc' : '#94a3b8',
                border: `1px solid ${selected === name ? '#6366f1' : '#334155'}`,
                borderRadius: 8,
                padding: '10px 14px',
                textAlign: 'left',
                fontSize: 13,
                fontWeight: selected === name ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-primary" onClick={generate}>Generate JSON</button>
            <button
              className={copied ? 'btn-ghost' : 'btn-ghost'}
              onClick={handleCopy}
              disabled={!json || !!jsonError}
              style={{ background: copied ? '#14532d' : undefined, color: copied ? '#86efac' : undefined }}
            >
              {copied ? '✅ Copied!' : '📋 Copy for Discord'}
            </button>
          </div>

          {json ? (
            <>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Edit the values below, then click <strong>Copy for Discord</strong>.
                IDs are auto-generated — don't change them unless you know what you're editing.
              </div>
              <textarea
                value={json}
                onChange={e => handleEdit(e.target.value)}
                rows={20}
                style={{
                  fontFamily: 'monospace',
                  fontSize: 13,
                  background: '#0f172a',
                  border: `1px solid ${jsonError ? '#ef4444' : '#334155'}`,
                  borderRadius: 8,
                  color: '#e2e8f0',
                  padding: 14,
                  resize: 'vertical',
                }}
              />
              {jsonError && <div style={{ color: '#fca5a5', fontSize: 13 }}>{jsonError}</div>}
            </>
          ) : (
            <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>
              Click <strong style={{ color: '#a5b4fc' }}>Generate JSON</strong> to create a template for "{selected}"
            </div>
          )}

          <div style={{ borderTop: '1px solid #334155', paddingTop: 14 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>How to use:</div>
            <ol style={{ color: '#94a3b8', fontSize: 13, paddingLeft: 18, lineHeight: 1.8 }}>
              <li>Click <strong>Generate JSON</strong> to create the template</li>
              <li>Edit the values (amount, category, note, account_id, etc.)</li>
              <li>Click <strong>Copy for Discord</strong> — it copies as a single line</li>
              <li>Paste into your Discord finance channel and send</li>
              <li>The bot replies with ✅ and the data appears here instantly</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
