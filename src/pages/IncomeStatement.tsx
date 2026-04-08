import { useLedger } from '../hooks/useLedger'
import { useAccounts } from '../contexts/AccountsContext'

function fmtPos(n: number) {
  return '$' + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtSigned(n: number) {
  return (n < 0 ? '- ' : '') + '$' + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
  const { entries, totals, isLoading } = useLedger()
  const { accounts } = useAccounts()
  const now = new Date()

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 56, background: 'var(--bg2)', borderBottom: '1px solid var(--border1)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 12 }}>
        <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0, flex: 1 }}>Income Statement</h1>
        <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text2)', fontSize: 12, fontWeight: 600, fontFamily: 'Syne, sans-serif', cursor: 'pointer' }}>
          Export / Print
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border1)', borderRadius: 16, padding: 24, maxWidth: 820 }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 28, borderBottom: '1px solid var(--border1)', paddingBottom: 20 }}>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 24, fontWeight: 400, margin: '0 0 4px' }}>Income Statement</h2>
            <p style={{ color: 'var(--text3)', fontSize: 12, fontFamily: 'DM Mono, monospace', margin: 0 }}>
              As of {now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>Loading...</div>
          ) : (
            <>
              {IS_SECTIONS.map((section, sectionIdx) => {
                // All accounts in CoA matching this section's subcategory
                const sectionAccounts = accounts.filter(a => a.subcategory === section.subcat)

                // For each account, sum matching ledger entries (by account_id or legacy type)
                const rows = sectionAccounts.map(acc => {
                  const matched = entries.filter(e => {
                    if (e.account_id) return e.account_id === acc.id
                    return resolveSubcat(e) === section.subcat
                  })
                  const sum = matched.reduce((s, e) => s + Math.abs(e.amount), 0)
                  return { acc, sum }
                })

                // Also pick up any legacy entries that have no account_id and map to this subcat,
                // but whose account wasn't in CoA (i.e. not already counted in rows)
                const coveredIds = new Set(entries.filter(e => e.account_id).map(e => e.account_id))
                const legacyEntries = entries.filter(e =>
                  !e.account_id &&
                  !coveredIds.has(e.id) &&
                  resolveSubcat(e) === section.subcat
                )
                // Group legacy by their type label
                const legacyMap: Record<string, number> = {}
                legacyEntries.forEach(e => {
                  const key = e.type
                  legacyMap[key] = (legacyMap[key] ?? 0) + Math.abs(e.amount)
                })

                const sectionTotal = rows.reduce((s, r) => s + r.sum, 0) + Object.values(legacyMap).reduce((s, v) => s + v, 0)
                const color = section.isExpense ? 'var(--red)' : 'var(--green)'

                return (
                  <div key={section.subcat} style={{ marginBottom: 24 }}>
                    {/* Section header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 16px', background: 'var(--bg3)', borderRadius: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>{section.title}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'DM Mono, monospace', color }}>
                        {section.isExpense ? '- ' : ''}{fmtPos(sectionTotal)}
                      </span>
                    </div>

                    {/* CoA account sub-rows */}
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

                    {/* Legacy entries that have no matching CoA account */}
                    {Object.entries(legacyMap).map(([label, sum]) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 16px 7px 32px', borderBottom: '1px solid var(--border1)', fontSize: 13 }}>
                        <span style={{ color: 'var(--text2)', fontStyle: 'italic' }}>{label} (legacy)</span>
                        <span style={{ fontFamily: 'DM Mono, monospace', color }}>
                          {section.isExpense ? '- ' : ''}{fmtPos(sum)}
                        </span>
                      </div>
                    ))}

                    {/* Total row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text2)', borderBottom: '1px solid var(--border2)' }}>
                      <span>Total {section.title}</span>
                      <span style={{ fontFamily: 'DM Mono, monospace', color }}>
                        {section.isExpense && sectionTotal > 0 ? '- ' : ''}{fmtPos(sectionTotal)}
                      </span>
                    </div>

                    {/* Insert subtotal rows after specific sections */}
                    {sectionIdx === 1 && (
                      <SubtotalRow label="GROSS PROFIT" value={totals.grossProfit} accent="var(--blue)" />
                    )}
                    {sectionIdx === 2 && (
                      <SubtotalRow label="EBITDA" value={totals.ebitda} accent="var(--amber)" />
                    )}
                  </div>
                )
              })}

              {/* Net Profit */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', padding: '14px 16px',
                background: totals.netProfit >= 0 ? 'rgba(34,214,135,0.08)' : 'rgba(240,79,79,0.08)',
                border: `1px solid ${totals.netProfit >= 0 ? 'var(--green-dark)' : 'var(--red)'}`,
                borderRadius: 10, fontSize: 15, fontWeight: 700,
                color: totals.netProfit >= 0 ? 'var(--green)' : 'var(--red)',
                marginTop: 8, fontFamily: 'DM Mono, monospace'
              }}>
                <span>NET PROFIT / (LOSS)</span>
                <span>{fmtSigned(totals.netProfit)}</span>
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
