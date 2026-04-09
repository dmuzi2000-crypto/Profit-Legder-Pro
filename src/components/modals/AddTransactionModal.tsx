import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { useLedger } from '../../hooks/useLedger'
import { useAccounts } from '../../contexts/AccountsContext'
import { useContacts } from '../../contexts/ContactsContext'

interface AddTransactionModalProps {
    isOpen: boolean
    onClose: () => void
}

interface AddForm {
    details: string
    account_id: string
    account_name: string
    account_subcategory: string
    amount: string
    isUnpaid: boolean
    due_date: string
    contact_id: string
    contact_name: string
}

const EXPENSE_SUBCATS = ['Cost of Sales', 'Operating Expense', 'Interest Expense', 'Tax Expense']

export default function AddTransactionModal({ isOpen, onClose }: AddTransactionModalProps) {
    const { addEntry } = useLedger()
    const { accounts } = useAccounts()
    const { contacts } = useContacts()

    // Only Revenue + Expense accounts appear in transaction dropdown
    const plAccounts = accounts.filter(a => a.category === 'Revenue' || a.category === 'Expense')
    const defaultAccount = plAccounts[0]

    const emptyForm = (): AddForm => ({
        details: '',
        account_id: defaultAccount?.id ?? '',
        account_name: defaultAccount?.name ?? '',
        account_subcategory: defaultAccount?.subcategory ?? '',
        amount: '',
        isUnpaid: false,
        due_date: new Date().toISOString().split('T')[0],
        contact_id: '',
        contact_name: '',
    })

    const [form, setForm] = useState<AddForm>(emptyForm)
    const [saving, setSaving] = useState(false)

    // Update form if defaultAccount changes (e.g. when accounts are loaded)
    useEffect(() => {
        if (defaultAccount && !form.account_id) {
            setForm(f => ({
                ...f,
                account_id: defaultAccount.id,
                account_name: defaultAccount.name,
                account_subcategory: defaultAccount.subcategory
            }))
        }
    }, [defaultAccount])

    function handleAccountChange(id: string) {
        const acc = accounts.find(a => a.id === id)
        if (!acc) return
        setForm(f => ({ ...f, account_id: acc.id, account_name: acc.name, account_subcategory: acc.subcategory }))
    }

    function handleContactChange(id: string) {
        const contact = contacts.find(c => c.id === id)
        if (!contact) {
            setForm(f => ({ ...f, contact_id: '', contact_name: '' }))
            return
        }
        setForm(f => ({ ...f, contact_id: contact.id, contact_name: contact.name }))
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault()
        if (!form.details || !form.amount || !form.account_id) return
        setSaving(true)
        const amt = parseFloat(form.amount)
        if (isNaN(amt) || amt <= 0) { toast.error('Enter a positive amount'); setSaving(false); return }

        const { error } = await addEntry(
            form.details,
            form.account_subcategory,
            amt,
            form.isUnpaid ? 'unpaid' : 'paid',
            form.isUnpaid ? form.due_date : null,
            form.account_id,
            form.account_name,
            form.account_subcategory,
            form.contact_id || null,
            form.contact_name || null
        )

        if (error) toast.error(error)
        else {
            toast.success('Transaction added')
            onClose()
            setForm(emptyForm())
        }
        setSaving(false)
    }

    if (!isOpen) return null

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
            onClick={e => { if (e.target === e.currentTarget) onClose() }}>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 16, padding: 28, width: 480, maxWidth: '95vw' }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Add Transaction</h2>
                <p style={{ fontSize: 12, color: 'var(--text3)', margin: '0 0 22px' }}>Select an account and optionally a contact for this entry.</p>
                <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6, letterSpacing: '0.3px' }}>MEMO / DESCRIPTION</label>
                        <input value={form.details} onChange={e => setForm(f => ({ ...f, details: e.target.value }))} placeholder="e.g. January SaaS subscription" required />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6, letterSpacing: '0.3px' }}>ACCOUNT</label>
                            <select value={form.account_id} onChange={e => handleAccountChange(e.target.value)} style={{ width: '100%' }}>
                                {plAccounts.map(a => (
                                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6, letterSpacing: '0.3px' }}>CONTACT (OPTIONAL)</label>
                            <select value={form.contact_id} onChange={e => handleContactChange(e.target.value)} style={{ width: '100%' }}>
                                <option value="">No Contact</option>
                                {contacts.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} — {c.company}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {form.account_subcategory && (
                        <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', marginTop: -6 }}>
                            {EXPENSE_SUBCATS.includes(form.account_subcategory) ? '↑ EXPENSE' : '↓ REVENUE'} · {form.account_subcategory.toUpperCase()}
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6, letterSpacing: '0.3px' }}>AMOUNT</label>
                        <input type="number" step="0.01" min="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" required />
                    </div>

                    <div style={{ background: 'var(--bg3)', padding: 12, borderRadius: 10, border: '1px solid var(--border1)' }}>
                        <label style={{ fontSize: 13, color: 'var(--text1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input type="checkbox" checked={form.isUnpaid} onChange={e => setForm(f => ({ ...f, isUnpaid: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                            Mark as unpaid
                        </label>
                        {form.isUnpaid && (
                            <div style={{ marginTop: 12 }}>
                                <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6, letterSpacing: '0.3px' }}>DUE DATE</label>
                                <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} required />
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                        <button type="button" onClick={onClose} style={{ padding: '8px 16px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text2)', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                        <button type="submit" disabled={saving} style={{ padding: '8px 20px', background: 'var(--green)', border: 'none', borderRadius: 8, color: '#0a0c10', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : 'Add Transaction'}</button>
                    </div>
                </form>
            </div>
        </div>
    )
}
