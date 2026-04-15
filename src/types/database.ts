export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          plan: 'starter' | 'pro' | 'enterprise'
          owner_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          plan?: 'starter' | 'pro' | 'enterprise'
          owner_id: string
          created_at?: string
        }
        Update: {
          name?: string
          plan?: 'starter' | 'pro' | 'enterprise'
        }
      }
      tenant_members: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member' | 'viewer'
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          created_at?: string
        }
        Update: {
          role?: 'owner' | 'admin' | 'member' | 'viewer'
        }
      }
      ledger_entries: {
        Row: {
          id: string
          tenant_id: string
          sr_no: number
          details: string
          type: string
          amount: number
          entry_date: string
          contact_id: string | null
          contact_name: string | null
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          tenant_id: string
          sr_no?: number
          details: string
          type: string
          amount: number
          entry_date?: string
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          created_by: string
        }
        Update: {
          details?: string
          type?: string
          amount?: number
          entry_date?: string
          contact_id?: string | null
          contact_name?: string | null
        }
      }
      subscriptions: {
        Row: {
          id: string
          tenant_id: string
          plan: string
          status: 'active' | 'past_due' | 'canceled' | 'trialing'
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          current_period_end: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          plan: string
          status?: 'active' | 'past_due' | 'canceled' | 'trialing'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          current_period_end?: string | null
        }
        Update: {
          plan?: string
          status?: 'active' | 'past_due' | 'canceled' | 'trialing'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          current_period_end?: string | null
        }
      }
      contacts: {
        Row: {
          id: string
          tenant_id: string
          type: 'Customer' | 'Vendor' | 'Both'
          name: string
          email: string
          phone: string
          company: string
          address: string
          balance: number
          status: 'Active' | 'Inactive'
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          type?: 'Customer' | 'Vendor' | 'Both'
          name: string
          email?: string
          phone?: string
          company?: string
          address?: string
          balance?: number
          status?: 'Active' | 'Inactive'
          created_at?: string
        }
        Update: {
          type?: 'Customer' | 'Vendor' | 'Both'
          name?: string
          email?: string
          phone?: string
          company?: string
          address?: string
          balance?: number
          status?: 'Active' | 'Inactive'
        }
      }
    }
  }
}

// Convenience types
export type Tenant = Database['public']['Tables']['tenants']['Row']
export type TenantMember = Database['public']['Tables']['tenant_members']['Row']
export type LedgerEntry = Database['public']['Tables']['ledger_entries']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type Contact = Database['public']['Tables']['contacts']['Row']

export const ENTRY_TYPES = [
  'Revenue',
  'Cost of Sales',
  'Operational Expenses',
  'Other Income',
  'Interest Expense',
  'Tax Expense',
] as const

export type EntryType = typeof ENTRY_TYPES[number]
