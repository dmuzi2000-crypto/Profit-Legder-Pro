import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface Tenant {
  id: string
  name: string
  plan: string
  owner_id: string
  created_at: string
}

interface TenantMember {
  id: string
  tenant_id: string
  user_id: string
  role: string
  created_at: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  tenant: Tenant | null
  member: TenantMember | null
  isLoading: boolean
  signUp: (email: string, password: string, companyName: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshTenant: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [member, setMember] = useState<TenantMember | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  async function loadTenant(userId: string) {
    try {
      const { data } = await supabase
        .from('tenant_members')
        .select('*, tenants(*)')
        .eq('user_id', userId)
        .single()

      if (data) {
        const { tenants: tenantData, ...memberData } = data as any
        setMember(memberData as TenantMember)
        setTenant(tenantData as Tenant)
      }
    } catch {
      // no tenant yet
    }
  }

  async function refreshTenant() {
    if (user) await loadTenant(user.id)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadTenant(session.user.id).finally(() => setIsLoading(false))
      } else {
        setIsLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') return
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadTenant(session.user.id)
      } else {
        setTenant(null)
        setMember(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signUp(email: string, password: string, companyName: string) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: error as Error }
    if (!data.user) return { error: new Error('Signup failed') }

    const { data: tenantData, error: tenantError } = await (supabase as any)
      .from('tenants')
      .insert({ name: companyName, owner_id: data.user.id, plan: 'starter' })
      .select()
      .single()

    if (tenantError) return { error: tenantError as Error }

    await (supabase as any).from('tenant_members').insert({
      tenant_id: tenantData.id,
      user_id: data.user.id,
      role: 'owner',
    })

    await (supabase as any).from('subscriptions').insert({
      tenant_id: tenantData.id,
      plan: 'starter',
      status: 'trialing',
    })

    return { error: null }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setTenant(null)
    setMember(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, tenant, member, isLoading, signUp, signIn, signOut, refreshTenant }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
