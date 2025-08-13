-- Core analytics and integrations metadata
-- 1) Extend connected_accounts for OAuth metadata
ALTER TABLE public.connected_accounts
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scopes TEXT[],
  ADD COLUMN IF NOT EXISTS account_label TEXT,
  ADD COLUMN IF NOT EXISTS permissions TEXT[];

-- 2) Events log for automation/time-saver and share prompts
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source TEXT NOT NULL, -- e.g., 'square', 'acuity', 'ig', 'system'
  type TEXT NOT NULL,   -- e.g., 'booking_created', 'reminder_sent', 'share_prompted'
  baseline_min NUMERIC,
  auto_min NUMERIC,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Users can view their own events'
  ) THEN
    CREATE POLICY "Users can view their own events"
    ON public.events
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Users can insert their own events'
  ) THEN
    CREATE POLICY "Users can insert their own events"
    ON public.events
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Users can update their own events'
  ) THEN
    CREATE POLICY "Users can update their own events"
    ON public.events
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Users can delete their own events'
  ) THEN
    CREATE POLICY "Users can delete their own events"
    ON public.events
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_events_user_created_at ON public.events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON public.events (type);

-- 3) Usage rollups table
CREATE TABLE IF NOT EXISTS public.usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  granularity TEXT NOT NULL CHECK (granularity IN ('daily', 'weekly', 'monthly')),
  metric TEXT NOT NULL,  -- e.g., 'time_saved_min', 'bookings_processed'
  value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, granularity, period_start, metric)
);

ALTER TABLE public.usage_stats ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'usage_stats' AND policyname = 'Users can view their own usage_stats'
  ) THEN
    CREATE POLICY "Users can view their own usage_stats"
    ON public.usage_stats
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'usage_stats' AND policyname = 'Users can insert their own usage_stats'
  ) THEN
    CREATE POLICY "Users can insert their own usage_stats"
    ON public.usage_stats
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'usage_stats' AND policyname = 'Users can update their own usage_stats'
  ) THEN
    CREATE POLICY "Users can update their own usage_stats"
    ON public.usage_stats
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_usage_stats_user_period ON public.usage_stats (user_id, period_start);

-- 4) Milestones unlocked
CREATE TABLE IF NOT EXISTS public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,  -- e.g., '10h', '25h', '50h', '100h', 'first_fully_booked_week'
  data JSONB,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'milestones' AND policyname = 'Users can view their own milestones'
  ) THEN
    CREATE POLICY "Users can view their own milestones"
    ON public.milestones
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'milestones' AND policyname = 'Users can insert their own milestones'
  ) THEN
    CREATE POLICY "Users can insert their own milestones"
    ON public.milestones
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'milestones' AND policyname = 'Users can update their own milestones'
  ) THEN
    CREATE POLICY "Users can update their own milestones"
    ON public.milestones
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_milestones_user_achieved_at ON public.milestones (user_id, achieved_at DESC);

-- 5) Profile rollups (non-breaking)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS time_saved_min INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usage_index INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_tier TEXT;
