import React, { useState } from 'react'
import { toast } from 'sonner'
import { Sparkles, X, Check, Loader2, ArrowRight, Trash2 } from 'lucide-react'
import { useLedger } from '../../hooks/useLedger'
import { useContacts } from '../../hooks/useContacts'
import { useAccounts } from '../../hooks/useAccounts'
import { CATEGORIES } from '../../contexts/AccountsContext'

interface AiEntryModalProps {
  isOpen: boolean
  onClose: () => void
}

interface AiRow {
  details: string
  amount: number
  entry_date: string
  account_id: string
  account_name: string
  contact_id: string
  contact_name: string
  status: 'paid' | 'unpaid'
}

const VALID_TYPES = ['Revenue', 'Cost of Sales', 'Operational Expenses', 'Other Income', 'Interest Expense', 'Tax Expense'] as const

function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase().trim()
  const t = target.toLowerCase().trim()
  if (!q) return 0
  if (t.includes(q) || q.includes(t)) return 1
  const qWords = q.split(/\s+/)
  const tWords = t.split(/\s+/)
  const matches = qWords.filter(w => w.length > 2 && tWords.some(tw => tw.includes(w) || w.includes(tw)))
  return matches.length / Math.max(qWords.length, tWords.length)
}

function fuzzyFind<T extends { name: string }>(query: string, list: T[], threshold = 0.35): T | null {
  if (!query) return null
  let best: T | null = null
  let bestScore = 0
  for (const item of list) {
    const score = fuzzyScore(query, item.name)
    if (score > bestScore) { bestScore = score; best = item }
  }
  return bestScore >= threshold ? best : null
}

function normalizeType(raw: string): string {
  const t = (raw ?? '').trim().toLowerCase()
  return VALID_TYPES.find(et => et.toLowerCase() === t)
    ?? VALID_TYPES.find(et => t.includes(et.toLowerCase().split(' ')[0]))
    ?? 'Operational Expenses'
}

function fmt(n: number) {
  const abs = Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (n < 0 ? '-' : '+') + '$' + abs
}

const today = new Date().toISOString().split('T')[0]

const cell: React.CSSProperties = {
  padding: '0 4px',
  borderBottom: '1px solid var(--border1)',
  verticalAlign: 'middle',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'transparent',
  border: '1px solid transparent',
  borderRadius: 5,
  padding: '5px 7px',
  fontSize: 12,
  color: 'var(--text1)',
  fontFamily: 'Syne, sans-serif',
  outline: 'none',
  transition: 'border-color .15s, background .15s',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  paddingRight: 4,
}

