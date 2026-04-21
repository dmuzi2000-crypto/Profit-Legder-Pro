import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../hooks/useAuth'

import { Waves } from '../components/Waves'

// --- Inline Morphing Word Component ---
const morphTime = 1.5;
const cooldownTime = 0.5;

function InlineMorphWord({ words }: { words: string[] }) {
  const textIndexRef = useRef(0);
  const morphRef = useRef(0);
  const cooldownRef = useRef(0);
  const timeRef = useRef(new Date());

  const text1Ref = useRef<HTMLSpanElement>(null);
  const text2Ref = useRef<HTMLSpanElement>(null);

  const setStyles = useCallback(
    (fraction: number) => {
      const [current1, current2] = [text1Ref.current, text2Ref.current];
      if (!current1 || !current2 || !words || words.length === 0) return;

      current2.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`;
      current2.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`;

      const invertedFraction = 1 - fraction;
      current1.style.filter = `blur(${Math.min(8 / invertedFraction - 8, 100)}px)`;
      current1.style.opacity = `${Math.pow(invertedFraction, 0.4) * 100}%`;

      current1.textContent = words[textIndexRef.current % words.length];
      current2.textContent = words[(textIndexRef.current + 1) % words.length];
    },
    [words],
  );

  const doMorph = useCallback(() => {
    morphRef.current -= cooldownRef.current;
    cooldownRef.current = 0;
    let fraction = morphRef.current / morphTime;
    if (fraction > 1) {
      cooldownRef.current = cooldownTime;
      fraction = 1;
    }
    setStyles(fraction);
    if (fraction === 1) textIndexRef.current++;
  }, [setStyles]);

  const doCooldown = useCallback(() => {
    morphRef.current = 0;
    const [current1, current2] = [text1Ref.current, text2Ref.current];
    if (current1 && current2) {
      current2.style.filter = "none";
      current2.style.opacity = "100%";
      current1.style.filter = "none";
      current1.style.opacity = "0%";
    }
  }, []);

  useEffect(() => {
    let rafId: number;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const newTime = new Date();
      const dt = (newTime.getTime() - timeRef.current.getTime()) / 1000;
      timeRef.current = newTime;
      cooldownRef.current -= dt;
      if (cooldownRef.current <= 0) doMorph();
      else doCooldown();
    };
    animate();
    return () => cancelAnimationFrame(rafId);
  }, [doMorph, doCooldown]);

  return (
    <span style={{ 
      position: 'relative', 
      display: 'inline-block', 
      minWidth: '380px', 
      height: '1em', 
      verticalAlign: 'bottom',
      marginLeft: '12px'
    }}>
      <span ref={text1Ref} style={{ position: 'absolute', top: 0, left: 0, whiteSpace: 'nowrap' }} />
      <span ref={text2Ref} style={{ position: 'absolute', top: 0, left: 0, whiteSpace: 'nowrap' }} />
    </span>
  );
}

// --- Main Landing Component ---
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

  const morphWords = ["business", "agency", "startup", "e-commerce store", "consultancy", "freelance practice", "SaaS company"];

  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg1)', position: 'relative' }}>
      {/* Background Layer */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <Waves strokeColor="#1e2535" backgroundColor="#0a0c10" />
      </div>

      {/* Overlay Layer */}
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        background: 'linear-gradient(135deg, rgba(10,12,16,0.85) 0%, rgba(10,12,16,0.6) 100%)',
        zIndex: 1,
        pointerEvents: 'none'
      }} />

      {/* Logo Top-Left */}
      <div style={{ position: 'fixed', top: '24px', left: '32px', zIndex: 2, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, background: 'var(--green)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#0a0c10"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
        <span style={{ fontWeight: 700, fontSize: 18, color: 'white', letterSpacing: '-0.5px' }}>Profit Ledger Pro</span>
      </div>

      {/* Tagline & Features Bottom-Left */}
      <div style={{ position: 'fixed', bottom: '48px', left: '48px', zIndex: 2, maxWidth: 800 }}>
        <h1 style={{ 
          fontFamily: 'DM Serif Display, serif', 
          fontSize: '64px', 
          color: 'white', 
          lineHeight: 1.1, 
          marginBottom: '40px',
          letterSpacing: '-1px',
          display: 'block'
        }}>
          The accounting platform your
          <InlineMorphWord words={morphWords} />
          deserves
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

      {/* Auth Card Center-Right */}
      <div style={{ 
        position: 'fixed', 
        right: '48px', 
        top: '50%', 
        transform: 'translateY(-50%)', 
        zIndex: 2, 
        width: '400px' 
      }}>
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
  )
}
