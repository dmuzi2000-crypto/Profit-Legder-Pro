-- ============================================================
-- Profit Ledger Pro — Full Database Schema
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- ─── EXTENSIONS ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── TENANTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  plan       TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
  owner_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TENANT MEMBERS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_members (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

-- ─── LEDGER ENTRIES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ledger_entries (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sr_no      INTEGER NOT NULL DEFAULT 1,
  details    TEXT NOT NULL,
  type       TEXT NOT NULL,
  amount     NUMERIC(15, 2) NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SUBSCRIPTIONS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id              UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan                   TEXT NOT NULL DEFAULT 'starter',
  status                 TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  current_period_end     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- ─── Helper function: get current user's tenant_id ───────────
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id
  FROM tenant_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ─── Helper function: check if user is member of a tenant ────
CREATE OR REPLACE FUNCTION is_tenant_member(tid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_members
    WHERE tenant_id = tid AND user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ─── TENANTS RLS ─────────────────────────────────────────────
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_can_view_own_tenant"
  ON tenants FOR SELECT
  USING (is_tenant_member(id));

CREATE POLICY "owner_can_update_tenant"
  ON tenants FOR UPDATE
  USING (owner_id = auth.uid());

-- ─── TENANT_MEMBERS RLS ──────────────────────────────────────
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_can_view_own_membership"
  ON tenant_members FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY "owner_can_manage_members"
  ON tenant_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tenants
      WHERE id = tenant_id AND owner_id = auth.uid()
    )
  );

-- Allow insert for signup flow (creating own membership)
CREATE POLICY "users_can_create_own_membership"
  ON tenant_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ─── LEDGER_ENTRIES RLS ──────────────────────────────────────
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_members_can_view_entries"
  ON ledger_entries FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "tenant_members_can_insert_entries"
  ON ledger_entries FOR INSERT
  WITH CHECK (is_tenant_member(tenant_id) AND created_by = auth.uid());

CREATE POLICY "tenant_members_can_update_entries"
  ON ledger_entries FOR UPDATE
  USING (is_tenant_member(tenant_id));

CREATE POLICY "admins_can_delete_entries"
  ON ledger_entries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members
      WHERE tenant_id = ledger_entries.tenant_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin', 'member')
    )
  );

-- ─── SUBSCRIPTIONS RLS ───────────────────────────────────────
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_can_view_subscription"
  ON subscriptions FOR SELECT
  USING (is_tenant_member(tenant_id));

-- Only service role (backend/webhook) can update subscriptions
-- No update policy = only service_role key can update

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tenant_members_user_id  ON tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant_id ON tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_tenant_id ON ledger_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_created_at ON ledger_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id  ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
