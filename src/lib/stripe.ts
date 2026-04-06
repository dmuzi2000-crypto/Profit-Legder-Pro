import { loadStripe } from '@stripe/stripe-js'

const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
if (!key) throw new Error('Missing VITE_STRIPE_PUBLISHABLE_KEY')

export const stripePromise = loadStripe(key)

export const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    priceId: import.meta.env.VITE_STRIPE_PRICE_STARTER,
    features: ['1 workspace', 'Up to 500 entries', 'Income statement', 'General ledger'],
    featured: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    priceId: import.meta.env.VITE_STRIPE_PRICE_PRO,
    features: ['Unlimited entries', '5 team members', 'Role-based access', 'CSV export'],
    featured: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    priceId: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE,
    features: ['Unlimited members', 'Custom branding', 'API access', 'Priority support'],
    featured: false,
  },
] as const

export type PlanId = typeof PLANS[number]['id']
