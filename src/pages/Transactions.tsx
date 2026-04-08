import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import { useLedger } from '../hooks/useLedger'
const ENTRY_TYPES = ['Revenue','Cost of Sales','Operational Expenses','Other Income','Interest Expense','Tax Expense'] as const
import type { LedgerEntry } from '../hooks/useLedger'

function fmt(n: number) {
  return (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function TypeBadge({ type, amount }: { type: string; amount: number }) {
  const isPos = amount >= 0
  return (
    <span style={{ background: isPos ? 'rgba(34,214,135,0.1)' : 'rgba(240,79,79,0.1)', color: isPos ? 'var(--green)' : 'var(--red)', fontSize: 10, fontFamily: 'DM Mono, monospace', padding: '3px 8px', borderRadius: 20 }}>{type}</span>
  )
}

interface AddModal {
  details: string; type: string; amount: string; isUnpaid: boolean; due_date: string
}

function StatusDot({ entry }: { entry: LedgerEntry }) {
  if (entry.payment_status === 'paid') return <div title="Paid" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px rgba(34,214,135,0.4)' }} />
  
  const today = new Date().toISOString().split('T')[0]
  const isOverdue = entry.due_date && entry.due_date < today
  
  if (isOverdue) return <div title={`Overdue (Due: ${entry.due_date})`} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', boxShadow: '0 0 8px rgba(240,79,79,0.4)' }} />
  return <div title={`Unpaid (Due: ${entry.due_date ?? 'N/A'})`} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--amber)', boxShadow: '0 0 8px rgba(245,166,35,0.4)' }} />
}

export default function Transactions() {
  const { entries, isLoading, addEntry, updateEntry, deleteEntry } = useLedger()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<AddModal>({ details: '', type: 'Revenue', amount: '', isUnpaid: false, due_date: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<LedgerEntry>>({})

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.details || !form.amount) return
    setSaving(true)
    const amt = parseFloat(form.amount)
    if (isNaN(amt)) { toast.error('Invalid amount'); setSaving(false); return }
    const { error } = await addEntry(form.details, form.type, amt, form.isUnpaid ? 'unpaid' : 'paid', form.isUnpaid ? form.due_date : null)
    if (error) toast.error(error)
    else { toast.success('Transaction added'); setShowModal(false); setForm({ details: '', type: 'Revenue', amount: '', isUnpaid: false, due_date: new Date().toISOString().split('T')[0] }) }
    setSaving(false)
  }

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
      {/* Topbar */}
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
                {['', 'SR', 'Details', 'Type', 'Amount', 'Actions'].map((h, i) => (
                  <th key={h} style={{ textAlign: i >= 4 ? 'right' : 'left', padding: '11px 16px', fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', letterSpacing: '0.5px', borderBottom: '1px solid var(--border1)', fontWeight: 500, background: 'var(--bg3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>Loading transactions...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No transactions yet. Click "Add Transaction" to get started.</td></tr>
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
                    {editId === entry.id
                      ? <select value={editForm.type ?? ''} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))} style={{ padding: '5px 8px', fontSize: 12 }}>
                          {ENTRY_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                      : <TypeBadge type={entry.type} amount={entry.amount} />}
                  </td>
                  <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'DM Mono, monospace', color: entry.amount >= 0 ? 'var(--green)' : 'var(--red)', borderBottom: '1px solid var(--border1)' }}>
                    {editId === entry.id
                      ? <input type="number" value={editForm.amount ?? ''} onChange={e => setEditForm(f => ({ ...f, amount: parseFloat(e.target.value) }))} style={{ padding: '5px 8px', fontSize: 12, width: 120, textAlign: 'right' }} />
                      : fmt(entry.amount)}
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
                          <button onClick={() => { setEditId(entry.id); setEditForm({ details: entry.details, type: entry.type, amount: entry.amount }) }} style={{ background: 'none', border: 'none', color: 'var(--text3)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--blue)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}>
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleDelete(entry.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
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

      {/* Add Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 16, padding: 28, width: 460, maxWidth: '95vw' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Add Transaction</h2>
            <p style={{ fontSize: 12, color: 'var(--text3)', margin: '0 0 22px' }}>Transaction is automatically scoped to your workspace.</p>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6, letterSpacing: '0.3px' }}>DETAILS</label>
                <input value={form.details} onChange={e => setForm(f => ({ ...f, details: e.target.value }))} placeholder="e.g. Product Sales" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6, letterSpacing: '0.3px' }}>TYPE</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    {ENTRY_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6, letterSpacing: '0.3px' }}>AMOUNT</label>
                  <input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="-12000" required />
                </div>
              </div>

              <div style={{ background: 'var(--bg3)', padding: 12, borderRadius: 10, border: '1px solid var(--border1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: 13, color: 'var(--text1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={form.isUnpaid} onChange={e => setForm(f => ({ ...f, isUnpaid: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                    Mark as unpaid
                  </label>
                </div>
                {form.isUnpaid && (
                  <div style={{ marginTop: 12 }}>
                    <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6, letterSpacing: '0.3px' }}>DUE DATE</label>
                    <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} required />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text2)', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '8px 20px', background: 'var(--green)', border: 'none', borderRadius: 8, color: '#0a0c10', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : 'Add Transaction'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
