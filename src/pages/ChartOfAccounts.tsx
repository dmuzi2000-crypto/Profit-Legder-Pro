import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import { useAccounts } from '../hooks/useAccounts'
import { CATEGORIES, SUBCATEGORIES, CAT_COLORS } from '../contexts/AccountsContext'
import type { Account } from '../types/database'
import type { Category } from '../contexts/AccountsContext'


function fmt(n: number) {
  return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2 })
}

const EMPTY = { code: '', name: '', category: 'Asset' as Category, subcategory: 'Current Asset', balance: '' }

export default function ChartOfAccounts() {
  const { accounts, isLoading, addAccount, updateAccount, deleteAccount } = useAccounts()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Account>>({})
  const [filter, setFilter] = useState<Category | 'All'>('All')

  const filtered = filter === 'All' ? accounts : accounts.filter(a => a.category === filter)

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = filtered.filter(a => a.category === cat)
    return acc
  }, {} as Record<Category, Account[]>)

  const totals = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = accounts.filter(a => a.category === cat).reduce((s, a) => s + a.balance, 0)
    return acc
  }, {} as Record<Category, number>)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code || !form.name) return
    const { error } = await addAccount({
      code: form.code,
      name: form.name,
      category: form.category,
      subcategory: form.subcategory,
      balance: parseFloat(String(form.balance)) || 0,
    })
    if (error) toast.error(error)
    else {
      toast.success('Account added')
      setShowModal(false)
      setForm(EMPTY)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this account?')) return
    const { error } = await deleteAccount(id)
    if (error) toast.error(error)
    else toast.success('Account deleted')
  }

  async function handleEditSave(id: string) {
    const { error } = await updateAccount(id, editForm)
    if (error) toast.error(error)
    else {
      toast.success('Account updated')
      setEditId(null)
    }
  }

  const tdStyle = { padding: '10px 14px', borderBottom: '1px solid var(--border1)', fontSize: 13 }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Topbar */}
      <div style={{ height: 56, background: 'var(--bg2)', borderBottom: '1px solid var(--border1)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 12 }}>
        <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0, flex: 1 }}>Chart of Accounts</h1>
        <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--green)', border: 'none', borderRadius: 8, color: '#0a0c10', fontSize: 12, fontWeight: 700, fontFamily: 'Syne, sans-serif', cursor: 'pointer' }}>
          <Plus size={14} /> Add Account
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 24 }}>
          {CATEGORIES.map(cat => (
            <div key={cat} onClick={() => setFilter(filter === cat ? 'All' : cat)}
              style={{ background: filter === cat ? CAT_COLORS[cat].bg : 'var(--bg2)', border: `1px solid ${filter === cat ? CAT_COLORS[cat].color : 'var(--border1)'}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'all .15s' }}>
              <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6, letterSpacing: '.5px' }}>{cat.toUpperCase()}</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'DM Serif Display, serif', color: CAT_COLORS[cat].color }}>{fmt(totals[cat])}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>{accounts.filter(a => a.category === cat).length} accounts</div>
            </div>
          ))}
        </div>

        {/* Table grouped by category */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border1)', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg3)' }}>
                {['Code', 'Account Name', 'Category', 'Subcategory', 'Balance', 'Actions'].map((h, i) => (
                  <th key={h} style={{ ...tdStyle, fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', letterSpacing: '.5px', fontWeight: 500, textAlign: i >= 4 ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text3)', padding: 40 }}>Loading chart of accounts...</td></tr>
              ) : CATEGORIES.map(cat => {
                const rows = grouped[cat]
                if (!rows.length) return null
                return rows.map((acc, i) => (
                  <tr key={acc.id}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ ...tdStyle, fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text3)' }}>
                      {editId === acc.id ? <input value={editForm.code ?? ''} onChange={e => setEditForm(f => ({ ...f, code: e.target.value }))} style={{ padding: '4px 8px', fontSize: 12, width: 70 }} /> : acc.code}
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--text1)', fontWeight: 500 }}>
                      {editId === acc.id ? <input value={editForm.name ?? ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} style={{ padding: '4px 8px', fontSize: 12, width: 180 }} /> : acc.name}
                    </td>
                    <td style={tdStyle}>
                      {i === 0 && <span style={{ background: CAT_COLORS[cat].bg, color: CAT_COLORS[cat].color, fontSize: 10, fontFamily: 'DM Mono, monospace', padding: '2px 8px', borderRadius: 20 }}>{cat}</span>}
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--text2)', fontSize: 12 }}>
                      {editId === acc.id
                        ? <select value={editForm.subcategory ?? ''} onChange={e => setEditForm(f => ({ ...f, subcategory: e.target.value }))} style={{ padding: '4px 8px', fontSize: 12 }}>
                            {SUBCATEGORIES[editForm.category as Category ?? cat].map(s => <option key={s}>{s}</option>)}
                          </select>
                        : acc.subcategory}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'DM Mono, monospace', color: CAT_COLORS[cat].color }}>
                      {editId === acc.id
                        ? <input type="number" value={editForm.balance ?? ''} onChange={e => setEditForm(f => ({ ...f, balance: parseFloat(e.target.value) }))} style={{ padding: '4px 8px', fontSize: 12, width: 110, textAlign: 'right' }} />
                        : fmt(acc.balance)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        {editId === acc.id ? (
                          <>
                            <button onClick={() => handleEditSave(acc.id)} style={{ background: 'rgba(34,214,135,0.1)', border: 'none', color: 'var(--green)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Check size={13} /></button>
                            <button onClick={() => setEditId(null)} style={{ background: 'var(--bg3)', border: 'none', color: 'var(--text3)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={13} /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { setEditId(acc.id); setEditForm({ ...acc }) }}
                              style={{ background: 'none', border: 'none', color: 'var(--text3)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                              onMouseEnter={e => (e.currentTarget.style.color = 'var(--blue)')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}><Pencil size={13} /></button>
                            <button onClick={() => handleDelete(acc.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--text3)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                              onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}><Trash2 size={13} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 16, padding: 28, width: 460, maxWidth: '95vw' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 20px' }}>Add Account</h2>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6 }}>CODE</label>
                  <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="6300" required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6 }}>ACCOUNT NAME</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Office Supplies" required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6 }}>CATEGORY</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as Category, subcategory: SUBCATEGORIES[e.target.value as Category][0] }))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6 }}>SUBCATEGORY</label>
                  <select value={form.subcategory} onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))}>
                    {SUBCATEGORIES[form.category].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6 }}>OPENING BALANCE</label>
                <input type="number" step="0.01" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} placeholder="0.00" />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text2)', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 20px', background: 'var(--green)', border: 'none', borderRadius: 8, color: '#0a0c10', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Add Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
