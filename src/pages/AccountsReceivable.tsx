import { useLedger } from '../hooks/useLedger'

function fmt(n: number) {
  return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function AccountsReceivable() {
  const { entries, isLoading } = useLedger()

  // Logic: Filter outstanding revenue entries (amount > 0 and not fully paid)
  // We use the same 'outstanding' logic as Dashboard/Transactions
  const outstandingEntries = entries.filter(e => e.amount > 0 && e.payment_status !== 'paid')

  // Group by contact_id
  const arByContact = outstandingEntries.reduce((acc, e) => {
    const key = e.contact_id || 'Unknown'
    const balance = e.amount - (e.paid_amount || 0)
    if (!acc[key]) {
      acc[key] = {
        contact_id: key,
        contact_name: e.contact_name || 'Generic Customer',
        amount: 0
      }
    }
    acc[key].amount += balance
    return acc
  }, {} as Record<string, { contact_id: string, contact_name: string, amount: number }>)

  const arRows = Object.values(arByContact).sort((a, b) => b.amount - a.amount)
  
  const totalAR = arRows.reduce((sum, row) => sum + row.amount, 0)
  const customerCount = arRows.length

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 56, background: 'var(--bg2)', borderBottom: '1px solid var(--border1)', display: 'flex', alignItems: 'center', padding: '0 28px' }}>
        <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Accounts Receivable</h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
          {/* KPI Card: Total A/R */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border1)', borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.5px', marginBottom: 10 }}>TOTAL A/R</div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -1, fontFamily: 'DM Serif Display, serif', color: 'var(--green)' }}>
              {fmt(totalAR)}
            </div>
          </div>

          {/* KPI Card: # Customers */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border1)', borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.5px', marginBottom: 10 }}>OUTSTANDING CUSTOMERS</div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -1, fontFamily: 'DM Serif Display, serif', color: 'var(--text1)' }}>
              {customerCount}
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border1)', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg3)' }}>
                <th style={{ textAlign: 'left', padding: '11px 16px', fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', letterSpacing: '0.5px', borderBottom: '1px solid var(--border1)', fontWeight: 500 }}>CUSTOMER NAME</th>
                <th style={{ textAlign: 'right', padding: '11px 16px', fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', letterSpacing: '0.5px', borderBottom: '1px solid var(--border1)', fontWeight: 500 }}>AMOUNT</th>
                <th style={{ textAlign: 'right', padding: '11px 16px', fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', letterSpacing: '0.5px', borderBottom: '1px solid var(--border1)', fontWeight: 500 }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={3} style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>Loading...</td></tr>
              ) : arRows.length === 0 ? (
                <tr><td colSpan={3} style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No outstanding customer balances</td></tr>
              ) : arRows.map(row => (
                <tr key={row.contact_id} style={{ transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border1)', color: 'var(--text1)' }}>{row.contact_name}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'DM Mono, monospace', borderBottom: '1px solid var(--border1)', color: 'var(--green)', fontWeight: 600 }}>{fmt(row.amount)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', borderBottom: '1px solid var(--border1)' }}>
                    <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', background: 'var(--bg3)', padding: '2px 8px', borderRadius: 20 }}>Current</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
