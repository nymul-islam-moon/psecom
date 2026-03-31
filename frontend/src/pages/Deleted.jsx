import { useEffect, useState } from 'react'
import { getDeletedTransactions, postEvent } from '../services/api'
import { formatCurrency, formatDate } from '../utils/format'
import { generateId } from '../utils/uuid'
import Toast from '../components/Toast'

export default function Deleted() {
  const [transactions, setTransactions] = useState([])
  const [toast, setToast] = useState(null)

  const load = () => getDeletedTransactions().then(r => setTransactions(r.data))
  useEffect(() => { load() }, [])

  const handleRestore = async (txn) => {
    if (!confirm(`Restore "${txn.note || txn.id}"? It will appear back in active transactions.`)) return
    try {
      await postEvent({
        event_id: generateId(),
        action: 'update',
        entity: 'transaction',
        target_id: txn.id,
        source: 'app',
        data: { restore: true },
      })
      setToast({ message: `"${txn.note || txn.id}" restored successfully!`, type: 'success' })
      load()
    } catch (e) {
      setToast({ message: e.response?.data?.detail || 'Restore failed.', type: 'error' })
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Deleted Records</h1>
      <p style={{ color: '#64748b', marginBottom: 24, fontSize: 14 }}>
        Soft-deleted transactions. Nothing is ever permanently lost — restore any record at any time.
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

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
