CREATE TABLE public.q_result_alert_log (
 user_id uuid NOT NULL,
 symbol text NOT NULL,
 result_date date NOT NULL,
 slot text NOT NULL CHECK (slot IN ('evening','morning')),
 channel text NOT NULL CHECK (channel IN ('in_app','push')),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id, symbol, result_date, slot, channel)
);
GRANT ALL ON public.q_result_alert_log TO service_role;
ALTER TABLE public.q_result_alert_log ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.q_result_alert_log IS 'Server-only atomic company/date/slot/channel claims for quarterly-result notifications; existing notifications.priority and per_type preferences are reused.';