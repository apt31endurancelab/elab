-- 005: Shopify connections + synced data tables
-- Run after 001_create_schema.sql.

-- Connection state per store. Tokens are stored encrypted at the application level only if you
-- enable Postgres pgcrypto; for now we rely on TLS + service-role gate. Move to encrypted at-rest
-- when handling more than one tenant.
CREATE TABLE IF NOT EXISTS public.shopify_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  shop_domain TEXT UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  scopes TEXT,
  status TEXT NOT NULL DEFAULT 'connected'
    CHECK (status IN ('connecting', 'connected', 'syncing', 'error', 'disconnected')),
  status_message TEXT,
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ,
  last_sync_error TEXT,
  webhook_ids JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Local mirror of Shopify orders, mapped to our internal model.
CREATE TABLE IF NOT EXISTS public.shopify_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.shopify_connections(id) ON DELETE CASCADE,
  shopify_id TEXT NOT NULL,
  order_number TEXT,
  customer_email TEXT,
  customer_name TEXT,
  total_price NUMERIC(12,2) DEFAULT 0,
  subtotal_price NUMERIC(12,2) DEFAULT 0,
  total_discounts NUMERIC(12,2) DEFAULT 0,
  total_tax NUMERIC(12,2) DEFAULT 0,
  currency TEXT,
  financial_status TEXT,
  fulfillment_status TEXT,
  discount_codes JSONB,
  line_items JSONB,
  shopify_created_at TIMESTAMPTZ,
  shopify_updated_at TIMESTAMPTZ,
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(connection_id, shopify_id)
);

CREATE INDEX IF NOT EXISTS shopify_orders_connection_idx ON public.shopify_orders(connection_id);
CREATE INDEX IF NOT EXISTS shopify_orders_created_idx ON public.shopify_orders(shopify_created_at DESC);
CREATE INDEX IF NOT EXISTS shopify_orders_email_idx ON public.shopify_orders(customer_email);
CREATE INDEX IF NOT EXISTS shopify_orders_codes_idx ON public.shopify_orders USING GIN(discount_codes);

-- Sync history / audit trail
CREATE TABLE IF NOT EXISTS public.shopify_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.shopify_connections(id) ON DELETE CASCADE,
  trigger TEXT NOT NULL CHECK (trigger IN ('install', 'manual', 'cron', 'webhook')),
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'error')),
  orders_synced INTEGER DEFAULT 0,
  error TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS shopify_sync_runs_connection_idx ON public.shopify_sync_runs(connection_id);

-- RLS: only service role / superadmins should touch these. Authenticated admins read connection
-- status; the access_token column should NEVER round-trip to the browser.
ALTER TABLE public.shopify_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_sync_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shopify_connections_select ON public.shopify_connections;
CREATE POLICY shopify_connections_select ON public.shopify_connections
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS shopify_orders_select ON public.shopify_orders;
CREATE POLICY shopify_orders_select ON public.shopify_orders
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS shopify_sync_runs_select ON public.shopify_sync_runs;
CREATE POLICY shopify_sync_runs_select ON public.shopify_sync_runs
  FOR SELECT USING (auth.role() = 'authenticated');
