import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { PLANS } from '../lib/stripe'

export default function Settings() {
  const { tenant, user, refreshTenant } = useAuth()
  const [companyName, setCompanyName] = useState(tenant?.name ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSaveCompany(e: React.FormEvent) {
    e.preventDefault()
    if (!tenant) return
    setSaving(true)
    const { error } = await supabase.from('tenants').update({ name: companyName }).eq('id', tenant.id)
    if (error) toast.error(error.message)
    else { toast.success('Company name updated'); await refreshTenant() }
    setSaving(false)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 56, background: 'var(--bg2)', borderBottom: '1px solid var(--border1)', display: 'flex', alignItems: 'center', padding: '0 28px' }}>
        <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Settings</h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
        <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Workspace */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border1)', borderRadius: 16, padding: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px' }}>Workspace</h2>
            <form onSubmit={handleSaveCompany} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6 }}>COMPANY NAME</label>
                <input value={companyName} onChange={e => setCompanyName(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6 }}>WORKSPACE ID</label>
                <input value={tenant?.id ?? ''} readOnly style={{ color: 'var(--text3)', cursor: 'default' }} />
              </div>
              <button type="submit" disabled={saving} style={{ alignSelf: 'flex-start', padding: '8px 18px', background: 'var(--green)', border: 'none', borderRadius: 8, color: '#0a0c10', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </form>
          </div>

          {/* Account */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border1)', borderRadius: 16, padding: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px' }}>Account</h2>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6 }}>EMAIL</label>
              <input value={user?.email ?? ''} readOnly style={{ color: 'var(--text3)', cursor: 'default' }} />
            </div>
          </div>

          {/* Plan — Coming Soon */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border1)', borderRadius: 16, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Subscription Plan</h2>
              <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', background: 'rgba(245,166,35,0.1)', color: 'var(--amber)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 20, padding: '3px 10px' }}>BILLING COMING SOON</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text3)', margin: '0 0 20px' }}>
              All features are free during early access. Paid plans will be introduced soon — you'll be notified before any charges.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {PLANS.map(plan => {
                const isCurrent = plan.id === 'pro'
                return (
                  <div key={plan.id} style={{ border: `1px solid ${isCurrent ? 'var(--green)' : 'var(--border1)'}`, borderRadius: 12, padding: 16, background: isCurrent ? 'rgba(34,214,135,0.05)' : 'var(--bg3)' }}>
                    <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6 }}>{plan.name.toUpperCase()}</div>
                    <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, marginBottom: 12, color: 'var(--text1)' }}>
                      ${plan.price}<span style={{ fontSize: 12, fontFamily: 'Syne, sans-serif', color: 'var(--text3)' }}>/mo</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace' }}>
                      {isCurrent ? '✓ FREE EARLY ACCESS' : 'COMING SOON'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Danger zone */}
          <div style={{ background: 'var(--bg2)', border: '1px solid rgba(240,79,79,0.3)', borderRadius: 16, padding: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px', color: 'var(--red)' }}>Danger Zone</h2>
            <p style={{ fontSize: 12, color: 'var(--text3)', margin: '0 0 16px' }}>These actions are irreversible.</p>
            <button onClick={() => toast.error('Contact support to delete your workspace')} style={{ padding: '8px 16px', background: 'rgba(240,79,79,0.1)', border: '1px solid rgba(240,79,79,0.3)', borderRadius: 8, color: 'var(--red)', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Delete workspace
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