export default function AiEntryModal({ isOpen, onClose }: AiEntryModalProps) {
  const { addEntry } = useLedger()
  const { contacts } = useContacts()
  const { accounts } = useAccounts()
  const [userInput, setUserInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [rows, setRows] = useState<AiRow[]>([])
  const [isConfirming, setIsConfirming] = useState(false)

  function updateRow(idx: number, patch: Partial<AiRow>) {
    setRows(rs => rs.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }

  function removeRow(idx: number) {
    setRows(rs => rs.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userInput.trim()) return

    const apiKey = (import.meta as any).env.VITE_GROQ_API_KEY
    if (!apiKey) { toast.error('VITE_GROQ_API_KEY missing'); return }

    setIsLoading(true)
    try {
      const accountsList = accounts.map(a => `${a.id}: ${a.code} - ${a.name} (${a.category}, ${a.subcategory})`).join('\n')
      const contactsList = contacts.map(c => `${c.name} (${c.type}${c.company ? ', ' + c.company : ''})`).join('\n')

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content:
                'Extract ALL transactions from user text. Return ONLY valid JSON: {"transactions":[{"details":"...","account_id":"...","account_name":"...","amount":number,"entry_date":"YYYY-MM-DD","contact_name":"..."}]}.\n' +
                'Match each to the best account below:\n' + accountsList + '\n\n' +
                'Match contact_name from this list if mentioned:\n' + contactsList + '\n\n' +
                'Expenses are NEGATIVE numbers, income POSITIVE. entry_date defaults to today if not mentioned. contact_name null if not mentioned. No markdown, just JSON.'
            },
            { role: 'user', content: userInput }
          ]
        })
      })

      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      const raw = data.choices[0].message.content.trim().replace(/^```json/, '').replace(/```$/, '').trim()
      const parsed = JSON.parse(raw)
      const txns: any[] = parsed.transactions ?? (Array.isArray(parsed) ? parsed : [parsed])

      const built: AiRow[] = txns.map((t: any) => {
        // Account: exact first, then fuzzy on name, then fuzzy on details
        let acc_id = t.account_id ?? ''
        let acc_name = t.account_name ?? ''
        if (acc_id) {
          const found = accounts.find(a => a.id === acc_id)
          if (found) { acc_name = found.name }
        }
        if (!acc_id && acc_name) {
          const found = accounts.find(a => a.name.toLowerCase() === acc_name.toLowerCase())
            ?? fuzzyFind(acc_name, accounts)
          if (found) { acc_id = found.id; acc_name = found.name }
        }
        if (!acc_id) {
          const found = fuzzyFind(t.details ?? '', accounts)
          if (found) { acc_id = found.id; acc_name = found.name }
        }

        // Contact: exact first, then fuzzy on contact_name, then fuzzy on details
        let con_id = ''
        let con_name = t.contact_name ?? ''
        if (con_name) {
          const exact = contacts.find(c => c.name.toLowerCase() === con_name.toLowerCase())
          if (exact) { con_id = exact.id; con_name = exact.name }
          else {
            const fuzz = fuzzyFind(con_name, contacts)
            if (fuzz) { con_id = fuzz.id; con_name = fuzz.name }
          }
        }
        if (!con_id) {
          const fuzz = fuzzyFind(t.details ?? '', contacts)
          if (fuzz) { con_id = fuzz.id; con_name = fuzz.name }
        }

        return {
          details: t.details ?? '',
          amount: typeof t.amount === 'number' ? t.amount : 0,
          entry_date: t.entry_date ?? today,
          account_id: acc_id,
          account_name: acc_name,
          contact_id: con_id,
          contact_name: con_name,
          status: 'paid' as const,
        }
      })

      setRows(built)
    } catch {
      toast.error("Couldn't parse. Try rephrasing.")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleConfirmAll() {
    if (!rows.length) return
    setIsConfirming(true)
    let errors = 0
    for (const row of rows) {
      const acc = accounts.find(a => a.id === row.account_id)
      const entryType = acc ? normalizeType(acc.subcategory) : 'Operational Expenses'
      const { error } = await addEntry(
        row.details, entryType, row.amount, row.entry_date,
        row.contact_name || null, row.status, null,
        row.account_id || null, row.account_name || null, null,
        row.contact_id || null
      )
      if (error) errors++
    }
    if (errors === 0) {
      toast.success(`${rows.length} transaction${rows.length > 1 ? 's' : ''} posted`)
      handleClose()
    } else {
      toast.error(`${errors} transaction(s) failed`)
    }
    setIsConfirming(false)
  }

  function handleClose() {
    setUserInput('')
    setRows([])
    onClose()
  }

  const totalIncome = rows.filter(r => r.amount > 0).reduce((s, r) => s + r.amount, 0)
  const totalExpense = rows.filter(r => r.amount < 0).reduce((s, r) => s + r.amount, 0)
  const net = totalIncome + totalExpense

  if (!isOpen) return null

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border2)',
        borderRadius: 20, width: rows.length ? 860 : 520, maxWidth: '96vw',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        transition: 'width .25s ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 24px', borderBottom: '1px solid var(--border1)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(167,139,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple)', flexShrink: 0 }}>
            <Sparkles size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>AI Transaction Entry</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>Tell me what happened and I'll record it for you.</div>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4, borderRadius: 6 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Input phase */}
          {!rows.length ? (
            <form onSubmit={handleSubmit}>
              <div style={{ position: 'relative' }}>
                <textarea
                  autoFocus
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e as any) }}
                  placeholder={'e.g. "Paid 500 rent and 200 software, also received 1500 from Sara for design work"'}
                  style={{
                    width: '100%', height: 110, background: 'var(--bg3)',
                    border: '1px solid var(--border1)', borderRadius: 12,
                    padding: 14, color: 'var(--text1)', fontSize: 13,
                    resize: 'none', fontFamily: 'Syne, sans-serif', outline: 'none',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border1)'}
                />
                <div style={{ position: 'absolute', bottom: 10, right: 12, fontSize: 10, color: 'var(--text3)' }}>⌘↵ to submit · Llama 3.3</div>
              </div>
              <button
                type="submit"
                disabled={isLoading || !userInput.trim()}
                style={{
                  marginTop: 14, width: '100%', height: 46, background: 'var(--purple)',
                  border: 'none', borderRadius: 10, color: '#0a0c10',
                  fontSize: 14, fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: isLoading || !userInput.trim() ? 0.6 : 1, fontFamily: 'Syne, sans-serif',
                }}
              >
                {isLoading ? <><Loader2 size={16} style={{ animation: 'spin .8s linear infinite' }} /> Analyzing...</> : <>Generate entries <ArrowRight size={16} /></>}
              </button>
            </form>
          ) : (
            <>
              {/* Detection badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 6, padding: '4px 12px', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--amber)', letterSpacing: '.5px' }}>
                  {rows.length} TRANSACTION{rows.length > 1 ? 'S' : ''} DETECTED
                </div>
                <button onClick={() => setRows([])} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 12 }}>
                  ← Back
                </button>
              </div>

              {/* Sheet table */}
              <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border1)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg3)' }}>
                      {['#', 'Description', 'Account', 'Contact', 'Date', 'Amount', 'Status', ''].map((h, i) => (
                        <th key={i} style={{
                          padding: '8px 10px', fontSize: 10, fontFamily: 'DM Mono, monospace',
                          color: 'var(--text3)', letterSpacing: '.5px', fontWeight: 500,
                          textAlign: i === 5 ? 'right' : 'left',
                          borderBottom: '1px solid var(--border1)', whiteSpace: 'nowrap',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                        {/* # */}
                        <td style={{ ...cell, padding: '4px 10px', color: 'var(--text3)', fontFamily: 'DM Mono, monospace', fontSize: 11, width: 28, textAlign: 'center' }}>{idx + 1}</td>

                        {/* Description */}
                        <td style={{ ...cell, minWidth: 180 }}>
                          <input
                            value={row.details}
                            onChange={e => updateRow(idx, { details: e.target.value })}
                            style={inputStyle}
                            onFocus={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.borderColor = 'var(--green)' }}
                            onBlur={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
                          />
                        </td>

                        {/* Account */}
                        <td style={{ ...cell, minWidth: 160 }}>
                          <select
                            value={row.account_id}
                            onChange={e => {
                              const acc = accounts.find(a => a.id === e.target.value)
                              updateRow(idx, { account_id: e.target.value, account_name: acc?.name ?? '' })
                            }}
                            style={selectStyle}
                            onFocus={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.borderColor = 'var(--green)' }}
                            onBlur={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
                          >
                            <option value="">Select account...</option>
                            {CATEGORIES.map(cat => {
                              const catAccs = accounts.filter(a => a.category === cat)
                              if (!catAccs.length) return null
                              return (
                                <optgroup key={cat} label={cat}>
                                  {catAccs.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                                </optgroup>
                              )
                            })}
                          </select>
                        </td>

                        {/* Contact */}
                        <td style={{ ...cell, minWidth: 130 }}>
                          <select
                            value={row.contact_id}
                            onChange={e => {
                              const con = contacts.find(c => c.id === e.target.value)
                              updateRow(idx, { contact_id: e.target.value, contact_name: con?.name ?? '' })
                            }}
                            style={selectStyle}
                            onFocus={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.borderColor = 'var(--green)' }}
                            onBlur={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
                          >
                            <option value="">None</option>
                            {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </td>

                        {/* Date */}
                        <td style={{ ...cell, minWidth: 120 }}>
                          <input
                            type="date"
                            value={row.entry_date}
                            onChange={e => updateRow(idx, { entry_date: e.target.value })}
                            style={{ ...inputStyle, width: 118 }}
                            onFocus={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.borderColor = 'var(--green)' }}
                            onBlur={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
                          />
                        </td>

                        {/* Amount */}
                        <td style={{ ...cell, minWidth: 90, textAlign: 'right' }}>
                          <input
                            type="number"
                            step="0.01"
                            value={row.amount}
                            onChange={e => updateRow(idx, { amount: parseFloat(e.target.value) || 0 })}
                            style={{
                              ...inputStyle,
                              textAlign: 'right',
                              color: row.amount >= 0 ? 'var(--green)' : 'var(--red)',
                              fontFamily: 'DM Mono, monospace',
                              width: 90,
                            }}
                            onFocus={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.borderColor = 'var(--green)' }}
                            onBlur={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
                          />
                        </td>

                        {/* Status */}
                        <td style={{ ...cell, minWidth: 80 }}>
                          <select
                            value={row.status}
                            onChange={e => updateRow(idx, { status: e.target.value as 'paid' | 'unpaid' })}
                            style={selectStyle}
                            onFocus={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.borderColor = 'var(--green)' }}
                            onBlur={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
                          >
                            <option value="paid">Paid</option>
                            <option value="unpaid">Unpaid</option>
                          </select>
                        </td>

                        {/* Delete */}
                        <td style={{ ...cell, width: 32, textAlign: 'center' }}>
                          <button
                            onClick={() => removeRow(idx)}
                            style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '3px 5px', borderRadius: 5, display: 'flex', alignItems: 'center' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals + confirm */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border1)' }}>
                <div style={{ display: 'flex', gap: 20 }}>
                  {[
                    { label: 'Income', val: totalIncome, color: 'var(--green)' },
                    { label: 'Expenses', val: totalExpense, color: 'var(--red)' },
                    { label: 'Net', val: net, color: net >= 0 ? 'var(--green)' : 'var(--red)' },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ fontSize: 12, color: 'var(--text3)' }}>
                      {label} <span style={{ color, fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>{fmt(val)}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleConfirmAll}
                  disabled={isConfirming || !rows.length}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '9px 20px', background: 'var(--green)', border: 'none',
                    borderRadius: 10, color: '#0a0c10', fontFamily: 'Syne, sans-serif',
                    fontSize: 13, fontWeight: 700, cursor: isConfirming ? 'not-allowed' : 'pointer',
                    opacity: isConfirming ? 0.7 : 1,
                  }}
                >
                  {isConfirming ? <Loader2 size={14} style={{ animation: 'spin .8s linear infinite' }} /> : <Check size={14} />}
                  Post {rows.length} transaction{rows.length > 1 ? 's' : ''}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
