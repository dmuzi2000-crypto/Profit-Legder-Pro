import { useLedger } from '../hooks/useLedger'

function fmt(n: number) {
  return (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function Section({ title, entries, total }: { title: string; entries: { details: string; amount: number }[]; total: number }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', background: 'var(--bg3)', borderRadius: 8, fontSize: 12, fontWeight: 700, color: 'var(--text1)', marginBottom: 2 }}>
        <span>{title}</span>
        <span style={{ fontFamily: 'DM Mono, monospace', color: total >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(total)}</span>
      </div>
      {entries.map((e, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px 8px 32px', fontSize: 13, color: 'var(--text2)', borderBottom: '1px solid var(--border1)' }}>
          <span>{e.details}</span>
          <span style={{ fontFamily: 'DM Mono, monospace', color: e.amount >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(e.amount)}</span>
        </div>
      ))}
    </div>
  )
}

export default function IncomeStatement() {
  const { entries, totals, isLoading } = useLedger()
  const now = new Date()

  const grouped = (type: string) => entries.filter(e => e.type === type)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 56, background: 'var(--bg2)', borderBottom: '1px solid var(--border1)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 12 }}>
        <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0, flex: 1 }}>Income Statement</h1>
        <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text2)', fontSize: 12, fontWeight: 600, fontFamily: 'Syne, sans-serif', cursor: 'pointer' }}>
          Export / Print
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border1)', borderRadius: 16, padding: 24, maxWidth: 760 }}>
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
              <Section title="Revenue" entries={grouped('Revenue')} total={grouped('Revenue').reduce((s, e) => s + e.amount, 0)} />
              <Section title="Cost of Sales" entries={grouped('Cost of Sales')} total={grouped('Cost of Sales').reduce((s, e) => s + e.amount, 0)} />

              {/* Gross Profit */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 16px', background: 'rgba(91,143,255,0.08)', border: '1px solid rgba(91,143,255,0.2)', borderRadius: 8, fontSize: 13, fontWeight: 700, color: 'var(--blue)', marginBottom: 20, fontFamily: 'DM Mono, monospace' }}>
                <span>GROSS PROFIT</span>
                <span>{fmt(totals.grossProfit)}</span>
              </div>

              <Section title="Operational Expenses" entries={grouped('Operational Expenses')} total={grouped('Operational Expenses').reduce((s, e) => s + e.amount, 0)} />

              {/* EBITDA */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 16px', background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: 8, fontSize: 13, fontWeight: 700, color: 'var(--amber)', marginBottom: 20, fontFamily: 'DM Mono, monospace' }}>
                <span>EBITDA</span>
                <span>{fmt(totals.ebitda)}</span>
              </div>

              <Section title="Other Income" entries={grouped('Other Income')} total={grouped('Other Income').reduce((s, e) => s + e.amount, 0)} />
              <Section title="Interest Expense" entries={grouped('Interest Expense')} total={grouped('Interest Expense').reduce((s, e) => s + e.amount, 0)} />
              <Section title="Tax Expense" entries={grouped('Tax Expense')} total={grouped('Tax Expense').reduce((s, e) => s + e.amount, 0)} />

              {/* Net Profit */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', background: totals.netProfit >= 0 ? 'rgba(34,214,135,0.08)' : 'rgba(240,79,79,0.08)', border: `1px solid ${totals.netProfit >= 0 ? 'var(--green-dark)' : 'var(--red)'}`, borderRadius: 10, fontSize: 15, fontWeight: 700, color: totals.netProfit >= 0 ? 'var(--green)' : 'var(--red)', marginTop: 8, fontFamily: 'DM Mono, monospace' }}>
                <span>NET PROFIT / (LOSS)</span>
                <span>{fmt(totals.netProfit)}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
