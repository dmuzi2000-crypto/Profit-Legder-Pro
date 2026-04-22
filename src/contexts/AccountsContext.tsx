import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export interface Account {
  id: string
  tenant_id: string
  code: string
  name: string
  category: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'
  subcategory: string
  balance: number
  created_at: string
}

export const CATEGORIES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'] as const
export type Category = typeof CATEGORIES[number]

export const SUBCATEGORIES: Record<Category, string[]> = {
  Asset:     ['Current Asset', 'Fixed Asset', 'Other Asset'],
  Liability: ['Current Liability', 'Long-term Liability'],
  Equity:    ['Owner Equity', 'Retained Earnings'],
  Revenue:   ['Operating Revenue', 'Other Income'],
  Expense:   ['Cost of Sales', 'Operating Expense', 'Interest Expense', 'Tax Expense'],
}

export const CAT_COLORS: Record<Category, { bg: string; color: string }> = {
  Asset:     { bg: 'rgba(34,214,135,0.1)',  color: 'var(--green)' },
  Liability: { bg: 'rgba(240,79,79,0.1)',   color: 'var(--red)' },
  Equity:    { bg: 'rgba(167,139,250,0.1)', color: 'var(--purple)' },
  Revenue:   { bg: 'rgba(91,143,255,0.1)',  color: 'var(--blue)' },
  Expense:   { bg: 'rgba(245,166,35,0.1)',  color: 'var(--amber)' },
}

const SEED_DATA: Omit<Account, 'id' | 'tenant_id' | 'created_at'>[] = [
  { code: '1000', name: 'Cash & Bank',            category: 'Asset',     subcategory: 'Current Asset',      balance: 0 },
  { code: '1100', name: 'Accounts Receivable',    category: 'Asset',     subcategory: 'Current Asset',      balance: 32400 },
  { code: '1200', name: 'Inventory',              category: 'Asset',     subcategory: 'Current Asset',      balance: 0 },
  { code: '1500', name: 'Equipment',              category: 'Asset',     subcategory: 'Fixed Asset',        balance: 0 },
  { code: '2000', name: 'Accounts Payable',       category: 'Liability', subcategory: 'Current Liability',  balance: 14300 },
  { code: '2100', name: 'Accrued Expenses',       category: 'Liability', subcategory: 'Current Liability',  balance: 0  },
  { code: '2500', name: 'Long-term Loan',         category: 'Liability', subcategory: 'Long-term Liability',balance: 0 },
  { code: '3000', name: "Owner's Capital",        category: 'Equity',    subcategory: 'Owner Equity',       balance: 0 },
  { code: '3100', name: 'Retained Earnings',      category: 'Equity',    subcategory: 'Retained Earnings',  balance: 0 },
  { code: '4000', name: 'Product Sales',          category: 'Revenue',   subcategory: 'Operating Revenue',  balance: 0},
  { code: '4100', name: 'Service Revenue',        category: 'Revenue',   subcategory: 'Operating Revenue',  balance: 0 },
  { code: '5000', name: 'Cost of Goods Sold',     category: 'Expense',   subcategory: 'Cost of Sales',      balance: 0 },
  { code: '6000', name: 'Payroll',                category: 'Expense',   subcategory: 'Operating Expense',  balance: 0 },
  { code: '6100', name: 'Software Subscriptions', category: 'Expense',   subcategory: 'Operating Expense',  balance: 0  },
  { code: '6200', name: 'Rent & Utilities',       category: 'Expense',   subcategory: 'Operating Expense',  balance: 0 },
  { code: '7000', name: 'Interest Expense',       category: 'Expense',   subcategory: 'Interest Expense',   balance: 0  },
  { code: '8000', name: 'Income Tax',             category: 'Expense',   subcategory: 'Tax Expense',        balance: 0 },
]

interface AccountsContextType {
  accounts: Account[]
  isLoading: boolean
  addAccount: (a: Omit<Account, 'id' | 'tenant_id' | 'created_at'>) => Promise<{ error: string | null }>
  updateAccount: (id: string, updates: Partial<Account>) => Promise<{ error: string | null }>
  deleteAccount: (id: string) => Promise<{ error: string | null }>
  refetch: () => Promise<void>
}

const AccountsContext = createContext<AccountsContextType | null>(null)

export function AccountsProvider({ children }: { children: ReactNode }) {
  const { tenant } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAccounts = useCallback(async () => {
    if (!tenant) return
    setIsLoading(true)
    const { data, error } = await (supabase as any)
      .from('accounts')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('code', { ascending: true })

    if (error) {
      setError(error.message)
      setIsLoading(false)
      return
    }

    if (!data || data.length === 0) {
      const { error: seedError } = await (supabase as any).from('accounts').insert(
        SEED_DATA.map(s => ({ ...s, tenant_id: tenant.id }))
      )
      if (seedError) setError(seedError.message)
      else {
        const { data: seeded } = await (supabase as any)
          .from('accounts')
          .select('*')
          .eq('tenant_id', tenant.id)
          .order('code', { ascending: true })
        setAccounts(seeded ?? [])
      }
    } else {
      setAccounts(data)
    }
    setIsLoading(false)
  }, [tenant])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  async function addAccount(a: Omit<Account, 'id' | 'tenant_id' | 'created_at'>) {
    if (!tenant) return { error: 'Not authenticated' }
    const { error } = await (supabase as any).from('accounts').insert({ ...a, tenant_id: tenant.id })
    if (!error) await fetchAccounts()
    return { error: error?.message ?? null }
  }

  async function updateAccount(id: string, updates: Partial<Account>) {
    const { error } = await (supabase as any).from('accounts').update(updates).eq('id', id)
    if (!error) await fetchAccounts()
    return { error: error?.message ?? null }
  }

  async function deleteAccount(id: string) {
    const { error } = await (supabase as any).from('accounts').delete().eq('id', id)
    if (!error) await fetchAccounts()
    return { error: error?.message ?? null }
  }

  return (
    <AccountsContext.Provider value={{ accounts, isLoading, addAccount, updateAccount, deleteAccount, refetch: fetchAccounts }}>
      {children}
    </AccountsContext.Provider>
  )
}

export function useAccounts() {
  const ctx = useContext(AccountsContext)
  if (!ctx) throw new Error('useAccounts must be used inside AccountsProvider')
  return ctx
}
