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

const VALID_TYPES = [
  'Revenue', 'Cost of Sales', 'Operational Expenses',
  'Other Income', 'Interest Expense', 'Tax Expense',
] as const

// ─── Date NLP ─────────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function mondayOf(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff)
}

function lastOfMonth(y: number, m: number): Date {
  return new Date(y, m + 1, 0)
}

function resolveRelativeDates(text: string): string {
  const n = new Date()
  const y = n.getFullYear()
  const mo = n.getMonth()

  const replacements: [RegExp, string][] = [
    [/\btoday\b/gi,      isoDate(n)],
    [/\byesterday\b/gi,  isoDate(new Date(y, mo, n.getDate() - 1))],
    [/\bthis week\b/gi,  isoDate(mondayOf(n))],
    [/\blast week\b/gi,  isoDate(mondayOf(new Date(y, mo, n.getDate() - 7)))],
    [/\bthis month\b/gi, isoDate(lastOfMonth(y, mo))],
    [/\blast month\b/gi, isoDate(lastOfMonth(y, mo - 1))],
    [/\bthis year\b/gi,  isoDate(new Date(y, 11, 31))],
    [/\blast year\b/gi,  isoDate(new Date(y - 1, 11, 31))],
  ]

  let out = text
  for (const [re, date] of replacements) out = out.replace(re, date)
  return out
}

// ─── Fuzzy match ──────────────────────────────────────────────────────────────

function fuzzyScore(q: string, t: string): number {
  const a = q.toLowerCase().trim()
  const b = t.toLowerCase().trim()
  if (!a || !b) return 0
  if (b.includes(a) || a.includes(b)) return 1
  const aw = a.split(/\s+/)
  const bw = b.split(/\s+/)
  const hits = aw.filter(w => w.length > 2 && bw.some(bx => bx.includes(w) || w.includes(bx)))
  return hits.length / Math.max(aw.length, bw.length)
}

function fuzzyFind<T extends { name: string }>(query: string, list: T[], threshold = 0.35): T | null {
  if (!query) return null
  let best: T | null = null
  let top = 0
  for (const item of list) {
    const s = fuzzyScore(query, item.name)
    if (s > top) { top = s; best = item }
  }
  return top >= threshold ? best : null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeType(raw: string): string {
  const t = (raw ?? '').trim().toLowerCase()
  return (
    VALID_TYPES.find(et => et.toLowerCase() === t) ??
    VALID_TYPES.find(et => t.includes(et.toLowerCase().split(' ')[0])) ??
    'Operational Expenses'
  )
}

function fmtAmt(n: number) {
  const abs = Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (n < 0 ? '-' : '+') + '$' + abs
}

const todayISO = new Date().toISOString().split('T')[0]

// ─── Shared cell styles ───────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  padding: '7px 8px',
  fontSize: 10,
  fontFamily: 'DM Mono, monospace',
  color: 'var(--text3)',
  letterSpacing: '.5px',
  fontWeight: 500,
  borderBottom: '1px solid var(--border1)',
  background: 'var(--bg3)',
  whiteSpace: 'nowrap',
  textAlign: 'left',
}

const TD: React.CSSProperties = {
  padding: '2px 3px',
  borderBottom: '1px solid var(--border1)',
  verticalAlign: 'middle',
}

const BASE_INPUT: React.CSSProperties = {
  width: '100%',
  background: 'transparent',
  border: '1px solid transparent',
  borderRadius: 5,
  padding: '5px 7px',
  fontSize: 12,
  color: 'var(--text1)',
  fontFamily: 'Syne, sans-serif',
  outline: 'none',
}

function ci(extra?: React.CSSProperties): React.CSSProperties {
  return { ...BASE_INPUT, ...extra }
}

const focusOn = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.background = 'var(--bg3)'
  e.currentTarget.style.borderColor = 'var(--green)'
}
const focusOff = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.background = 'transparent'
  e.currentTarget.style.borderColor = 'transparent'
}

