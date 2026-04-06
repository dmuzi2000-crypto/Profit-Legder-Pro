import { useNavigate } from 'react-router-dom'
import { PLANS } from '../lib/stripe'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg1)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px' }}>
      {/* Nav */}
      <nav style={{ width: '100%', maxWidth: 1100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 80 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'var(--green)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#0a0c10"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Profit Ledger Pro</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate('/auth?mode=signin')} style={{ background: 'none', border: '1px solid var(--border2)', color: 'var(--text2)', padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 600 }}>Sign in</button>
          <button onClick={() => navigate('/auth?mode=signup')} style={{ background: 'var(--green)', border: 'none', color: '#0a0c10', padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700 }}>Get started</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', maxWidth: 680, marginBottom: 80 }}>
        <div style={{ display: 'inline-block', background: 'rgba(34,214,135,0.1)', border: '1px solid rgba(34,214,135,0.3)', borderRadius: 20, padding: '4px 14px', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--green)', marginBottom: 24, letterSpacing: '0.5px' }}>MULTI-TENANT SAAS ACCOUNTING</div>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 52, fontWeight: 400, letterSpacing: -2, lineHeight: 1.1, margin: '0 0 20px' }}>
          The accounting platform<br /><em style={{ color: 'var(--green)' }}>your business deserves</em>
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: 16, lineHeight: 1.7, margin: '0 0 36px' }}>
          Track revenue, expenses, and profit with a clean general ledger and income statement. Every client gets their own isolated workspace.
        </p>
        <button onClick={() => navigate('/auth?mode=signup')} style={{ background: 'var(--green)', border: 'none', color: '#0a0c10', padding: '14px 32px', borderRadius: 10, cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700 }}>
          Start free trial →
        </button>
      </div>

      {/* Pricing */}
      <div style={{ width: '100%', maxWidth: 860, textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 32, fontWeight: 400, marginBottom: 8 }}>Simple pricing</h2>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 40 }}>14-day free trial on all plans. No credit card required to start.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{ background: 'var(--bg2)', border: `1px solid ${plan.featured ? 'var(--green)' : 'var(--border1)'}`, borderRadius: 16, padding: 24, textAlign: 'left', position: 'relative' }}>
              {plan.featured && <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: 'var(--green)', color: '#0a0c10', fontSize: 10, fontFamily: 'DM Mono, monospace', fontWeight: 600, padding: '3px 12px', borderRadius: 20, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>MOST POPULAR</div>}
              <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 8, letterSpacing: '0.5px' }}>{plan.name.toUpperCase()}</div>
              <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 36, marginBottom: 4 }}>${plan.price}<span style={{ fontSize: 14, fontFamily: 'Syne, sans-serif', fontWeight: 400, color: 'var(--text2)' }}>/mo</span></div>
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ fontSize: 13, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--green)', fontSize: 11, fontWeight: 700 }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <button onClick={() => navigate(`/auth?mode=signup&plan=${plan.id}`)} style={{ marginTop: 24, width: '100%', background: plan.featured ? 'var(--green)' : 'var(--bg3)', border: `1px solid ${plan.featured ? 'var(--green)' : 'var(--border2)'}`, color: plan.featured ? '#0a0c10' : 'var(--text2)', padding: '10px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 600 }}>
                Get started
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
