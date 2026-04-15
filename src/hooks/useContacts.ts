import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { Contact } from '../types/database'

export function useContacts() {
  const { tenant } = useAuth()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchContacts = useCallback(async () => {
    if (!tenant) return
    setIsLoading(true)
    const { data, error } = await (supabase as any)
      .from('contacts')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('name', { ascending: true })

    if (error) setError(error.message)
    else setContacts(data ?? [])
    setIsLoading(false)
  }, [tenant])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  async function addContact(c: Omit<Contact, 'id' | 'tenant_id' | 'created_at'>) {
    if (!tenant) return { error: 'Not authenticated' }
    const { error } = await (supabase as any).from('contacts').insert({
      ...c,
      tenant_id: tenant.id
    })
    if (!error) await fetchContacts()
    return { error: error?.message ?? null }
  }

  async function updateContact(id: string, updates: Partial<Contact>) {
    const { error } = await (supabase as any).from('contacts').update(updates).eq('id', id)
    if (!error) await fetchContacts()
    return { error: error?.message ?? null }
  }

  async function deleteContact(id: string) {
    const { error } = await (supabase as any).from('contacts').delete().eq('id', id)
    if (!error) await fetchContacts()
    return { error: error?.message ?? null }
  }

  return { contacts, isLoading, error, addContact, updateContact, deleteContact, refetch: fetchContacts }
}
