-- 004: Add 'stuck' task status, proforma invoice type, multi-country fiscal field on clients
-- Run after 001_create_schema.sql

-- 1. Allow 'stuck' as a task status
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('pending', 'in_progress', 'stuck', 'completed'));

-- 2. Allow 'proforma' as an invoice type (kept alongside cotizacion + factura)
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_type_check;
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_type_check
  CHECK (type IN ('cotizacion', 'proforma', 'factura'));

-- Track when a proforma is converted into a definitive factura
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS converted_from UUID REFERENCES public.invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS invoices_converted_from_idx ON public.invoices(converted_from);

-- 3. Multi-country fiscal field on clients
-- Existing column `rut` stays for backwards compatibility (used by demo + legacy rows).
-- Add `tax_id_type` (NIF / VAT / EIN / RUT / etc.) and a generic `tax_id` value.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS tax_id_type TEXT,
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS country_code TEXT;

-- Backfill: copy existing RUT into the new generic field as RUT-typed.
UPDATE public.clients
   SET tax_id = rut,
       tax_id_type = 'RUT',
       country_code = COALESCE(country_code, 'CL')
 WHERE rut IS NOT NULL
   AND (tax_id IS NULL OR tax_id = '');
