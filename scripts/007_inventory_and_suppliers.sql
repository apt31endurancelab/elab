-- 007: Inventory + suppliers + stock movements
-- Run after 001_create_schema.sql.
--
-- Mental model:
--   products            = catálogo maestro (source of truth para Shopify push)
--   suppliers           = CRM de proveedores (a quiénes les compramos)
--   product_suppliers   = M2M con coste por proveedor (margen = price - is_primary cost)
--   stock_movements     = audit trail de cambios de stock (compras, ventas, ajustes, sync)

-- 1. Extender products con campos comerciales y de sync
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'CLP',
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS barcode TEXT,
  ADD COLUMN IF NOT EXISTS weight NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS weight_unit TEXT DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS shopify_product_id TEXT,
  ADD COLUMN IF NOT EXISTS shopify_variant_id TEXT,
  ADD COLUMN IF NOT EXISTS shopify_inventory_item_id TEXT,
  ADD COLUMN IF NOT EXISTS last_shopify_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shopify_sync_error TEXT;

CREATE INDEX IF NOT EXISTS products_active_idx ON public.products(is_active);
CREATE INDEX IF NOT EXISTS products_shopify_product_idx ON public.products(shopify_product_id);
CREATE INDEX IF NOT EXISTS products_category_idx ON public.products(category);
CREATE INDEX IF NOT EXISTS products_low_stock_idx ON public.products(stock) WHERE is_active = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique_idx ON public.products(user_id, sku) WHERE sku IS NOT NULL;

-- 2. Suppliers (CRM proveedores)
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  address TEXT,
  country_code TEXT,
  tax_id TEXT,
  tax_id_type TEXT,
  payment_terms TEXT,
  default_currency TEXT DEFAULT 'CLP',
  default_lead_time_days INTEGER,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS suppliers_user_idx ON public.suppliers(user_id);
CREATE INDEX IF NOT EXISTS suppliers_active_idx ON public.suppliers(is_active);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS suppliers_select_own ON public.suppliers;
CREATE POLICY suppliers_select_own ON public.suppliers FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS suppliers_insert_own ON public.suppliers;
CREATE POLICY suppliers_insert_own ON public.suppliers FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS suppliers_update_own ON public.suppliers;
CREATE POLICY suppliers_update_own ON public.suppliers FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS suppliers_delete_own ON public.suppliers;
CREATE POLICY suppliers_delete_own ON public.suppliers FOR DELETE USING (auth.uid() = user_id);

-- 3. product_suppliers (M2M): un producto puede venir de múltiples proveedores con costes distintos.
-- Solo uno marcado is_primary alimenta products.cost_price (lo sincronizamos por trigger más abajo).
CREATE TABLE IF NOT EXISTS public.product_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  supplier_sku TEXT,
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'CLP',
  lead_time_days INTEGER,
  min_order_qty INTEGER DEFAULT 1,
  is_primary BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS product_suppliers_product_idx ON public.product_suppliers(product_id);
CREATE INDEX IF NOT EXISTS product_suppliers_supplier_idx ON public.product_suppliers(supplier_id);
CREATE INDEX IF NOT EXISTS product_suppliers_primary_idx ON public.product_suppliers(product_id) WHERE is_primary = TRUE;

ALTER TABLE public.product_suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_suppliers_select_own ON public.product_suppliers;
CREATE POLICY product_suppliers_select_own ON public.product_suppliers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_suppliers.product_id AND p.user_id = auth.uid())
);
DROP POLICY IF EXISTS product_suppliers_modify_own ON public.product_suppliers;
CREATE POLICY product_suppliers_modify_own ON public.product_suppliers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_suppliers.product_id AND p.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_suppliers.product_id AND p.user_id = auth.uid())
);

-- Trigger: cuando se marca/desmarca is_primary o se crea/edita el primary, propagar el cost_price
-- al producto maestro y desmarcar otros primaries del mismo producto.
CREATE OR REPLACE FUNCTION public.sync_primary_supplier_cost()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary THEN
    -- Quitar primary a los demás del mismo producto
    UPDATE public.product_suppliers
       SET is_primary = FALSE, updated_at = NOW()
     WHERE product_id = NEW.product_id AND id <> NEW.id AND is_primary = TRUE;
    -- Propagar coste al maestro
    UPDATE public.products
       SET cost_price = NEW.cost_price, updated_at = NOW()
     WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_primary_supplier_cost_trg ON public.product_suppliers;
CREATE TRIGGER sync_primary_supplier_cost_trg
  AFTER INSERT OR UPDATE ON public.product_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.sync_primary_supplier_cost();

-- 4. Stock movements (audit log)
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  change INTEGER NOT NULL,
  resulting_stock INTEGER,
  reason TEXT NOT NULL CHECK (reason IN (
    'purchase', 'sale', 'return', 'adjustment', 'shopify_sync', 'shopify_order', 'invoice', 'manual'
  )),
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  unit_cost NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stock_movements_product_idx ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS stock_movements_created_idx ON public.stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS stock_movements_reason_idx ON public.stock_movements(reason);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS stock_movements_select_own ON public.stock_movements;
CREATE POLICY stock_movements_select_own ON public.stock_movements FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = stock_movements.product_id AND p.user_id = auth.uid())
);
DROP POLICY IF EXISTS stock_movements_insert_own ON public.stock_movements;
CREATE POLICY stock_movements_insert_own ON public.stock_movements FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = stock_movements.product_id AND p.user_id = auth.uid())
);

-- Trigger opcional: al insertar un movement, ajustar products.stock atómicamente.
-- Nos saltamos el ajuste si el caller ya actualiza products.stock por su cuenta (e.g. invoice flow).
-- Para evitar doble cuenta, esto se activa solo si el movement viene marcado con
-- reason = 'adjustment' o 'manual' o 'purchase' o 'return' o 'shopify_sync'.
CREATE OR REPLACE FUNCTION public.apply_stock_movement()
RETURNS TRIGGER AS $$
DECLARE
  new_stock INTEGER;
BEGIN
  IF NEW.reason IN ('adjustment', 'manual', 'purchase', 'return', 'shopify_sync') THEN
    UPDATE public.products
       SET stock = GREATEST(0, COALESCE(stock, 0) + NEW.change),
           updated_at = NOW()
     WHERE id = NEW.product_id
     RETURNING stock INTO new_stock;
    NEW.resulting_stock := new_stock;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS apply_stock_movement_trg ON public.stock_movements;
CREATE TRIGGER apply_stock_movement_trg
  BEFORE INSERT ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.apply_stock_movement();
