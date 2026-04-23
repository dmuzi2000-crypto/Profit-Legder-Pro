import { useState, useMemo } from 'react'
import { Plus, ChevronDown } from 'lucide-react'
import { useLedger, LedgerEntry } from '../hooks/useLedger'
import { useAuth } from '../hooks/useAuth'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import AddTransactionModal from '../components/modals/AddTransactionModal'
import AiEntryModal from '../components/modals/AiEntryModal'
import RecordPayments from './RecordPayments'

function fmt(n: number) {
  return (n < 0 ? '-' : '') + '$' + Math.abs(Math.round(n)).toLocaleString()
}

// ─── Period helpers ───────────────────────────────────────────────────────────
type Period = 'this_month' | 'last_month' | 'this_year' | 'last_year'

const PERIOD_LABELS: Record<Period, string> = {
  this_month: 'This Month',
  last_month: 'Last Month',
  this_year: 'This Year to Date',
  last_year: 'Last Year',
}

function getPeriodRange(period: Period): { start: Date; end: Date } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  switch (period) {
    case 'this_month':
      return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0, 23, 59, 59) }
    case 'last_month':
      return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0, 23, 59, 59) }
    case 'this_year':
      return { start: new Date(y, 0, 1), end: new Date() }
    case 'last_year':
      return { start: new Date(y - 1, 0, 1), end: new Date(y - 1, 11, 31, 23, 59, 59) }
  }
}

function filterByPeriod(entries: LedgerEntry[], period: Period): LedgerEntry[] {
  const { start, end } = getPeriodRange(period)
  return entries.filter(e => {
    const d = new Date(e.entry_date)
    return d >= start && d <= end
  })
}

// ─── Dropdown component ───────────────────────────────────────────────────────
function PeriodDropdown({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const [open, setOpen] = useState(false)
  const periods: Period[] = ['this_month', 'last_month', 'this_year', 'last_year']

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border1)',
          borderRadius: 6, padding: '3px 8px', color: 'var(--text3)',
          fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: '0.4px',
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        {PERIOD_LABELS[value].toUpperCase()}
        <ChevronDown size={10} />
      </button>
      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 9 }}
          />
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 4,
            background: 'var(--bg3)', border: '1px solid var(--border1)',
            borderRadius: 8, overflow: 'hidden', zIndex: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)', minWidth: 150,
          }}>
            {periods.map(p => (
              <button
                key={p}
                onClick={() => { onChange(p); setOpen(false) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '9px 14px', background: p === value ? 'rgba(255,255,255,0.07)' : 'transparent',
                  border: 'none', color: p === value ? 'var(--text1)' : 'var(--text2)',
                  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string
  value: string
  color?: string
  isLoading: boolean
  period?: Period
  onPeriodChange?: (p: Period) => void
  badge?: string
}

function KpiCard({ label, value, color, isLoading, period, onPeriodChange, badge }: KpiCardProps) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border1)',
      borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.5px' }}>
          {label}
        </div>
        {period && onPeriodChange ? (
          <PeriodDropdown value={period} onChange={onPeriodChange} />
        ) : badge ? (
          <span style={{
            fontSize: 9, fontFamily: 'DM Mono, monospace', letterSpacing: '0.3px',
            color: 'var(--text3)', background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border1)', borderRadius: 6, padding: '3px 7px',
          }}>
            {badge}
          </span>
        ) : null}
      </div>
      <div style={{
        fontSize: 24, fontWeight: 700, letterSpacing: -1,
        fontFamily: 'DM Serif Display, serif',
        color: color ?? 'var(--text1)',
      }}>
        {isLoading ? '—' : value}
      </div>
    </div>
  )
}

// ─── Chart subtitle helper ────────────────────────────────────────────────────
function chartSubtitle(entries: LedgerEntry[]): string {
  if (entries.length === 0) return 'NO DATA'
  const dates = entries.map(e => new Date(e.entry_date))
  const min = new Date(Math.min(...dates.map(d => d.getTime())))
  const max = new Date(Math.max(...dates.map(d => d.getTime())))
  const fmt2 = (d: Date) =>
    d.toLocaleString('default', { month: 'short', year: '2-digit' }).toUpperCase()
  if (fmt2(min) === fmt2(max)) return fmt2(min)
  return `${fmt2(min)} – ${fmt2(max)}`
}

