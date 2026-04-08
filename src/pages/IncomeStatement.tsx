import { useState } from 'react'
import { useLedger } from '../hooks/useLedger'
import { useAccounts } from '../contexts/AccountsContext'
import { Calendar, Filter } from 'lucide-react'

function fmtPos(n: number) {
  return '$' + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtSigned(n: number) {
  return (n < 0 ? '- ' : '') + '$' + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseLocal(ds: string) {
  const [y, m, d] = ds.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toDS(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const IS_SECTIONS = [
  { title: 'Revenue',            subcat: 'Operating Revenue', isExpense: false },
  { title: 'Cost of Goods Sold', subcat: 'Cost of Sales',     isExpense: true  },
  { title: 'Operating Expenses', subcat: 'Operating Expense', isExpense: true  },
  { title: 'Other Income',       subcat: 'Other Income',      isExpense: false },
  { title: 'Interest Expense',   subcat: 'Interest Expense',  isExpense: true  },
  { title: 'Tax Expense',        subcat: 'Tax Expense',       isExpense: true  },
]

// Legacy type → subcategory mapping (mirror of useLedger TYPE_ALIAS)
const TYPE_ALIAS: Record<string, string> = {
  'Revenue':              'Operating Revenue',
  'Other Income':         'Other Income',
  'Cost of Sales':        'Cost of Sales',
  'Operational Expenses': 'Operating Expense',
  'Operational Expense':  'Operating Expense',
  'Operating Expense':    'Operating Expense',
  'Interest Expense':     'Interest Expense',
  'Tax Expense':          'Tax Expense',
}

function resolveSubcat(e: { account_subcategory: string | null; type: string }) {
  return e.account_subcategory ?? TYPE_ALIAS[e.type] ?? e.type
}

export default function IncomeStatement() {
  const { entries, isLoading } = useLedger()
  const { accounts } = useAccounts()
  
  const [from, setFrom] = useState(toDS(new Date(new Date().getFullYear(), new Date().getMonth(), 1)))
  const [to, setTo] = useState(toDS(new Date()))

  const quickSelect = (type: string) => {
    const d = new Date()
    if (type === 'this-month') {
      setFrom(toDS(new Date(d.getFullYear(), d.getMonth(), 1)))
      setTo(toDS(d))
    } else if (type === 'last-month') {
      setFrom(toDS(new Date(d.getFullYear(), d.getMonth() - 1, 1)))
      setTo(toDS(new Date(d.getFullYear(), d.getMonth(), 0)))
    } else if (type === 'this-quarter') {
      const q = Math.floor(d.getMonth() / 3)
      setFrom(toDS(new Date(d.getFullYear(), q * 3, 1)))
      setTo(toDS(d))
    } else if (type === 'this-year') {
      setFrom(toDS(new Date(d.getFullYear(), 0, 1)))
      setTo(toDS(d))
    }
  }

  const filteredEntries = entries.filter(e => {
    const date = e.created_at.split('T')[0]
    return date >= from && date <= to
  })

  const localTotals = {
    revenue: filteredEntries.filter(e => resolveSubcat(e) === 'Operating Revenue').reduce((s, e) => s + Math.abs(e.amount), 0),
    otherIncome: filteredEntries.filter(e => resolveSubcat(e) === 'Other Income').reduce((s, e) => s + Math.abs(e.amount), 0),
    cogs: filteredEntries.filter(e => resolveSubcat(e) === 'Cost of Sales').reduce((s, e) => s + Math.abs(e.amount), 0),
    opex: filteredEntries.filter(e => resolveSubcat(e) === 'Operating Expense').reduce((s, e) => s + Math.abs(e.amount), 0),
    interest: filteredEntries.filter(e => resolveSubcat(e) === 'Interest Expense').reduce((s, e) => s + Math.abs(e.amount), 0),
    tax: filteredEntries.filter(e => resolveSubcat(e) === 'Tax Expense').reduce((s, e) => s + Math.abs(e.amount), 0),
    get grossProfit() { return this.revenue - this.cogs },
    get ebitda() { return this.grossProfit + this.otherIncome - this.opex },
    get netProfit() { return this.ebitda - this.interest - this.tax }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border1)', padding: '12px 28px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0, flex: 1 }}>Income Statement</h1>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {(['this-month', 'last-month', 'this-quarter', 'this-year'] as const).map(t => (
            <button key={t} onClick={() => quickSelect(t)} style={{ padding: '5px 10px', background: 'var(--bg3)', border: '1px solid var(--border1)', borderRadius: 6, fontSize: 11, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}>
              {t.replace('-', ' ').toUpperCase()}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg3)', padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border1)' }}>
          <Calendar size={14} color="var(--text3)" />
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ background: 'none', border: 'none', color: 'var(--text1)', fontSize: 12, outline: 'none' }} />
          <span style={{ color: 'var(--text3)', fontSize: 12 }}>to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ background: 'none', border: 'none', color: 'var(--text1)', fontSize: 12, outline: 'none' }} />
        </div>

        <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--green)', border: 'none', borderRadius: 8, color: '#000', fontSize: 12, fontWeight: 700, fontFamily: 'Syne, sans-serif', cursor: 'pointer' }}>
          Print Report
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border1)', borderRadius: 16, padding: 24, maxWidth: 820 }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 28, borderBottom: '1px solid var(--border1)', paddingBottom: 20 }}>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 24, fontWeight: 400, margin: '0 0 4px' }}>Income Statement</h2>
            <p style={{ color: 'var(--text3)', fontSize: 12, fontFamily: 'DM Mono, monospace', margin: 0 }}>
              For the period {parseLocal(from).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} to {parseLocal(to).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>Loading data...</div>
          ) : (
            <>
              {IS_SECTIONS.map((section, sectionIdx) => {
                const sectionAccounts = accounts.filter(a => a.subcategory === section.subcat)

                const rows = sectionAccounts.map(acc => {
                  const matched = filteredEntries.filter(e => {
                    if (e.account_id) return e.account_id === acc.id
                    return resolveSubcat(e) === section.subcat
                  })
                  const sum = matched.reduce((s, e) => s + Math.abs(e.amount), 0)
                  return { acc, sum }
                })

                const coveredIds = new Set(filteredEntries.filter(e => e.account_id).map(e => e.account_id))
                const legacyEntries = filteredEntries.filter(e =>
                  !e.account_id &&
                  !coveredIds.has(e.id) &&
                  resolveSubcat(e) === section.subcat
                )
                const legacyMap: Record<string, number> = {}
                legacyEntries.forEach(e => {
                  const key = e.type
                  legacyMap[key] = (legacyMap[key] ?? 0) + Math.abs(e.amount)
                })

                const sectionTotal = rows.reduce((s, r) => s + r.sum, 0) + Object.values(legacyMap).reduce((s, v) => s + v, 0)
                const color = section.isExpense ? 'var(--red)' : 'var(--green)'

                return (
                  <div key={section.subcat} style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 16px', background: 'var(--bg3)', borderRadius: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>{section.title}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'DM Mono, monospace', color }}>
                        {section.isExpense && sectionTotal > 0 ? '- ' : ''}{fmtPos(sectionTotal)}
                      </span>
                    </div>

                    {rows.map(({ acc, sum }) => (
                      <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 16px 7px 32px', borderBottom: '1px solid var(--border1)', fontSize: 13 }}>
                        <span style={{ color: 'var(--text2)' }}>
                          <span style={{ color: 'var(--text3)', fontFamily: 'DM Mono, monospace', fontSize: 11, marginRight: 8 }}>{acc.code}</span>
                          {acc.name}
                        </span>
                        <span style={{ fontFamily: 'DM Mono, monospace', color: sum > 0 ? color : 'var(--text3)' }}>
                          {section.isExpense && sum > 0 ? '- ' : ''}{fmtPos(sum)}
                        </span>
                      </div>
                    ))}

                    {Object.entries(legacyMap).map(([label, sum]) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 16px 7px 32px', borderBottom: '1px solid var(--border1)', fontSize: 13 }}>
                        <span style={{ color: 'var(--text2)', fontStyle: 'italic' }}>{label} (legacy)</span>
                        <span style={{ fontFamily: 'DM Mono, monospace', color }}>
                          {section.isExpense && sum > 0 ? '- ' : ''}{fmtPos(sum)}
                        </span>
                      </div>
                    ))}

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text2)', borderBottom: '1px solid var(--border2)' }}>
                      <span>Total {section.title}</span>
                      <span style={{ fontFamily: 'DM Mono, monospace', color }}>
                        {section.isExpense && sectionTotal > 0 ? '- ' : ''}{fmtPos(sectionTotal)}
                      </span>
                    </div>

                    {sectionIdx === 1 && (
                      <SubtotalRow label="GROSS PROFIT" value={localTotals.grossProfit} accent="var(--blue)" />
                    )}
                    {sectionIdx === 2 && (
                      <SubtotalRow label="EBITDA" value={localTotals.ebitda} accent="var(--amber)" />
                    )}
                  </div>
                )
              })}

              <div style={{
                display: 'flex', justifyContent: 'space-between', padding: '14px 16px',
                background: localTotals.netProfit >= 0 ? 'rgba(34,214,135,0.08)' : 'rgba(240,79,79,0.08)',
                border: `1px solid ${localTotals.netProfit >= 0 ? 'var(--green-dark)' : 'var(--red)'}`,
                borderRadius: 10, fontSize: 15, fontWeight: 700,
                color: localTotals.netProfit >= 0 ? 'var(--green)' : 'var(--red)',
                marginTop: 8, fontFamily: 'DM Mono, monospace'
              }}>
                <span>NET PROFIT / (LOSS)</span>
                <span>{fmtSigned(localTotals.netProfit)}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function SubtotalRow({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', padding: '11px 16px',
      background: `${accent}14`, border: `1px solid ${accent}40`,
      borderRadius: 8, fontSize: 13, fontWeight: 700,
      color: accent, marginTop: 12, marginBottom: 4, fontFamily: 'DM Mono, monospace'
    }}>
      <span>{label}</span>
      <span>{value < 0 ? '- ' : ''}{fmtPos(value)}</span>
    </div>
  )
}