// ─── Component ────────────────────────────────────────────────────────────────

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

  function buildRow(t: any): AiRow {
    // Account: AI id → exact name match → fuzzy name → fuzzy details
    let acc_id = (t.account_id ?? '').trim()
    let acc_name = (t.account_name ?? '').trim()
    if (acc_id && !accounts.find(a => a.id === acc_id)) acc_id = ''
    if (!acc_id && acc_name) {
      const f = accounts.find(a => a.name.toLowerCase() === acc_name.toLowerCase()) ?? fuzzyFind(acc_name, accounts)
      if (f) { acc_id = f.id; acc_name = f.name }
    }
    if (!acc_id) {
      const f = fuzzyFind(t.details ?? '', accounts)
      if (f) { acc_id = f.id; acc_name = f.name }
    }

    // Contact: exact → fuzzy name → fuzzy details
    let con_id = ''
    let con_name = (t.contact_name ?? '').trim()
    if (con_name) {
      const exact = contacts.find(c => c.name.toLowerCase() === con_name.toLowerCase())
      if (exact) { con_id = exact.id; con_name = exact.name }
      else {
        const f = fuzzyFind(con_name, contacts)
        if (f) { con_id = f.id; con_name = f.name }
      }
    }
    if (!con_id) {
      const f = fuzzyFind(t.details ?? '', contacts)
      if (f) { con_id = f.id; con_name = f.name }
    }

    return {
      details: t.details ?? '',
      amount: typeof t.amount === 'number' ? t.amount : 0,
      entry_date: t.entry_date ?? todayISO,
      account_id: acc_id,
      account_name: acc_name,
      contact_id: con_id,
      contact_name: con_name,
      status: 'paid',
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userInput.trim()) return
    const apiKey = (import.meta as any).env.VITE_GROQ_API_KEY
    if (!apiKey) { toast.error('VITE_GROQ_API_KEY missing'); return }

    setIsLoading(true)
    try {
      const resolved = resolveRelativeDates(userInput)
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
                'Extract ALL transactions from user text. Return ONLY valid JSON — no markdown, no explanation:\n' +
                '{"transactions":[{"details":"...","account_id":"...","account_name":"...","amount":number,"entry_date":"YYYY-MM-DD","contact_name":"..."}]}\n\n' +
                'Rules:\n' +
                '- Use the account_id UUID exactly as listed. Expenses = negative, income = positive.\n' +
                '- Use ISO dates already present in the text. Default to ' + todayISO + ' if none given.\n' +
                '- contact_name: match from contacts list if mentioned, else null.\n\n' +
                'Accounts:\n' + accountsList + '\n\nContacts:\n' + contactsList,
            },
            { role: 'user', content: resolved },
          ],
        }),
      })

      if (!res.ok) throw new Error('API ' + res.status)
      const data = await res.json()
      const raw = data.choices[0].message.content.trim().replace(/^```json\s*/i, '').replace(/```\s*$/,'').trim()
      const parsed = JSON.parse(raw)
      const txns: any[] = parsed.transactions ?? (Array.isArray(parsed) ? parsed : [parsed])
      setRows(txns.map(buildRow))
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
        row.contact_id || null,
      )
      if (error) errors++
    }
    if (errors === 0) {
      toast.success(`${rows.length} transaction${rows.length > 1 ? 's' : ''} posted`)
      handleClose()
    } else {
      toast.error(`${errors} failed`)
    }
    setIsConfirming(false)
  }

  function handleClose() {
    setUserInput('')
    setRows([])
    onClose()
  }

  const totalIncome  = rows.filter(r => r.amount > 0).reduce((s, r) => s + r.amount, 0)
  const totalExpense = rows.filter(r => r.amount < 0).reduce((s, r) => s + r.amount, 0)
  const net = totalIncome + totalExpense

  if (!isOpen) return null

  const showTable = rows.length > 0

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 18,
        display: 'flex', flexDirection: 'column',
        width: showTable ? 'min(960px, 96vw)' : 500,
        maxHeight: '90vh',
        transition: 'width .2s ease',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderBottom: '1px solid var(--border1)', flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(167,139,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple)' }}>
            <Sparkles size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>AI Transaction Entry</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>Tell me what happened and I'll record it.</div>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

          {/* ── Input ── */}
          {!showTable && (
            <form onSubmit={handleSubmit}>
              <div style={{ position: 'relative' }}>
                <textarea
                  autoFocus
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e as any) }}
                  placeholder='"Paid 500 rent and 200 software this month, received 1500 from Sara today"'
                  style={{
                    width: '100%', height: 100, background: 'var(--bg3)',
                    border: '1px solid var(--border1)', borderRadius: 10,
                    padding: 12, color: 'var(--text1)', fontSize: 13,
                    resize: 'none', fontFamily: 'Syne, sans-serif', outline: 'none',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border1)'}
                />
                <div style={{ position: 'absolute', bottom: 8, right: 10, fontSize: 10, color: 'var(--text3)' }}>⌘↵ · Llama 3.3</div>
              </div>
              <button
                type="submit"
                disabled={isLoading || !userInput.trim()}
                style={{
                  marginTop: 12, width: '100%', height: 44,
                  background: 'var(--purple)', border: 'none', borderRadius: 9,
                  color: '#0a0c10', fontSize: 13, fontWeight: 700, fontFamily: 'Syne, sans-serif',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  opacity: isLoading || !userInput.trim() ? 0.6 : 1,
                }}
              >
                {isLoading
                  ? <><Loader2 size={15} style={{ animation: 'spin .8s linear infinite' }} /> Analyzing...</>
                  : <>Generate entries <ArrowRight size={15} /></>}
              </button>
            </form>
          )}

          {/* ── Sheet ── */}
          {showTable && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{
                  background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.3)',
                  borderRadius: 6, padding: '3px 10px',
                  fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--amber)', letterSpacing: '.5px',
                }}>
                  {rows.length} TRANSACTION{rows.length > 1 ? 'S' : ''} DETECTED
                </span>
                <button onClick={() => setRows([])} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 12 }}>
                  ← Edit prompt
                </button>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid var(--border1)', borderRadius: 10 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ ...TH, width: 24, textAlign: 'center' }}>#</th>
                      <th style={{ ...TH, minWidth: 170 }}>Description</th>
                      <th style={{ ...TH, minWidth: 160 }}>Account</th>
                      <th style={{ ...TH, minWidth: 120 }}>Contact</th>
                      <th style={{ ...TH, minWidth: 118 }}>Date</th>
                      <th style={{ ...TH, minWidth: 85, textAlign: 'right' }}>Amount</th>
                      <th style={{ ...TH, minWidth: 72 }}>Status</th>
                      <th style={{ ...TH, width: 28 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={idx} style={{ background: idx % 2 === 1 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>

                        <td style={{ ...TD, textAlign: 'center', color: 'var(--text3)', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>
                          {idx + 1}
                        </td>

                        <td style={TD}>
                          <input
                            value={row.details}
                            onChange={e => updateRow(idx, { details: e.target.value })}
                            style={ci()}
                            onFocus={focusOn} onBlur={focusOff}
                          />
                        </td>

                        <td style={TD}>
                          <select
                            value={row.account_id}
                            onChange={e => {
                              const acc = accounts.find(a => a.id === e.target.value)
                              updateRow(idx, { account_id: e.target.value, account_name: acc?.name ?? '' })
                            }}
                            style={ci({ cursor: 'pointer' })}
                            onFocus={focusOn} onBlur={focusOff}
                          >
                            <option value="">Select…</option>
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

                        <td style={TD}>
                          <select
                            value={row.contact_id}
                            onChange={e => {
                              const con = contacts.find(c => c.id === e.target.value)
                              updateRow(idx, { contact_id: e.target.value, contact_name: con?.name ?? '' })
                            }}
                            style={ci({ cursor: 'pointer' })}
                            onFocus={focusOn} onBlur={focusOff}
                          >
                            <option value="">None</option>
                            {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </td>

                        <td style={TD}>
                          <input
                            type="date"
                            value={row.entry_date}
                            onChange={e => updateRow(idx, { entry_date: e.target.value })}
                            style={ci({ width: 116 })}
                            onFocus={focusOn} onBlur={focusOff}
                          />
                        </td>

                        <td style={{ ...TD, textAlign: 'right' }}>
                          <input
                            type="number" step="0.01"
                            value={row.amount}
                            onChange={e => updateRow(idx, { amount: parseFloat(e.target.value) || 0 })}
                            style={ci({
                              textAlign: 'right', width: 85,
                              color: row.amount >= 0 ? 'var(--green)' : 'var(--red)',
                              fontFamily: 'DM Mono, monospace',
                            })}
                            onFocus={focusOn} onBlur={focusOff}
                          />
                        </td>

                        <td style={TD}>
                          <select
                            value={row.status}
                            onChange={e => updateRow(idx, { status: e.target.value as 'paid' | 'unpaid' })}
                            style={ci({ cursor: 'pointer' })}
                            onFocus={focusOn} onBlur={focusOff}
                          >
                            <option value="paid">Paid</option>
                            <option value="unpaid">Unpaid</option>
                          </select>
                        </td>

                        <td style={{ ...TD, textAlign: 'center' }}>
                          <button
                            onClick={() => removeRow(idx)}
                            style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '3px 4px', borderRadius: 4, display: 'flex', alignItems: 'center' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border1)' }}>
                <div style={{ display: 'flex', gap: 18 }}>
                  {[
                    { label: 'Income',   val: totalIncome,  color: 'var(--green)' },
                    { label: 'Expenses', val: totalExpense, color: 'var(--red)' },
                    { label: 'Net',      val: net,          color: net >= 0 ? 'var(--green)' : 'var(--red)' },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ fontSize: 12, color: 'var(--text3)' }}>
                      {label} <span style={{ color, fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>{fmtAmt(val)}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleConfirmAll}
                  disabled={isConfirming || !rows.length}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '8px 18px', background: 'var(--green)', border: 'none', borderRadius: 9,
                    color: '#0a0c10', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700,
                    cursor: isConfirming ? 'not-allowed' : 'pointer', opacity: isConfirming ? 0.7 : 1,
                  }}
                >
                  {isConfirming ? <Loader2 size={13} style={{ animation: 'spin .8s linear infinite' }} /> : <Check size={13} />}
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
