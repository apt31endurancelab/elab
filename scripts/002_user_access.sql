-- ============================================================
-- Migration: User Access Management System
-- ============================================================

-- 1. Expand roles in profiles table
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('superadmin', 'admin', 'viewer', 'affiliate'));

-- 2. Add new columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'invited'));
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id);

-- 3. Helper function to check superadmin (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'superadmin'
  );
$$;

-- 4. Create user_permissions table
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  can_write BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, section_key)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Users can read their own permissions
CREATE POLICY "permissions_select_own" ON public.user_permissions
  FOR SELECT USING (auth.uid() = user_id);

-- Superadmins can do everything with permissions
CREATE POLICY "permissions_all_superadmin" ON public.user_permissions
  FOR ALL USING (public.is_superadmin());

-- 5. Add superadmin policies to profiles (using function to avoid recursion)
CREATE POLICY "profiles_select_superadmin" ON public.profiles
  FOR SELECT USING (public.is_superadmin());

CREATE POLICY "profiles_update_superadmin" ON public.profiles
  FOR UPDATE USING (public.is_superadmin());

CREATE POLICY "profiles_insert_superadmin" ON public.profiles
  FOR INSERT WITH CHECK (public.is_superadmin());

-- 6. Update handle_new_user trigger to support roles from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, status, invited_by)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', NULL),
    COALESCE(new.raw_user_meta_data ->> 'role', 'admin'),
    COALESCE(new.raw_user_meta_data ->> 'status', 'active'),
    (new.raw_user_meta_data ->> 'invited_by')::UUID
  )
  ON CONFLICT (id) DO UPDATE SET
    status = 'active',
    last_sign_in_at = NOW();
  RETURN new;
END;
$$;

-- 7. Function to update last_sign_in_at when user signs in
CREATE OR REPLACE FUNCTION public.handle_user_sign_in()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET last_sign_in_at = NOW(), status = 'active'
  WHERE id = new.id;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_sign_in ON auth.users;

CREATE TRIGGER on_auth_user_sign_in
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_sign_in();
