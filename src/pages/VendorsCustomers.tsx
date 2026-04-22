import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, X, Check, Building2, User, Download, Upload } from 'lucide-react'
import { useContacts } from '../hooks/useContacts'
import { parseCSV, downloadCSV } from '../utils/csvUtils'
import type { Contact } from '../types/database'

type ContactType = Contact['type']

const TYPE_STYLE: Record<ContactType, { bg: string; color: string }> = {
  Customer: { bg: 'rgba(34,214,135,0.1)', color: 'var(--green)' },
  Vendor: { bg: 'rgba(240,79,79,0.1)', color: 'var(--red)' },
  Both: { bg: 'rgba(91,143,255,0.1)', color: 'var(--blue)' },
}

const EMPTY = { type: 'Customer' as ContactType, name: '', email: '', phone: '', company: '', address: '', balance: '', status: 'Active' as 'Active' | 'Inactive' }

function fmt(n: number) {
  return (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2 })
}

export default function VendorsCustomers() {
  const { contacts, isLoading, addContact, updateContact, deleteContact } = useContacts()
  const [tab, setTab] = useState<'All' | ContactType>('All')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Contact>>({})
  const [search, setSearch] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function downloadSampleCSV() {
    const headers = ['type', 'name', 'email', 'phone', 'company', 'address', 'balance', 'status']
    const rows = [
      ['Customer', 'John Smith', 'john@acme.com', '+1 555-0100', 'Acme Corp', '123 Main St', '5000', 'Active'],
      ['Vendor', 'Office Depot', 'ap@officedepot.com', '+1 800-463-3768', 'Office Depot', '200 Supply Rd', '-2000', 'Active'],
      ['Both', 'DataSync Ltd', 'hello@datasync.io', '+1 555-0199', 'DataSync Ltd', '77 Tech Blvd', '1500', 'Active']
    ]
    downloadCSV('contacts_sample.csv', headers, rows)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    
    try {
      const text = await file.text()
      const data = parseCSV(text)
      if (data.length === 0) {
        toast.error('No valid rows found. Check headers match the sample.')
        return
      }

      let imported = 0
      for (const row of data) {
        const { type, name, email, phone, company, address, balance, status } = row
        if (!name) continue

        const finalType = (['Customer', 'Vendor', 'Both'].includes(type) ? type : 'Customer') as ContactType
        const finalStatus = (['Active', 'Inactive'].includes(status) ? status : 'Active') as 'Active' | 'Inactive'
        const finalBalance = parseFloat(balance) || 0

        const { error } = await addContact({
          type: finalType,
          name,
          email: email || '',
          phone: phone || '',
          company: company || '',
          address: address || '',
          balance: finalBalance,
          status: finalStatus
        })
        if (!error) imported++
      }
      
      if (imported > 0) {
        toast.success(`Imported ${imported} contacts`)
      } else {
        toast.error('No valid contacts were imported.')
      }
    } catch (err) {
      toast.error('Failed to parse CSV')
      console.error(err)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const secondaryBtn = {
    background: 'var(--bg3)',
    border: '1px solid var(--border2)',
    color: 'var(--text2)',
    padding: '7px 14px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: 'Syne, sans-serif'
  }

  const filtered = contacts
    .filter(c => tab === 'All' || c.type === tab)
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.company.toLowerCase().includes(search.toLowerCase()))

  const totalAR = contacts.filter(c => c.balance > 0).reduce((s, c) => s + c.balance, 0)
  const totalAP = contacts.filter(c => c.balance < 0).reduce((s, c) => s + Math.abs(c.balance), 0)
  const customers = contacts.filter(c => c.type === 'Customer' || c.type === 'Both').length
  const vendors = contacts.filter(c => c.type === 'Vendor' || c.type === 'Both').length

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await addContact({
      type: form.type,
      name: form.name,
      email: form.email,
      phone: form.phone,
      company: form.company,
      address: form.address,
      balance: parseFloat(String(form.balance)) || 0,
      status: form.status
    })
    if (error) toast.error(error)
    else {
      toast.success('Contact added')
      setShowModal(false)
      setForm(EMPTY)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this contact?')) return
    const { error } = await deleteContact(id)
    if (error) toast.error(error)
    else toast.success('Contact deleted')
  }

  async function handleEditSave(id: string) {
    const { error } = await updateContact(id, editForm)
    if (error) toast.error(error)
    else {
      toast.success('Contact updated')
      setEditId(null)
    }
  }

  const tdStyle = { padding: '11px 14px', borderBottom: '1px solid var(--border1)', fontSize: 13, verticalAlign: 'middle' as const }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 56, background: 'var(--bg2)', borderBottom: '1px solid var(--border1)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 12 }}>
        <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0, flex: 1 }}>Vendors & Customers</h1>
        
        <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImport} />
        
        <button onClick={downloadSampleCSV} style={secondaryBtn}>
          <Download size={14} /> Sample CSV
        </button>
        
        <button onClick={() => fileInputRef.current?.click()} style={secondaryBtn}>
          <Upload size={14} /> Import CSV
        </button>

        <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--green)', border: 'none', borderRadius: 8, color: '#0a0c10', fontSize: 12, fontWeight: 700, fontFamily: 'Syne, sans-serif', cursor: 'pointer' }}>
          <Plus size={14} /> Add Contact
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'TOTAL CUSTOMERS', value: customers, color: 'var(--green)', mono: false },
            { label: 'TOTAL VENDORS', value: vendors, color: 'var(--red)', mono: false },
            { label: 'ACCOUNTS RECEIVABLE', value: fmt(totalAR), color: 'var(--green)', mono: true },
            { label: 'ACCOUNTS PAYABLE', value: fmt(totalAP), color: 'var(--red)', mono: true },
          ].map(k => (
            <div key={k.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border1)', borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', letterSpacing: '.5px', marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontSize: k.mono ? 22 : 28, fontWeight: 700, fontFamily: k.mono ? 'DM Serif Display, serif' : 'DM Serif Display, serif', color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs + search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 2, background: 'var(--bg3)', borderRadius: 10, padding: 4 }}>
            {(['All', 'Customer', 'Vendor', 'Both'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 14px', borderRadius: 7, background: tab === t ? 'var(--bg2)' : 'transparent', border: 'none', color: tab === t ? 'var(--text1)' : 'var(--text3)', fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}>{t}</button>
            ))}
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or company..." style={{ flex: 1, maxWidth: 300 }} />
        </div>

        {/* Table */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border1)', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg3)' }}>
                {['Contact', 'Type', 'Company', 'Email', 'Phone', 'Balance', 'Status', 'Actions'].map((h, i) => (
                  <th key={h} style={{ ...tdStyle, fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', letterSpacing: '.5px', fontWeight: 500, textAlign: i >= 5 ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text3)', padding: 40 }}>Loading contacts...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text3)', padding: 40 }}>No contacts found.</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: TYPE_STYLE[c.type].bg, border: `1px solid ${TYPE_STYLE[c.type].color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {c.type === 'Vendor' ? <Building2 size={14} color={TYPE_STYLE[c.type].color} /> : <User size={14} color={TYPE_STYLE[c.type].color} />}
                      </div>
                      <span style={{ color: 'var(--text1)', fontWeight: 500 }}>
                        {editId === c.id ? <input value={editForm.name ?? ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} style={{ padding: '4px 8px', fontSize: 12, width: 130 }} /> : c.name}
                      </span>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ background: TYPE_STYLE[c.type].bg, color: TYPE_STYLE[c.type].color, fontSize: 10, fontFamily: 'DM Mono, monospace', padding: '2px 8px', borderRadius: 20 }}>{c.type}</span>
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text2)' }}>
                    {editId === c.id ? <input value={editForm.company ?? ''} onChange={e => setEditForm(f => ({ ...f, company: e.target.value }))} style={{ padding: '4px 8px', fontSize: 12, width: 120 }} /> : c.company}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text2)', fontSize: 12 }}>
                    {editId === c.id ? <input value={editForm.email ?? ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} style={{ padding: '4px 8px', fontSize: 12, width: 150 }} /> : c.email}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text3)', fontSize: 12, fontFamily: 'DM Mono, monospace' }}>{c.phone}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'DM Mono, monospace', color: c.balance >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                    {fmt(c.balance)}
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400 }}>{c.balance > 0 ? 'A/R' : c.balance < 0 ? 'A/P' : '—'}</div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', padding: '2px 8px', borderRadius: 20, background: c.status === 'Active' ? 'rgba(34,214,135,0.1)' : 'var(--bg3)', color: c.status === 'Active' ? 'var(--green)' : 'var(--text3)' }}>{c.status}</span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      {editId === c.id ? (
                        <>
                          <button onClick={() => handleEditSave(c.id)} style={{ background: 'rgba(34,214,135,0.1)', border: 'none', color: 'var(--green)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Check size={13} /></button>
                          <button onClick={() => setEditId(null)} style={{ background: 'var(--bg3)', border: 'none', color: 'var(--text3)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={13} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditId(c.id); setEditForm({ ...c }) }}
                            style={{ background: 'none', border: 'none', color: 'var(--text3)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--blue)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}><Pencil size={13} /></button>
                          <button onClick={() => handleDelete(c.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--text3)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}><Trash2 size={13} /></button>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 16, padding: 28, width: 500, maxWidth: '95vw' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 20px' }}>Add Contact</h2>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6 }}>TYPE</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as ContactType }))}>
                    <option>Customer</option><option>Vendor</option><option>Both</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6 }}>STATUS</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'Active' | 'Inactive' }))}>
                    <option>Active</option><option>Inactive</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6 }}>FULL NAME</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Smith" required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6 }}>COMPANY</label>
                  <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Acme Corp" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6 }}>EMAIL</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@company.com" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6 }}>PHONE</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 555-0100" />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6 }}>ADDRESS</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main St, City, State" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6 }}>OPENING BALANCE (positive = A/R, negative = A/P)</label>
                <input type="number" step="0.01" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} placeholder="0.00" />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text2)', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 20px', background: 'var(--green)', border: 'none', borderRadius: 8, color: '#0a0c10', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Add Contact</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
