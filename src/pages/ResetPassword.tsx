import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [recoverySessionActive, setRecoverySessionActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoverySessionActive(true)
      }
    })

    // Timeout if event never fires (e.g. invalid link)
    const timeout = setTimeout(() => {
      if (!recoverySessionActive) {
        setError('Invalid or expired reset link.')
      }
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [recoverySessionActive])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    
    if (error) {
      toast.error(error.message)
      setLoading(false)
    } else {
      toast.success('Password updated! Redirecting...')
      setTimeout(() => navigate('/app'), 1500)
    }
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg1)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border1)', borderRadius: 16, padding: 32 }}>
            <div style={{ color: 'var(--red)', marginBottom: 16 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h2 style={{ color: 'var(--text1)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Link Error</h2>
            <p style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 24 }}>{error}</p>
            <Link to="/auth?mode=signin" style={{ color: 'var(--green)', textDecoration: 'none', fontWeight: 600 }}>Back to sign in</Link>
          </div>
        </div>
      </div>
    )
  }

  if (!recoverySessionActive) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: '2px solid var(--green)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          <p style={{ color: 'var(--text3)', marginTop: 12, fontSize: 13 }}>Verifying reset link...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg1)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 32, justifyContent: 'center' }}>
          <div style={{ width: 28, height: 28, background: 'var(--green)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#0a0c10"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <span style={{ color: 'var(--text1)', fontWeight: 700, fontSize: 14 }}>Profit Ledger Pro</span>
        </div>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border1)', borderRadius: 16, padding: 32 }}>
          <h2 style={{ color: 'var(--text1)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Set new password</h2>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 24 }}>Choose a secure password for your account.</p>
          
          <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6, letterSpacing: '0.3px' }}>NEW PASSWORD</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" minLength={8} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6, letterSpacing: '0.3px' }}>CONFIRM PASSWORD</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" minLength={8} required />
            </div>
            <button type="submit" disabled={loading} style={{ marginTop: 4, background: 'var(--green)', border: 'none', color: '#0a0c10', padding: '11px', borderRadius: 8, fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
