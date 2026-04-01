import { useEffect, useState } from 'react'
import { getDeletedTransactions, postEvent } from '../services/api'
import { formatCurrency, formatDate } from '../utils/format'
import { generateId } from '../utils/uuid'
import Modal from '../components/Modal'
import Toast from '../components/Toast'

const DetailRow = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
    <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{value}</span>
  </div>
)

export default function Deleted() {
  const [transactions, setTransactions] = useState([])
  const [selected, setSelected]         = useState(null)
  const [modal, setModal]               = useState(false)
  const [toast, setToast]               = useState(null)

  const load = () => getDeletedTransactions().then(r => setTransactions(r.data))
  useEffect(() => { load() }, [])

  const handleRestore = async (t) => {
    if (!confirm(`Restore "${t.note || t.id}"?`)) return
    try {
      await postEvent({ event_id: generateId(), action: 'update', entity: 'transaction', target_id: t.id, source: 'app', data: { restore: true } })
      setToast({ message: `"${t.note || t.id}" restored!`, type: 'success' })
      load()
    } catch (e) { setToast({ message: e.response?.data?.detail || 'Restore failed.', type: 'error' }) }
  }

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Deleted Records</div>
          <div className="page-subtitle">Soft-deleted — nothing is permanently lost</div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr><th>Type</th><th>Amount</th><th>Category</th><th>Note</th><th>Deleted At</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {transactions.map(t => (
              <tr key={t.id} style={{ opacity: 0.8 }}>
                <td><span className={`badge badge-${t.type}`}>{t.type}</span></td>
                <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{formatCurrency(t.amount, t.currency)}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{t.category || '—'}</td>
                <td style={{ color: 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.note || '—'}</td>
                <td style={{ color: 'var(--red-text)', fontSize: 12 }}>{formatDate(t.deleted_at)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button className="btn-icon" style={{ fontSize: 12 }} title="View" onClick={() => { setSelected(t); setModal(true) }}>👁</button>
                    <button className="btn-success" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => handleRestore(t)}>↺ Restore</button>
                  </div>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">○</div>No deleted records</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && selected && (
        <Modal title="Deleted Transaction" onClose={() => setModal(false)} width={420}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: 'var(--red-text)' }}>
              Deleted on {formatDate(selected.deleted_at)}
            </div>
            <DetailRow label="Type"    value={<span className={`badge badge-${selected.type}`}>{selected.type}</span>} />
            <DetailRow label="Amount"  value={<span style={{ fontWeight: 700, color: 'var(--red-text)' }}>{formatCurrency(selected.amount, selected.currency)}</span>} />
            <DetailRow label="Category" value={selected.category || '—'} />
            <DetailRow label="Note"    value={selected.note || '—'} />
            <DetailRow label="Created" value={formatDate(selected.created_at)} />
            <DetailRow label="ID"      value={<span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{selected.id}</span>} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn-success" onClick={() => { setModal(false); handleRestore(selected) }}>↺ Restore</button>
              <button className="btn-ghost" onClick={() => setModal(false)}>Close</button>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
