-- Private, short-lived recovery. No prompts or student corrections are stored.
ALTER TABLE public.carijo_generation_runs
 ADD COLUMN IF NOT EXISTS client_request_id uuid,
 ADD COLUMN IF NOT EXISTS recovery_hash text,
 ADD COLUMN IF NOT EXISTS request_digest text,
 ADD COLUMN IF NOT EXISTS result_payload jsonb,
 ADD COLUMN IF NOT EXISTS result_expires_at timestamptz,
 ADD COLUMN IF NOT EXISTS error_message text;
CREATE UNIQUE INDEX IF NOT EXISTS carijo_request_id_unique ON public.carijo_generation_runs(client_request_id) WHERE client_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS carijo_result_expiry ON public.carijo_generation_runs(result_expires_at) WHERE result_payload IS NOT NULL;
ALTER TABLE public.carijo_generation_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.carijo_generation_runs FROM anon, authenticated;
GRANT ALL ON public.carijo_generation_runs TO service_role;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
REVOKE ALL ON SCHEMA cron FROM public, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA cron FROM public, anon, authenticated;
SELECT cron.schedule('carijo-expire-recovery','*/15 * * * *',$$UPDATE public.carijo_generation_runs SET result_payload=NULL WHERE result_payload IS NOT NULL AND result_expires_at <= now()$$);
