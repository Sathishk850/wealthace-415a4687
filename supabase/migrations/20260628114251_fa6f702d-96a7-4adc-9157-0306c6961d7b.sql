
-- =========================================================
-- Notifications (in-app center)
-- =========================================================
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  category TEXT NOT NULL DEFAULT 'general', -- reminder, report, system, insight, general
  priority TEXT NOT NULL DEFAULT 'normal',  -- low, normal, high, urgent
  link TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id) WHERE read_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notifications" ON public.notifications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_notifications_touch BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- Notification preferences
-- =========================================================
CREATE TABLE public.notification_preferences (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  channels JSONB NOT NULL DEFAULT '{"in_app": true, "email": true, "push": false, "sms": false, "whatsapp": false}'::jsonb,
  -- per reminder type: { "sip": {"in_app": true, "email": true}, ... }
  per_type JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- per report category
  reports JSONB NOT NULL DEFAULT '{"in_app": true, "email": true}'::jsonb,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  quiet_hours JSONB NOT NULL DEFAULT '{"enabled": false, "start": "22:00", "end": "07:00"}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own prefs" ON public.notification_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_notif_prefs_touch BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- Scheduled reports
-- =========================================================
CREATE TABLE public.scheduled_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  report_keys TEXT[] NOT NULL DEFAULT '{}',
  formats TEXT[] NOT NULL DEFAULT ARRAY['pdf'], -- pdf, excel, csv
  frequency TEXT NOT NULL DEFAULT 'monthly',    -- daily, weekly, monthly, quarterly, yearly, custom
  cron_expr TEXT,                               -- when frequency=custom
  date_range TEXT NOT NULL DEFAULT 'last_period', -- last_period, ytd, mtd, all
  recipients TEXT[] NOT NULL DEFAULT '{}',      -- if empty, send to account email
  cc TEXT[] NOT NULL DEFAULT '{}',
  bcc TEXT[] NOT NULL DEFAULT '{}',
  channels JSONB NOT NULL DEFAULT '{"email": true, "in_app": true}'::jsonb,
  include_ai_insights BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_run_at TIMESTAMPTZ,
  last_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_scheduled_reports_due ON public.scheduled_reports(next_run_at) WHERE active = true;
CREATE INDEX idx_scheduled_reports_user ON public.scheduled_reports(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_reports TO authenticated;
GRANT ALL ON public.scheduled_reports TO service_role;
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own schedules" ON public.scheduled_reports
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_scheduled_reports_touch BEFORE UPDATE ON public.scheduled_reports
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- Delivery log (channel-agnostic)
-- =========================================================
CREATE TABLE public.notification_delivery_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,                  -- in_app, email, push, sms, whatsapp
  template TEXT NOT NULL,                 -- reminder.due, report.scheduled, etc.
  recipient TEXT,                         -- email/phone/null for in_app
  subject TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed, suppressed, retrying
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  related_kind TEXT,                      -- reminder, scheduled_report, manual
  related_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_delivery_log_user_created ON public.notification_delivery_log(user_id, created_at DESC);
CREATE INDEX idx_delivery_log_pending ON public.notification_delivery_log(status, scheduled_for) WHERE status IN ('pending','retrying');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_delivery_log TO authenticated;
GRANT ALL ON public.notification_delivery_log TO service_role;
ALTER TABLE public.notification_delivery_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own delivery log" ON public.notification_delivery_log
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own delivery log" ON public.notification_delivery_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own delivery log" ON public.notification_delivery_log
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER trg_delivery_log_touch BEFORE UPDATE ON public.notification_delivery_log
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
