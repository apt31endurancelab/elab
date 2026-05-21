-- 006: Newsletter subscribers + FAQ knowledge base
-- Run after 001_create_schema.sql.

-- Newsletter subscribers (also feed the future bot's user list)
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  source TEXT,                      -- e.g. "shopify", "manual", "qr_pack", "import"
  segments TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced')),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS newsletter_subscribers_status_idx ON public.newsletter_subscribers(status);
CREATE INDEX IF NOT EXISTS newsletter_subscribers_segments_idx ON public.newsletter_subscribers USING GIN(segments);

-- Newsletter campaigns (for audit + analytics)
CREATE TABLE IF NOT EXISTS public.newsletter_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  segments TEXT[] DEFAULT ARRAY[]::TEXT[],
  recipient_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS newsletter_campaigns_status_idx ON public.newsletter_campaigns(status);

-- FAQ knowledge base — questions + answers, eventually consumed by the support bot
CREATE TABLE IF NOT EXISTS public.faq_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,                    -- e.g. "ventas", "postventa", "técnico", "calibración"
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  source TEXT,                      -- e.g. "Jorge", "paper:VO2max-2024.pdf"
  asked_count INTEGER DEFAULT 1,    -- bumped each time someone asks the same thing
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS faq_entries_category_idx ON public.faq_entries(category);
CREATE INDEX IF NOT EXISTS faq_entries_tags_idx ON public.faq_entries USING GIN(tags);
-- Full-text search index on question+answer for the future bot retrieval step
CREATE INDEX IF NOT EXISTS faq_entries_search_idx ON public.faq_entries
  USING GIN(to_tsvector('spanish', coalesce(question, '') || ' ' || coalesce(answer, '')));

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS newsletter_subscribers_authed ON public.newsletter_subscribers;
CREATE POLICY newsletter_subscribers_authed ON public.newsletter_subscribers
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS newsletter_campaigns_authed ON public.newsletter_campaigns;
CREATE POLICY newsletter_campaigns_authed ON public.newsletter_campaigns
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS faq_entries_authed ON public.faq_entries;
CREATE POLICY faq_entries_authed ON public.faq_entries
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
