import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../hooks/useAuth'

export default function Landing() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const mode = params.get('mode') || 'signin'
  const isSignup = mode === 'signup'

  const { signIn, signUp, user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (user) navigate('/app') }, [user, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    if (isSignup) {
      if (!company.trim()) { toast.error('Company name is required'); setLoading(false); return }
      const { error } = await signUp(email, password, company)
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Account created! Check your email to verify.')
      navigate('/app')
    } else {
      const { error } = await signIn(email, password)
      if (error) { toast.error('Invalid email or password'); setLoading(false); return }
      navigate('/app')
    }

    setLoading(false)
  }

  const features = [
    'Multi-tenant client isolation',
    'Automated Ledger & Journaling',
    'Real-time Income Statements',
    'AI-Powered Transaction Entry'
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg1)' }}>
      {/* Left Column - 60% */}
      <div style={{ 
        width: '60%', 
        position: 'relative', 
        overflow: 'hidden',
        background: 'var(--bg2)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '60px'
      }}>
        {/* Video Background */}
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover',
            zIndex: 0,
            opacity: 0.6
          }}
        >
          <source src="/demo.mp4" type="video/mp4" />
        </video>

        {/* Overlay Content */}
        <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {/* Logo Top-Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, background: 'var(--green)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#0a0c10"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 18, color: 'white', letterSpacing: '-0.5px' }}>Profit Ledger Pro</span>
          </div>

          {/* Tagline & Features Bottom-Left */}
          <div style={{ maxWidth: 540 }}>
            <h1 style={{ 
              fontFamily: 'DM Serif Display, serif', 
              fontSize: '64px', 
              color: 'white', 
              lineHeight: 1.1, 
              marginBottom: '32px',
              letterSpacing: '-1px'
            }}>
              The accounting platform your business deserves
            </h1>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {features.map(feature => (
                <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - 40% */}
      <div style={{ 
        width: '40%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '60px',
        background: 'var(--bg1)'
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border1)', borderRadius: 24, padding: 40, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 24, marginBottom: 8, color: 'var(--text1)' }}>
              {isSignup ? 'Get started' : 'Welcome back'}
            </h2>
            <p style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 24 }}>
              {isSignup ? 'Create your workspace to begin tracking.' : 'Login to manage your business ledgers.'}
            </p>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border1)', marginBottom: 24 }}>
              {(['signin', 'signup'] as const).map(tab => (
                <button 
                  key={tab} 
                  onClick={() => setParams({ mode: tab })} 
                  style={{ 
                    flex: 1, 
                    padding: '12px 0', 
                    background: 'none', 
                    border: 'none', 
                    borderBottom: `2px solid ${mode === tab ? 'var(--green)' : 'transparent'}`, 
                    color: mode === tab ? 'var(--green)' : 'var(--text3)', 
                    fontFamily: 'Syne, sans-serif', 
                    fontSize: 13, 
                    fontWeight: 600, 
                    cursor: 'pointer', 
                    marginBottom: -1, 
                    transition: 'all 0.15s' 
                  }}
                >
                  {tab === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {isSignup && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 8, letterSpacing: '0.5px' }}>COMPANY NAME</label>
                  <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme Corp" required={isSignup} />
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 8, letterSpacing: '0.5px' }}>EMAIL</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 8, letterSpacing: '0.5px' }}>PASSWORD</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" minLength={8} required />
              </div>
              <button 
                type="submit" 
                disabled={loading} 
                style={{ 
                  marginTop: 8, 
                  background: 'var(--green)', 
                  border: 'none', 
                  color: '#0a0c10', 
                  padding: '14px', 
                  borderRadius: 12, 
                  fontFamily: 'Syne, sans-serif', 
                  fontSize: 14, 
                  fontWeight: 700, 
                  cursor: loading ? 'not-allowed' : 'pointer', 
                  opacity: loading ? 0.7 : 1,
                  transition: 'transform 0.1s active'
                }}
              >
                {loading ? 'Please wait...' : isSignup ? 'Create account & workspace' : 'Sign in'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--text3)' }}>
              {isSignup ? 'Already have an account? ' : "Don't have an account? "}
              <button 
                onClick={() => setParams({ mode: isSignup ? 'signin' : 'signup' })} 
                style={{ background: 'none', border: 'none', color: 'var(--green)', cursor: 'pointer', padding: 0, font: 'inherit', fontWeight: 600 }}
              >
                {isSignup ? 'Sign in' : 'Create one'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
