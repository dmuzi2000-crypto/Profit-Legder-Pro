import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { useLedger } from '../hooks/useLedger'
import { useAuth } from '../hooks/useAuth'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import AddTransactionModal from '../components/modals/AddTransactionModal'

function fmt(n: number) {
  return (n < 0 ? '-' : '') + '$' + Math.abs(Math.round(n)).toLocaleString()
}

const MONTHLY_DEMO = [
  { month: 'Jan', revenue: 28000, expenses: 19000 },
  { month: 'Feb', revenue: 31000, expenses: 20500 },
  { month: 'Mar', revenue: 27500, expenses: 18000 },
  { month: 'Apr', revenue: 34000, expenses: 22000 },
  { month: 'May', revenue: 38000, expenses: 24000 },
  { month: 'Jun', revenue: 35500, expenses: 23000 },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { tenant } = useAuth()
  const { entries, totals, isLoading } = useLedger()
  const [showTransactionModal, setShowTransactionModal] = useState(false)

  const recentEntries = [...entries].reverse().slice(0, 6)

  const kpis = [
    { label: 'TOTAL REVENUE', value: fmt(totals.revenue), positive: true },
    { label: 'GROSS PROFIT', value: fmt(totals.grossProfit), positive: totals.grossProfit >= 0 },
    { label: 'OUTSTANDING A/R', value: fmt(totals.outstandingAR), positive: false, amber: totals.outstandingAR > 0 },
    { label: 'OUTSTANDING A/P', value: fmt(totals.outstandingAP), positive: false, amber: totals.outstandingAP > 0 },
    { label: 'NET PROFIT', value: fmt(totals.netProfit), positive: totals.netProfit >= 0 },
  ]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Topbar */}
      <div style={{ height: 56, background: 'var(--bg2)', borderBottom: '1px solid var(--border1)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 12 }}>
        <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Dashboard</h1>
        <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', flex: 1 }}>{tenant?.name}</span>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowTransactionModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--green)', border: 'none', borderRadius: 8, color: '#0a0c10', fontSize: 12, fontWeight: 700, fontFamily: 'Syne, sans-serif', cursor: 'pointer' }}>
            <Plus size={14} /> Record Transaction
          </button>
          <button onClick={() => navigate('/app/transactions?action=record-payment')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'transparent', border: '1px solid var(--blue)', borderRadius: 8, color: 'var(--blue)', fontSize: 12, fontWeight: 700, fontFamily: 'Syne, sans-serif', cursor: 'pointer' }}>
            <Plus size={14} /> Record Payment
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
        {/* KPI grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
          {kpis.map(k => (
            <div key={k.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border1)', borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.5px', marginBottom: 10 }}>{k.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -1, fontFamily: 'DM Serif Display, serif', color: (k as any).amber ? 'var(--amber)' : k.positive ? 'var(--green)' : 'var(--text1)' }}>
                {isLoading ? '—' : k.value}
              </div>
            </div>
          ))}
        </div>

        {/* Charts + recent entries */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Bar chart */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border1)', borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>Revenue vs Expenses</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', marginBottom: 16 }}>6-MONTH OVERVIEW (DEMO)</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={MONTHLY_DEMO} barSize={10} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border1)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'var(--text3)', fontSize: 10, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, fontSize: 12, color: 'var(--text1)' }} formatter={(v: number) => [`$${v.toLocaleString()}`, '']} />
                <Bar dataKey="revenue" fill="#22d687" opacity={0.85} radius={[3, 3, 0, 0]} />
                <Bar dataKey="expenses" fill="#f04f4f" opacity={0.7} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
              {[{ c: 'var(--green)', l: 'Revenue' }, { c: 'var(--red)', l: 'Expenses' }].map(({ c, l }) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text2)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />{l}
                </div>
              ))}
            </div>
          </div>

          {/* Recent entries */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border1)', borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 16 }}>Recent Entries</div>
            {isLoading ? (
              <div style={{ color: 'var(--text3)', fontSize: 13 }}>Loading...</div>
            ) : recentEntries.length === 0 ? (
              <div style={{ color: 'var(--text3)', fontSize: 13 }}>No entries yet. Add entries in the General Ledger.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>{['Details', 'Type', 'Amount'].map(h => <th key={h} style={{ textAlign: h === 'Amount' ? 'right' : 'left', padding: '6px 8px', fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', letterSpacing: '0.5px', borderBottom: '1px solid var(--border1)' }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {recentEntries.map(e => (
                    <tr key={e.id}>
                      <td style={{ padding: '9px 8px', color: 'var(--text1)', borderBottom: '1px solid var(--border1)' }}>{e.details}</td>
                      <td style={{ padding: '9px 8px', borderBottom: '1px solid var(--border1)' }}>
                        <span style={{ background: e.amount >= 0 ? 'rgba(34,214,135,0.1)' : 'rgba(240,79,79,0.1)', color: e.amount >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 10, fontFamily: 'DM Mono, monospace', padding: '2px 7px', borderRadius: 20 }}>{e.type}</span>
                      </td>
                      <td style={{ padding: '9px 8px', textAlign: 'right', fontFamily: 'DM Mono, monospace', color: e.amount >= 0 ? 'var(--green)' : 'var(--red)', borderBottom: '1px solid var(--border1)' }}>{fmt(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      <AddTransactionModal isOpen={showTransactionModal} onClose={() => setShowTransactionModal(false)} />
    </div>
  )
}
