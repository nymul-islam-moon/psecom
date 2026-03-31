import { useEffect, useState } from 'react'
import { getDeletedTransactions, postEvent } from '../services/api'
import { formatCurrency, formatDate } from '../utils/format'
import { generateId } from '../utils/uuid'

export default function Deleted() {
  const [transactions, setTransactions] = useState([])

  const load = () => getDeletedTransactions().then(r => setTransactions(r.data))
  useEffect(() => { load() }, [])

  const handleRestore = async (txn) => {
    if (!confirm(`Restore "${txn.note || txn.id}"? It will appear back in active transactions.`)) return
    try {
      // Restore = update with deleted_at cleared via a special update
      // We re-insert using original data, the engine will update deleted_at to null
      await postEvent({
        event_id: generateId(),
        action: 'update',
        entity: 'transaction',
        target_id: txn.id,
        source: 'app',
        data: { restore: true },
      })
      load()
    } catch (e) {
      alert('Restore failed: ' + (e.response?.data?.detail || e.message))
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Deleted Records</h1>
      <p style={{ color: '#64748b', marginBottom: 24, fontSize: 14 }}>
        Soft-deleted transactions. Data is preserved in the events log — nothing is ever permanently lost. You can restore any record.
      </p>

      <div className="card">
        <table>
          <thead>
            <tr><th>Type</th><th>Amount</th><th>Category</th><th>Note</th><th>Deleted At</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {transactions.map(t => (
              <tr key={t.id} style={{ opacity: 0.7 }}>
                <td><span className={`badge badge-${t.type}`}>{t.type}</span></td>
                <td>{formatCurrency(t.amount, t.currency)}</td>
                <td style={{ color: '#94a3b8' }}>{t.category || '—'}</td>
                <td style={{ color: '#94a3b8' }}>{t.note || '—'}</td>
                <td style={{ color: '#ef4444', fontSize: 12 }}>{formatDate(t.deleted_at)}</td>
                <td>
                  <button className="btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => handleRestore(t)}>
                    ♻️ Restore
                  </button>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>No deleted records</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
