CREATE TABLE public.market_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source text NOT NULL,
  external_id text NOT NULL,
  country text NOT NULL,
  region text NOT NULL,
  event_name text NOT NULL,
  category text NOT NULL,
  event_time timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  previous text,
  forecast text,
  actual text,
  unit text,
  impact text NOT NULL DEFAULT 'Moderate',
  status text NOT NULL DEFAULT 'upcoming',
  description text,
  markets text[] NOT NULL DEFAULT '{}',
  asset_classes text[] NOT NULL DEFAULT '{}',
  source_url text,
  last_updated timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT market_events_source_external_key UNIQUE (source, external_id)
);

CREATE INDEX market_events_event_time_idx ON public.market_events (event_time);
CREATE INDEX market_events_region_idx ON public.market_events (region);

GRANT SELECT ON public.market_events TO authenticated;
GRANT ALL ON public.market_events TO service_role;
ALTER TABLE public.market_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can read market events"
  ON public.market_events FOR SELECT TO authenticated USING (true);

CREATE TRIGGER market_events_touch_updated
  BEFORE UPDATE ON public.market_events
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.user_watchlist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Stocks',
  market text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_watchlist_user_symbol_key UNIQUE (user_id, symbol)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_watchlist TO authenticated;
GRANT ALL ON public.user_watchlist TO service_role;
ALTER TABLE public.user_watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own watchlist"
  ON public.user_watchlist FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER user_watchlist_touch_updated
  BEFORE UPDATE ON public.user_watchlist
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.user_event_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.market_events(id) ON DELETE CASCADE,
  lead_minutes integer NOT NULL DEFAULT 60,
  channels jsonb NOT NULL DEFAULT '{"in_app": true}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_event_alerts_user_event_key UNIQUE (user_id, event_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_event_alerts TO authenticated;
GRANT ALL ON public.user_event_alerts TO service_role;
ALTER TABLE public.user_event_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own event alerts"
  ON public.user_event_alerts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER user_event_alerts_touch_updated
  BEFORE UPDATE ON public.user_event_alerts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.event_notification_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.market_events(id) ON DELETE CASCADE,
  kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_notification_log_unique UNIQUE (user_id, event_id, kind)
);

GRANT SELECT ON public.event_notification_log TO authenticated;
GRANT ALL ON public.event_notification_log TO service_role;
ALTER TABLE public.event_notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own event notification log"
  ON public.event_notification_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);