// ─── Build monthly chart data from real entries ───────────────────────────────
function buildMonthlyData(entries: LedgerEntry[]) {
  const map: Record<string, { revenue: number; expenses: number }> = {}

  const revSubcats = ['operating revenue', 'other income', 'revenue']
  const expCats = ['expense']

  entries.forEach(e => {
    const d = new Date(e.entry_date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!map[key]) map[key] = { revenue: 0, expenses: 0 }

    const typeLC = e.type.trim().toLowerCase()
    const subcatLC = (e.account_subcategory ?? '').trim().toLowerCase()

    const isRevenue = typeLC === 'revenue' || revSubcats.includes(subcatLC)
    const isExpense = expCats.includes(typeLC) && !isRevenue

    if (isRevenue) map[key].revenue += Math.abs(e.amount)
    else if (isExpense) map[key].expenses += Math.abs(e.amount)
  })

  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, vals]) => {
      const [yr, mo] = key.split('-')
      const label = new Date(+yr, +mo - 1, 1)
        .toLocaleString('default', { month: 'short' })
      return { month: `${label} '${yr.slice(2)}`, ...vals }
    })
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { tenant } = useAuth()
  const { entries, isLoading } = useLedger()

  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [showAiModal, setShowAiModal] = useState(false)
  const [showPayments, setShowPayments] = useState(false)

  // Per-card period state
  const [salesPeriod, setSalesPeriod] = useState<Period>('this_month')
  const [cogsPeriod, setCogsPeriod] = useState<Period>('this_month')
  const [opexPeriod, setOpexPeriod] = useState<Period>('this_month')

  // ── Derived filtered sets ──────────────────────────────────────────────────
  const salesEntries = useMemo(() => filterByPeriod(entries, salesPeriod), [entries, salesPeriod])
  const cogsEntries  = useMemo(() => filterByPeriod(entries, cogsPeriod),  [entries, cogsPeriod])
  const opexEntries  = useMemo(() => filterByPeriod(entries, opexPeriod),  [entries, opexPeriod])

  const sales = useMemo(() =>
    salesEntries
      .filter(e => e.type.trim().toLowerCase() === 'revenue')
      .reduce((s, e) => s + Math.abs(e.amount), 0),
    [salesEntries])

  const cogs = useMemo(() =>
    cogsEntries
      .filter(e => ['cost of sales', 'cost of goods sold'].includes((e.account_subcategory ?? '').trim().toLowerCase()))
      .reduce((s, e) => s + Math.abs(e.amount), 0),
    [cogsEntries])

  const opex = useMemo(() =>
    opexEntries
      .filter(e =>
        e.type.trim().toLowerCase() === 'expense' &&
        !['cost of sales', 'cost of goods sold', 'interest expense', 'tax expense'].includes(
          (e.account_subcategory ?? '').trim().toLowerCase()
        )
      )
      .reduce((s, e) => s + Math.abs(e.amount), 0),
    [opexEntries])

  // AR / AP — always as at today (no period filter)
  const outstandingAR = useMemo(() =>
    entries
      .filter(e => e.type.trim().toLowerCase() === 'revenue' && e.payment_status !== 'paid')
      .reduce((s, e) => s + Math.abs(e.amount - e.paid_amount), 0),
    [entries])

  const outstandingAP = useMemo(() =>
    entries
      .filter(e => e.type.trim().toLowerCase() === 'expense' && e.payment_status !== 'paid')
      .reduce((s, e) => s + Math.abs(e.amount - e.paid_amount), 0),
    [entries])

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartData = useMemo(() => buildMonthlyData(entries), [entries])
  const subtitle = useMemo(() => chartSubtitle(entries), [entries])

  // ── Recent entries ─────────────────────────────────────────────────────────
  const recentEntries = useMemo(() => [...entries].reverse().slice(0, 6), [entries])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Topbar */}
      <div style={{ height: 56, background: 'var(--bg2)', borderBottom: '1px solid var(--border1)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 12 }}>
        <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Dashboard</h1>
        <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', flex: 1 }}>{tenant?.name}</span>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowAiModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              background: 'rgba(167,139,250,0.15)',
              border: '1px solid var(--purple)',
              borderRadius: 8, color: 'var(--purple)',
              fontSize: 12, fontWeight: 700, fontFamily: 'Syne, sans-serif', cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 14 }}>✦</span> AI Entry
          </button>
          <button onClick={() => setShowTransactionModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--green)', border: 'none', borderRadius: 8, color: '#0a0c10', fontSize: 12, fontWeight: 700, fontFamily: 'Syne, sans-serif', cursor: 'pointer' }}>
            <Plus size={14} /> Record Transaction
          </button>
          <button onClick={() => setShowPayments(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'transparent', border: '1px solid var(--blue)', borderRadius: 8, color: 'var(--blue)', fontSize: 12, fontWeight: 700, fontFamily: 'Syne, sans-serif', cursor: 'pointer' }}>
            <Plus size={14} /> Record Payment
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
        {/* KPI grid — 5 cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
          <KpiCard
            label="SALES"
            value={fmt(sales)}
            color="var(--green)"
            isLoading={isLoading}
            period={salesPeriod}
            onPeriodChange={setSalesPeriod}
          />
          <KpiCard
            label="COST OF GOODS SOLD"
            value={fmt(cogs)}
            color="var(--red)"
            isLoading={isLoading}
            period={cogsPeriod}
            onPeriodChange={setCogsPeriod}
          />
          <KpiCard
            label="OPERATING EXPENSES"
            value={fmt(opex)}
            color="var(--text1)"
            isLoading={isLoading}
            period={opexPeriod}
            onPeriodChange={setOpexPeriod}
          />
          <KpiCard
            label="ACCOUNTS RECEIVABLE"
            value={fmt(outstandingAR)}
            color={outstandingAR > 0 ? 'var(--amber)' : 'var(--green)'}
            isLoading={isLoading}
            badge="AS AT TODAY"
          />
          <KpiCard
            label="ACCOUNTS PAYABLE"
            value={fmt(outstandingAP)}
            color={outstandingAP > 0 ? 'var(--amber)' : 'var(--green)'}
            isLoading={isLoading}
            badge="AS AT TODAY"
          />
        </div>

        {/* Charts + recent entries */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Bar chart */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border1)', borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>Revenue vs Expenses</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', marginBottom: 16 }}>
              {isLoading ? 'LOADING…' : chartData.length === 0 ? 'NO DATA' : subtitle}
            </div>
            {chartData.length === 0 && !isLoading ? (
              <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 13 }}>
                No transactions recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} barSize={10} barGap={3}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border1)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text3)', fontSize: 10, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, fontSize: 12, color: 'var(--text1)' }}
                    formatter={(v: number) => [`$${v.toLocaleString()}`, '']}
                  />
                  <Bar dataKey="revenue" fill="#22d687" opacity={0.85} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expenses" fill="#f04f4f" opacity={0.7} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
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
      <AiEntryModal isOpen={showAiModal} onClose={() => setShowAiModal(false)} />
      <RecordPayments isOpen={showPayments} onClose={() => setShowPayments(false)} />
    </div>
  )
}
