import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'

type Stage = 'loading' | 'ready' | 'error' | 'success'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [stage, setStage] = useState<Stage>('loading')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Supabase parses the #access_token hash and fires onAuthStateChange.
    // We subscribe FIRST, then call getSession() so we don't miss the event.
    let resolved = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        resolved = true
        setStage('ready')
      }
      // If user somehow already has a normal session (not recovery), bail out
      if (event === 'SIGNED_IN' && session && !resolved) {
        resolved = true
        setStage('ready')
      }
    })

    // Also check if session already exists by the time we mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (resolved) return
      if (session) {
        resolved = true
        setStage('ready')
      } else {
        // Give onAuthStateChange 2s to fire before showing error
        setTimeout(() => {
          if (!resolved) setStage('error')
        }, 2000)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { toast.error('Passwords do not match'); return }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error(error.message)
      setSaving(false)
      return
    }
    setStage('success')
    toast.success('Password updated!')
    setTimeout(() => navigate('/app'), 1500)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg1)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 32, justifyContent: 'center' }}>
          <div style={{ width: 28, height: 28, background: 'var(--green)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#0a0c10"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <span style={{ color: 'var(--text1)', fontWeight: 700, fontSize: 14 }}>Profit Ledger Pro</span>
        </Link>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border1)', borderRadius: 16, padding: 32 }}>

          {/* LOADING */}
          {stage === 'loading' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 32, height: 32, border: '2px solid var(--green)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text3)', fontSize: 13, margin: 0 }}>Verifying reset link...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          )}

          {/* ERROR */}
          {stage === 'error' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: 'var(--red)' }}>Invalid or expired link</h2>
              <p style={{ fontSize: 13, color: 'var(--text3)', margin: '0 0 24px' }}>This reset link has expired or already been used.</p>
              <Link to="/auth?mode=signin" style={{ color: 'var(--green)', fontSize: 13, textDecoration: 'none' }}>← Back to sign in</Link>
            </div>
          )}

          {/* FORM */}
          {stage === 'ready' && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Set new password</h2>
              <p style={{ fontSize: 12, color: 'var(--text3)', margin: '0 0 24px' }}>Must be at least 8 characters.</p>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6, letterSpacing: '0.3px' }}>NEW PASSWORD</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" minLength={8} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 6, letterSpacing: '0.3px' }}>CONFIRM PASSWORD</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" minLength={8} required />
                </div>
                <button type="submit" disabled={saving} style={{ marginTop: 4, background: 'var(--green)', border: 'none', color: '#0a0c10', padding: '11px', borderRadius: 8, fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Updating...' : 'Update password'}
                </button>
              </form>
            </>
          )}

          {/* SUCCESS */}
          {stage === 'success' && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: 'var(--green)' }}>Password updated!</h2>
              <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0 }}>Redirecting to your workspace...</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
