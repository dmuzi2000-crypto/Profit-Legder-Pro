import { createContext, useContext, useState, ReactNode } from 'react'

export interface Account {
  id: string
  code: string
  name: string
  category: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'
  subcategory: string
  balance: number
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

const SEED: Account[] = [
  { id: '1',  code: '1000', name: 'Cash & Bank',            category: 'Asset',     subcategory: 'Current Asset',      balance: 0 },
  { id: '2',  code: '1100', name: 'Accounts Receivable',    category: 'Asset',     subcategory: 'Current Asset',      balance: 32400 },
  { id: '3',  code: '1200', name: 'Inventory',              category: 'Asset',     subcategory: 'Current Asset',      balance: 0 },
  { id: '4',  code: '1500', name: 'Equipment',              category: 'Asset',     subcategory: 'Fixed Asset',        balance: 0 },
  { id: '5',  code: '2000', name: 'Accounts Payable',       category: 'Liability', subcategory: 'Current Liability',  balance: 14300 },
  { id: '6',  code: '2100', name: 'Accrued Expenses',       category: 'Liability', subcategory: 'Current Liability',  balance: 0  },
  { id: '7',  code: '2500', name: 'Long-term Loan',         category: 'Liability', subcategory: 'Long-term Liability',balance: 0 },
  { id: '8',  code: '3000', name: "Owner's Capital",        category: 'Equity',    subcategory: 'Owner Equity',       balance: 0 },
  { id: '9',  code: '3100', name: 'Retained Earnings',      category: 'Equity',    subcategory: 'Retained Earnings',  balance: 0 },
  { id: '10', code: '4000', name: 'Product Sales',          category: 'Revenue',   subcategory: 'Operating Revenue',  balance: 0},
  { id: '11', code: '4100', name: 'Service Revenue',        category: 'Revenue',   subcategory: 'Operating Revenue',  balance: 0 },
  { id: '12', code: '5000', name: 'Cost of Goods Sold',     category: 'Expense',   subcategory: 'Cost of Sales',      balance: 0 },
  { id: '13', code: '6000', name: 'Payroll',                category: 'Expense',   subcategory: 'Operating Expense',  balance: 0 },
  { id: '14', code: '6100', name: 'Software Subscriptions', category: 'Expense',   subcategory: 'Operating Expense',  balance: 0  },
  { id: '15', code: '6200', name: 'Rent & Utilities',       category: 'Expense',   subcategory: 'Operating Expense',  balance: 0 },
  { id: '16', code: '7000', name: 'Interest Expense',       category: 'Expense',   subcategory: 'Interest Expense',   balance: 0  },
  { id: '17', code: '8000', name: 'Income Tax',             category: 'Expense',   subcategory: 'Tax Expense',        balance: 0 },
]

interface AccountsContextType {
  accounts: Account[]
  addAccount: (a: Omit<Account, 'id'>) => void
  updateAccount: (id: string, updates: Partial<Account>) => void
  deleteAccount: (id: string) => void
}

const AccountsContext = createContext<AccountsContextType | null>(null)

export function AccountsProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>(() => SEED.map(a => ({ ...a })))

  function addAccount(a: Omit<Account, 'id'>) {
    const newAcc: Account = { ...a, id: Date.now().toString() }
    setAccounts(prev => [...prev, newAcc].sort((x, y) => x.code.localeCompare(y.code)))
  }

  function updateAccount(id: string, updates: Partial<Account>) {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a))
  }

  function deleteAccount(id: string) {
    setAccounts(prev => prev.filter(a => a.id !== id))
  }

  return (
    <AccountsContext.Provider value={{ accounts, addAccount, updateAccount, deleteAccount }}>
      {children}
    </AccountsContext.Provider>
  )
}

export function useAccounts() {
  const ctx = useContext(AccountsContext)
  if (!ctx) throw new Error('useAccounts must be used inside AccountsProvider')
  return ctx
}
