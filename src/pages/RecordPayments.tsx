import { useState } from 'react'
import { X, CreditCard, CheckCircle2, ArrowUpRight, ArrowDownRight, Check } from 'lucide-react'
import { useLedger, LedgerEntry } from '../hooks/useLedger'
import { toast } from 'sonner'

interface Props {
  isOpen: boolean
  onClose: () => void
}

function fmt(n: number) {
  return (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function RecordPayments({ isOpen, onClose }: Props) {
  const { entries, updatePayment, isLoading } = useLedger()
  const [tab, setTab] = useState<'all' | 'receivable' | 'payable'>('all')
  const [partialId, setPartialId] = useState<string | null>(null)
  const [partialAmt, setPartialAmt] = useState('')

  const unpaid = entries
    .filter(e => e.payment_status !== 'paid')
    .filter(e => {
      const isRev = e.type === 'Revenue' || e.type === 'Other Income'
      if (tab === 'receivable') return isRev
      if (tab === 'payable') return !isRev
      return true
    })
    .sort((a, b) => {
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return a.due_date.localeCompare(b.due_date)
    })

  const totalUnpaid = unpaid.reduce((s, e) => s + (e.amount - e.paid_amount), 0)

  async function handleMarkPaid(entry: LedgerEntry) {
    const { error } = await updatePayment(entry.id, {
      payment_status: 'paid',
      paid_at: new Date().toISOString(),
      paid_amount: entry.amount
    })
    if (error) toast.error(error)
    else toast.success('Marked as paid')
  }

  async function handlePartialSave(entry: LedgerEntry) {
    const amt = parseFloat(partialAmt)
    if (isNaN(amt) || amt <= 0) { toast.error('Invalid amount'); return }
    const newPaid = entry.paid_amount + amt
    const newStatus = newPaid >= entry.amount ? 'paid' : 'partial'
    
    const { error } = await updatePayment(entry.id, {
      payment_status: newStatus,
      paid_at: newStatus === 'paid' ? new Date().toISOString() : entry.paid_at,
      paid_amount: newPaid
    })
    
    if (error) toast.error(error)
    else {
      toast.success(newStatus === 'paid' ? 'Fully paid!' : `Recorded partial payment of ${fmt(amt)}`)
      setPartialId(null)
      setPartialAmt('')
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <>
      {/* Backdrop */}
      <div 
        onClick={onClose}
        style={{ 
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, 
          opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s ease', backdropFilter: 'blur(4px)'
        }} 
      />

      {/* Drawer */}
      <div style={{ 
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480, maxWidth: '90vw',
        background: 'var(--bg2)', borderLeft: '1px solid var(--border1)', zIndex: 101,
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 30px rgba(0,0,0,0.3)'
      }}>
        
        {/* Header */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Record Payments</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace' }}>OUTSTANDING TOTAL</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)' }}>{fmt(totalUnpaid)}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text2)', padding: 6, cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Filters */}
        <div style={{ padding: '16px 28px', display: 'flex', gap: 8 }}>
          {(['all', 'receivable', 'payable'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ 
              padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1px solid transparent', cursor: 'pointer', transition: 'all 0.15s',
              background: tab === t ? 'rgba(34,214,135,0.1)' : 'var(--bg3)',
              color: tab === t ? 'var(--green)' : 'var(--text3)',
              borderColor: tab === t ? 'var(--green)' : 'transparent'
            }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px 28px' }}>
          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Loading...</div>
          ) : unpaid.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,214,135,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <CheckCircle2 size={32} color="var(--green)" />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text1)' }}>All caught up!</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>No pending payments.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {unpaid.map(e => {
                const isRev = e.type === 'Revenue' || e.type === 'Other Income'
                const isOverdue = e.due_date && e.due_date < today
                const balance = e.amount - e.paid_amount

                return (
                  <div key={e.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border1)', borderRadius: 12, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: isRev ? 'rgba(34,214,135,0.1)' : 'rgba(240,79,79,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isRev ? 'var(--green)' : 'var(--red)' }}>
                          {isRev ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{e.details}</div>
                          <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>{e.type.toUpperCase()} • SR#{e.sr_no}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{fmt(balance)}</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>of {fmt(e.amount)}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.1)', padding: '8px 12px', borderRadius: 8, marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'DM Mono, monospace' }}>DUE DATE</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: isOverdue ? 'var(--red)' : 'var(--text2)' }}>{e.due_date ?? 'N/A'}</div>
                        {isOverdue && <span style={{ fontSize: 8, background: 'rgba(240,79,79,0.1)', color: 'var(--red)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>OVERDUE</span>}
                      </div>
                      {e.paid_amount > 0 && <div style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600 }}>PARTIAL PAID</div>}
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      {partialId === e.id ? (
                        <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                          <input 
                            autoFocus
                            placeholder="Amount..."
                            value={partialAmt} 
                            onChange={e => setPartialAmt(e.target.value)}
                            style={{ flex: 1, background: 'var(--bg2)', padding: '6px 10px', fontSize: 12 }} 
                          />
                          <button onClick={() => handlePartialSave(e)} style={{ background: 'var(--green)', color: '#000', border: 'none', borderRadius: 6, padding: '0 12px', cursor: 'pointer' }}><Check size={14} /></button>
                          <button onClick={() => setPartialId(null)} style={{ background: 'var(--bg4)', color: 'var(--text3)', border: 'none', borderRadius: 6, padding: '0 12px', cursor: 'pointer' }}><X size={14} /></button>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => handleMarkPaid(e)} style={{ flex: 1, background: 'var(--green)', color: '#0a0c10', border: 'none', borderRadius: 8, padding: '8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>Mark Paid</button>
                          <button onClick={() => { setPartialId(e.id); setPartialAmt('') }} style={{ flex: 1, background: 'var(--bg4)', color: 'var(--text2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>Partial</button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
