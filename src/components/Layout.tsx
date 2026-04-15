import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useLedger } from '../hooks/useLedger'
import { AccountsProvider } from '../contexts/AccountsContext'
import RecordPayments from '../pages/RecordPayments'
import { ContactsProvider } from '../contexts/ContactsContext'
import { LogOut } from 'lucide-react'

const SECTIONS = [
  {
    title: 'MAIN',
    items: [
      { to: '/app/dashboard', label: 'Dashboard', icon: '📊' },
      { to: '/app/transactions', label: 'Transactions', icon: '💸' },
      { label: 'Record Payments', icon: '💳', isButton: true },
    ]
  },
  {
    title: 'REPORTS',
    items: [
      { to: '/app/income-statement', label: 'Income Statement', icon: '📄' },
      { to: '/app/accounts-receivable', label: 'Accounts Receivable', icon: '📥' },
      { to: '/app/accounts-payable', label: 'Accounts Payable', icon: '📤' },
    ]
  },
  {
    title: 'CUSTOMIZE',
    items: [
      { to: '/app/chart-of-accounts', label: 'Chart of Accounts', icon: '📁' },
      { to: '/app/vendors-customers', label: 'Vendors & Customers', icon: '🏢' },
    ]
  },
  {
    title: 'ACCOUNT',
    items: [
      { to: '/app/settings', label: 'Settings', icon: '⚙️' },
    ]
  }
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
          <aside style={{ width: 240, minWidth: 240, background: 'var(--bg2)', borderRight: '1px solid var(--border1)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px 20px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, background: 'var(--green)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#0a0c10"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)' }}>Profit Ledger</div>
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--border1)', margin: '0 16px' }} />

            <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>👤</span>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>Usman Aco</div>
            </div>

            <div style={{ height: 1, background: 'var(--border1)', margin: '0 16px 8px' }} />

            <nav style={{ flex: 1, padding: '8px 12px', overflowY: 'auto' }}>
              {SECTIONS.map((section) => (
                <div key={section.title} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', letterSpacing: '1px', padding: '6px 12px 4px', fontWeight: 600 }}>{section.title}</div>
                  {section.items.map((item) => {
                    if ('isButton' in item) {
                      return (
                        <button key={item.label} onClick={() => setShowPayments(true)} style={linkStyle(showPayments)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                            <span style={{ fontSize: 14, width: 16, textAlign: 'center' }}>{item.icon}</span>
                            {item.label}
                          </div>
                          {unpaidCount > 0 && (
                            <span style={{ background: 'var(--amber)', color: '#000', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, fontFamily: 'DM Mono, monospace' }}>
                              {unpaidCount}
                            </span>
                          )}
                        </button>
                      )
                    }
                    return (
                      <NavLink key={item.to} to={item.to!} style={({ isActive }) => linkStyle(isActive)}>
                        <span style={{ fontSize: 14, width: 16, textAlign: 'center' }}>{item.icon}</span>
                        {item.label}
                      </NavLink>
                    )
                  })}
                </div>
              ))}
            </nav>

            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border1)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(167,139,250,0.15)', border: '1px solid var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--purple)', flexShrink: 0 }}>{initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text2)' }}>{user?.email}</div>
              </div>
              <button onClick={handleSignOut} title="Sign out" style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', borderRadius: 4 }}>
                <LogOut size={14} />
              </button>
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
