import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useLedger } from '../hooks/useLedger'
import { AccountsProvider } from '../contexts/AccountsContext'
import RecordPayments from '../pages/RecordPayments'
import { ContactsProvider } from '../contexts/ContactsContext'
import { LayoutDashboard, BookOpen, TrendingUp, TrendingDown, List, Users, Settings, LogOut, CreditCard } from 'lucide-react'

const NAV = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/transactions', icon: BookOpen, label: 'Transactions' },
  { to: '/app/income-statement', icon: TrendingUp, label: 'Income Statement' },
  { to: '/app/accounts-receivable', icon: TrendingDown, label: 'Accounts Receivable' },
  { to: '/app/accounts-payable', icon: TrendingUp, label: 'Accounts Payable' },
  { to: '/app/chart-of-accounts', icon: List, label: 'Chart of Accounts' },
  { to: '/app/vendors-customers', icon: Users, label: 'Vendors & Customers' },
]

export default function Layout() {
  const { tenant, member, user, signOut } = useAuth()
  const { entries } = useLedger()
  const navigate = useNavigate()
  const [showPayments, setShowPayments] = useState(false)
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'U'

  const unpaidCount = entries.filter(e => e.payment_status !== 'paid').length

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const linkStyle = (isActive: boolean) => ({
    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8,
    textDecoration: 'none', fontSize: 13, fontWeight: 500, marginBottom: 2, transition: 'all 0.15s',
    background: isActive ? 'rgba(34,214,135,0.08)' : 'transparent',
    color: isActive ? 'var(--green)' : 'var(--text2)',
    border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left' as const, font: 'inherit'
  })

  return (
    <ContactsProvider>
      <AccountsProvider>
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg1)' }}>
          <aside style={{ width: 220, minWidth: 220, background: 'var(--bg2)', borderRight: '1px solid var(--border1)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, background: 'var(--green)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#0a0c10"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Profit Ledger</div>
                  <div style={{ fontSize: 9, color: 'var(--green)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.5px' }}>MULTI-TENANT SAAS</div>
                </div>
              </div>
            </div>

            <div style={{ margin: 12, background: 'var(--bg3)', border: '1px solid var(--border1)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tenant?.name ?? '...'}</div>
              <div style={{ fontSize: 10, color: 'var(--green)', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>{(tenant?.plan ?? 'starter').toUpperCase()} PLAN</div>
            </div>

            <nav style={{ flex: 1, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', letterSpacing: '1px', padding: '6px 10px 4px', marginTop: 4 }}>MAIN</div>
              {NAV.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} style={({ isActive }) => linkStyle(isActive)}>
                  <Icon size={16} />{label}
                </NavLink>
              ))}
              <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', letterSpacing: '1px', padding: '6px 10px 4px', marginTop: 8 }}>ACCOUNT</div>

              <button onClick={() => setShowPayments(true)} style={linkStyle(showPayments)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <CreditCard size={16} />Record Payments
                </div>
                {unpaidCount > 0 && (
                  <span style={{ background: 'var(--amber)', color: '#000', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, fontFamily: 'DM Mono, monospace' }}>
                    {unpaidCount}
                  </span>
                )}
              </button>

              <NavLink to="/app/settings" style={({ isActive }) => linkStyle(isActive)}>
                <Settings size={16} />Settings
              </NavLink>
            </nav>

            <div style={{ padding: 14, borderTop: '1px solid var(--border1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(167,139,250,0.15)', border: '1px solid var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--purple)', flexShrink: 0 }}>{initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'DM Mono, monospace' }}>{member?.role ?? 'member'}</div>
                </div>
                <button onClick={handleSignOut} title="Sign out" style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', borderRadius: 4 }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}>
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          </aside>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Outlet />
          </div>

          <RecordPayments isOpen={showPayments} onClose={() => setShowPayments(false)} />
        </div>
      </AccountsProvider>
    </ContactsProvider>
  )
}
