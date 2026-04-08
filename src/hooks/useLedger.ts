import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface LedgerEntry {
  id: string
  tenant_id: string
  sr_no: number
  details: string
  type: string
  amount: number
  payment_status: 'paid' | 'unpaid' | 'partial'
  due_date: string | null
  paid_at: string | null
  paid_amount: number
  created_at: string
  created_by: string
}

export function useLedger() {
  const { tenant, user } = useAuth()
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    if (!tenant) return
    setIsLoading(true)
    const { data, error } = await (supabase as any)
      .from('ledger_entries')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('sr_no', { ascending: true })

    if (error) setError(error.message)
    else setEntries(data ?? [])
    setIsLoading(false)
  }, [tenant])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  async function addEntry(details: string, type: string, amount: number, payment_status: 'paid' | 'unpaid' = 'paid', due_date: string | null = null) {
    if (!tenant || !user) return { error: 'Not authenticated' }
    const maxSr = entries.length > 0 ? Math.max(...entries.map((e: LedgerEntry) => e.sr_no)) : 0
    const { error } = await (supabase as any).from('ledger_entries').insert({
      tenant_id: tenant.id,
      created_by: user.id,
      sr_no: maxSr + 1,
      details,
      type,
      amount,
      payment_status,
      due_date,
      paid_amount: payment_status === 'paid' ? amount : 0,
      paid_at: payment_status === 'paid' ? new Date().toISOString() : null
    })
    if (!error) await fetchEntries()
    return { error: error?.message ?? null }
  }

  async function updateEntry(id: string, updates: Partial<LedgerEntry>) {
    const { error } = await (supabase as any).from('ledger_entries').update(updates).eq('id', id)
    if (!error) await fetchEntries()
    return { error: error?.message ?? null }
  }

  async function updatePayment(id: string, updates: { payment_status: string, paid_at?: string | null, paid_amount?: number }) {
    const { error } = await (supabase as any).from('ledger_entries').update(updates).eq('id', id)
    if (!error) await fetchEntries()
    return { error: error?.message ?? null }
  }

  async function deleteEntry(id: string) {
    const { error } = await (supabase as any).from('ledger_entries').delete().eq('id', id)
    if (!error) await fetchEntries()
    return { error: error?.message ?? null }
  }

  const totals = {
    revenue: entries.filter(e => e.type === 'Revenue' || e.type === 'Other Income').reduce((s, e) => s + e.amount, 0),
    cogs: entries.filter(e => e.type === 'Cost of Sales').reduce((s, e) => s + e.amount, 0),
    opex: entries.filter(e => e.type === 'Operational Expenses').reduce((s, e) => s + e.amount, 0),
    interest: entries.filter(e => e.type === 'Interest Expense').reduce((s, e) => s + e.amount, 0),
    tax: entries.filter(e => e.type === 'Tax Expense').reduce((s, e) => s + e.amount, 0),
    
    // Outstanding Receivables (unpaid Revenue)
    get outstandingAR() {
      return entries
        .filter(e => (e.type === 'Revenue' || e.type === 'Other Income') && e.payment_status !== 'paid')
        .reduce((s, e) => s + (e.amount - e.paid_amount), 0)
    },
    // Outstanding Payables (unpaid Expenses)
    get outstandingAP() {
      return entries
        .filter(e => (e.type !== 'Revenue' && e.type !== 'Other Income') && e.payment_status !== 'paid')
        .reduce((s, e) => s + Math.abs(e.amount - e.paid_amount), 0)
    },

    get grossProfit() { return this.revenue + this.cogs },
    get ebitda() { return this.grossProfit + this.opex },
    get netProfit() { return this.ebitda + this.interest + this.tax },
  }

  return { entries, totals, isLoading, error, addEntry, updateEntry, updatePayment, deleteEntry, refetch: fetchEntries }
}
