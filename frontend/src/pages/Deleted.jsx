import { useEffect, useState } from 'react'
import { getDeletedTransactions, postEvent } from '../services/api'
import { formatCurrency, formatDate } from '../utils/format'
import { generateId } from '../utils/uuid'
import Modal from '../components/Modal'
import Toast from '../components/Toast'

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
              <tr key={t.id} style={{ opacity: 0.75 }}>
                <td><span className={`badge badge-${t.type}`}>{t.type}</span></td>
                <td style={{ fontWeight: 600, color: '#8892a4' }}>{formatCurrency(t.amount, t.currency)}</td>
                <td style={{ color: '#8892a4' }}>{t.category || '—'}</td>
                <td style={{ color: '#8892a4', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.note || '—'}</td>
                <td style={{ color: '#ef4444', fontSize: 12 }}>{formatDate(t.deleted_at)}</td>
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

      {/* View Modal */}
      {modal && selected && (
        <Modal title="Deleted Transaction" onClose={() => setModal(false)} width={420}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#fca5a5' }}>
              Deleted on {formatDate(selected.deleted_at)}
            </div>
            {[
              ['Type',     <span className={`badge badge-${selected.type}`}>{selected.type}</span>],
              ['Amount',   <span style={{ fontWeight: 700, color: '#fca5a5' }}>{formatCurrency(selected.amount, selected.currency)}</span>],
              ['Category', selected.category || '—'],
              ['Note',     selected.note || '—'],
              ['Created',  formatDate(selected.created_at)],
              ['ID',       <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#4a556b' }}>{selected.id}</span>],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #21293d' }}>
                <span style={{ fontSize: 11, color: '#4a556b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</span>
                <span style={{ fontSize: 14, color: '#f0f4ff' }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
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
