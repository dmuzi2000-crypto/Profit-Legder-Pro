// Stripe billing — set VITE_STRIPE_PUBLISHABLE_KEY in your .env to enable
export const STRIPE_ENABLED = !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

export const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    features: ['1 workspace', 'Up to 500 entries', 'Income statement', 'General ledger'],
    featured: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    features: ['Unlimited entries', '5 team members', 'Role-based access', 'CSV export'],
    featured: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    features: ['Unlimited members', 'Custom branding', 'API access', 'Priority support'],
    featured: false,
  },
]

export type PlanId = 'starter' | 'pro' | 'enterprise'
