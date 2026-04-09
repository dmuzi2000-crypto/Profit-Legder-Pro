import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import { useLedger } from '../hooks/useLedger'
import type { LedgerEntry } from '../hooks/useLedger'
import AddTransactionModal from '../components/modals/AddTransactionModal'

function fmtAmt(n: number) {
  return '$' + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const EXPENSE_SUBCATS = ['Cost of Sales', 'Operating Expense', 'Interest Expense', 'Tax Expense']

function AccountBadge({ entry }: { entry: LedgerEntry }) {
  const isExpense = entry.account_subcategory ? EXPENSE_SUBCATS.includes(entry.account_subcategory) : !['Revenue', 'Other Income'].includes(entry.type)
  return (
    <span style={{
      background: isExpense ? 'rgba(240,79,79,0.1)' : 'rgba(34,214,135,0.1)',
      color: isExpense ? 'var(--red)' : 'var(--green)',
      fontSize: 10, fontFamily: 'DM Mono, monospace', padding: '3px 8px', borderRadius: 20
    }}>
      {entry.account_name ?? entry.type}
    </span>
  )
}

function StatusDot({ entry }: { entry: LedgerEntry }) {
  if (entry.payment_status === 'paid' || (!entry.due_date && entry.payment_status !== 'unpaid' && entry.payment_status !== 'partial')) {
    return <div title="Paid" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px rgba(34,214,135,0.4)' }} />
  }
  const today = new Date().toISOString().split('T')[0]
  const isOverdue = entry.due_date && entry.due_date < today
  if (isOverdue) return <div title={`Overdue (Due: ${entry.due_date})`} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', boxShadow: '0 0 8px rgba(240,79,79,0.4)' }} />
  return <div title={`Unpaid (Due: ${entry.due_date ?? 'N/A'})`} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--amber)', boxShadow: '0 0 8px rgba(245,166,35,0.4)' }} />
}

export default function Transactions() {
  const { entries, isLoading, updateEntry, deleteEntry } = useLedger()
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<LedgerEntry>>({})

  async function handleDelete(id: string) {
    if (!confirm('Delete this transaction?')) return
    const { error } = await deleteEntry(id)
    if (error) toast.error(error)
    else toast.success('Transaction deleted')
  }

  async function handleEditSave(id: string) {
    const { error } = await updateEntry(id, { details: editForm.details, type: editForm.type, amount: editForm.amount })
    if (error) toast.error(error)
    else { toast.success('Transaction updated'); setEditId(null) }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 56, background: 'var(--bg2)', borderBottom: '1px solid var(--border1)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 12 }}>
        <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0, flex: 1 }}>Transactions</h1>
        <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--green)', border: 'none', borderRadius: 8, color: '#0a0c10', fontSize: 12, fontWeight: 700, fontFamily: 'Syne, sans-serif', cursor: 'pointer' }}>
          <Plus size={14} /> Add Transaction
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border1)', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['', 'SR', 'Details', 'Account', 'Contact', 'Amount', 'Actions'].map((h, i) => (
                  <th key={h} style={{ textAlign: i >= 5 ? 'right' : 'left', padding: '11px 16px', fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', letterSpacing: '0.5px', borderBottom: '1px solid var(--border1)', fontWeight: 500, background: 'var(--bg3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>Loading transactions...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No transactions yet. Click "Add Transaction" to get started.</td></tr>
              ) : entries.map(entry => (
                <tr key={entry.id} style={{ transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '11px 0 11px 16px', borderBottom: '1px solid var(--border1)', width: 30 }}>
                    <StatusDot entry={entry} />
                  </td>
                  <td style={{ padding: '11px 16px', color: 'var(--text3)', fontFamily: 'DM Mono, monospace', fontSize: 11, borderBottom: '1px solid var(--border1)' }}>{entry.sr_no}</td>
                  <td style={{ padding: '11px 16px', borderBottom: '1px solid var(--border1)', color: 'var(--text1)' }}>
                    {editId === entry.id
                      ? <input value={editForm.details ?? ''} onChange={e => setEditForm(f => ({ ...f, details: e.target.value }))} style={{ padding: '5px 8px', fontSize: 12 }} />
                      : entry.details}
                  </td>
                  <td style={{ padding: '11px 16px', borderBottom: '1px solid var(--border1)' }}>
                    <AccountBadge entry={entry} />
                  </td>
                  <td style={{ padding: '11px 16px', borderBottom: '1px solid var(--border1)', color: 'var(--text2)' }}>
                    {entry.contact_name ?? '—'}
                  </td>
                  <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'DM Mono, monospace', borderBottom: '1px solid var(--border1)', color: EXPENSE_SUBCATS.includes(entry.account_subcategory ?? '') ? 'var(--red)' : 'var(--green)' }}>
                    {editId === entry.id
                      ? <input type="number" value={editForm.amount ?? ''} onChange={e => setEditForm(f => ({ ...f, amount: parseFloat(e.target.value) }))} style={{ padding: '5px 8px', fontSize: 12, width: 120, textAlign: 'right' }} />
                      : fmtAmt(entry.amount)}
                  </td>
                  <td style={{ padding: '11px 16px', textAlign: 'right', borderBottom: '1px solid var(--border1)' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {editId === entry.id ? (
                        <>
                          <button onClick={() => handleEditSave(entry.id)} style={{ background: 'rgba(34,214,135,0.1)', border: 'none', color: 'var(--green)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Check size={13} /></button>
                          <button onClick={() => setEditId(null)} style={{ background: 'var(--bg3)', border: 'none', color: 'var(--text3)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={13} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditId(entry.id); setEditForm({ details: entry.details, type: entry.type, amount: entry.amount }) }}
                            style={{ background: 'none', border: 'none', color: 'var(--text3)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--blue)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}>
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleDelete(entry.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--text3)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}>
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AddTransactionModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  )
}
