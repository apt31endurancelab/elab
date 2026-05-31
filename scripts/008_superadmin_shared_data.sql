-- 008: Let superadmins see/manage all business data (single-tenant model).
-- products / suppliers / product_suppliers / stock_movements / clients were
-- "own rows only", so data imported under one superadmin was invisible to others.
-- Run after 007. Uses public.is_superadmin() from 002.

-- Products
DROP POLICY IF EXISTS products_all_superadmin ON public.products;
CREATE POLICY products_all_superadmin ON public.products
  FOR ALL USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

-- Suppliers
DROP POLICY IF EXISTS suppliers_all_superadmin ON public.suppliers;
CREATE POLICY suppliers_all_superadmin ON public.suppliers
  FOR ALL USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

-- Product ↔ supplier links
DROP POLICY IF EXISTS product_suppliers_all_superadmin ON public.product_suppliers;
CREATE POLICY product_suppliers_all_superadmin ON public.product_suppliers
  FOR ALL USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

-- Stock movements
DROP POLICY IF EXISTS stock_movements_all_superadmin ON public.stock_movements;
CREATE POLICY stock_movements_all_superadmin ON public.stock_movements
  FOR ALL USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

-- Clients (invoicing CRM)
DROP POLICY IF EXISTS clients_all_superadmin ON public.clients;
CREATE POLICY clients_all_superadmin ON public.clients
  FOR ALL USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());
