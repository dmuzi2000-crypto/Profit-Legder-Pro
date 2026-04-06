import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Tenant, TenantMember } from '../types/database'

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
    const { data: memberData } = await supabase
      .from('tenant_members')
      .select('*, tenants(*)')
      .eq('user_id', userId)
      .single()

    if (memberData) {
      setMember(memberData as TenantMember)
      setTenant((memberData as any).tenants as Tenant)
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
    if (error) return { error }
    if (!data.user) return { error: new Error('Signup failed') }

    // Create the tenant (workspace) for this new user
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .insert({ name: companyName, owner_id: data.user.id, plan: 'starter' })
      .select()
      .single()

    if (tenantError) return { error: tenantError }

    // Add user as owner member
    await supabase.from('tenant_members').insert({
      tenant_id: tenantData.id,
      user_id: data.user.id,
      role: 'owner',
    })

    // Create initial free subscription record
    await supabase.from('subscriptions').insert({
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
