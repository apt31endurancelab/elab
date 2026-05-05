-- 004: Allow 'stuck' as a fourth task status (between in_progress and completed).
-- Run after 001_create_schema.sql.

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('pending', 'in_progress', 'stuck', 'completed'));
