import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const mode = params.get('mode') || 'signin'
  const isSignup = mode === 'signup'

  const { signIn, signUp, user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)

  useEffect(() => { if (user) navigate('/app') }, [user, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    if (forgotMode) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password'
      })
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Check your email for the reset link.')
      }
      setLoading(false)
      return
    }

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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg1)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 32, justifyContent: 'center' }}>
          <div style={{ width: 28, height: 28, background: 'var(--green)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#0a0c10"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <span style={{ color: 'var(--text1)', fontWeight: 700, fontSize: 14 }}>Profit Ledger Pro</span>
        </Link>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border1)', borderRadius: 16, padding: 32 }}>
          {forgotMode ? (
            <div>
              <button 
                onClick={() => setForgotMode(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                ← Back to sign in
              </button>
              <h2 style={{ color: 'var(--text1)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Reset your password</h2>
              <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 24 }}>Enter your email and we'll send you a reset link.</p>
              
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6, letterSpacing: '0.3px' }}>EMAIL</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required />
                </div>
                <button type="submit" disabled={loading} style={{ marginTop: 4, background: 'var(--green)', border: 'none', color: '#0a0c10', padding: '11px', borderRadius: 8, fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border1)', marginBottom: 24 }}>
                {(['signin', 'signup'] as const).map(tab => (
                  <button key={tab} onClick={() => { navigate(`/auth?mode=${tab}`); setForgotMode(false) }} style={{ flex: 1, padding: '8px 0', background: 'none', border: 'none', borderBottom: `2px solid ${mode === tab ? 'var(--green)' : 'transparent'}`, color: mode === tab ? 'var(--green)' : 'var(--text3)', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: -1, transition: 'all 0.15s' }}>
                    {tab === 'signin' ? 'Sign in' : 'Create account'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {isSignup && (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6, letterSpacing: '0.3px' }}>COMPANY NAME</label>
                    <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme Corp" required={isSignup} />
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6, letterSpacing: '0.3px' }}>EMAIL</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', letterSpacing: '0.3px', margin: 0 }}>PASSWORD</label>
                    {!isSignup && (
                      <button 
                        type="button"
                        onClick={() => setForgotMode(true)}
                        style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 11, cursor: 'pointer', padding: 0, transition: 'color 0.15s' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--green)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text3)'}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" minLength={8} required />
                </div>
                <button type="submit" disabled={loading} style={{ marginTop: 4, background: 'var(--green)', border: 'none', color: '#0a0c10', padding: '11px', borderRadius: 8, fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Please wait...' : isSignup ? 'Create account & workspace' : 'Sign in'}
                </button>
              </form>
            </>
          )}
        </div>
        {!forgotMode && (
          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text3)' }}>
            {isSignup ? 'Already have an account? ' : "Don't have an account? "}
            <Link to={`/auth?mode=${isSignup ? 'signin' : 'signup'}`} style={{ color: 'var(--green)', textDecoration: 'none' }}>
              {isSignup ? 'Sign in' : 'Create one'}
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

