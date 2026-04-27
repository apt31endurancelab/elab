-- ============================================================
-- Migration: Activity Log / Timeline
-- ============================================================

CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON public.activity_log(action);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Users see their own logs
CREATE POLICY "activity_log_select_own" ON public.activity_log
  FOR SELECT USING (auth.uid() = user_id);

-- Superadmins see all logs
CREATE POLICY "activity_log_select_superadmin" ON public.activity_log
  FOR SELECT USING (public.is_superadmin());

-- Users can insert their own logs
CREATE POLICY "activity_log_insert_own" ON public.activity_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Superadmins can insert for any user
CREATE POLICY "activity_log_insert_superadmin" ON public.activity_log
  FOR INSERT WITH CHECK (public.is_superadmin());
