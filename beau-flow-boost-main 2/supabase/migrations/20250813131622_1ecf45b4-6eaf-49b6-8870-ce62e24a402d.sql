-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cadence templates table
CREATE TABLE public.cadence_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  template_body TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  trigger_type TEXT NOT NULL DEFAULT 'time_based',
  trigger_conditions JSONB DEFAULT '{}',
  personalization_fields TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cadence sequences table
CREATE TABLE public.cadence_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  template_id UUID NOT NULL,
  sequence_step INTEGER NOT NULL DEFAULT 1,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  last_processed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI recommendations table
CREATE TABLE public.ai_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recommendation_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_data JSONB DEFAULT '{}',
  priority INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.cadence_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadence_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS policies for cadence_templates
CREATE POLICY "Users can manage their cadence templates"
ON public.cadence_templates
FOR ALL
USING (auth.uid() = user_id);

-- RLS policies for cadence_sequences
CREATE POLICY "Users can manage their cadence sequences"
ON public.cadence_sequences
FOR ALL
USING (auth.uid() = user_id);

-- RLS policies for ai_recommendations
CREATE POLICY "Users can manage their AI recommendations"
ON public.ai_recommendations
FOR ALL
USING (auth.uid() = user_id);

-- Add update triggers
CREATE TRIGGER update_cadence_templates_updated_at
  BEFORE UPDATE ON public.cadence_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cadence_sequences_updated_at
  BEFORE UPDATE ON public.cadence_sequences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key constraints
ALTER TABLE public.cadence_sequences
ADD CONSTRAINT fk_cadence_sequences_contact
FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;

ALTER TABLE public.cadence_sequences
ADD CONSTRAINT fk_cadence_sequences_template
FOREIGN KEY (template_id) REFERENCES public.cadence_templates(id) ON DELETE CASCADE;

-- Insert default cadence templates
INSERT INTO public.cadence_templates (user_id, name, template_body, channel, trigger_type, trigger_conditions, personalization_fields) VALUES
-- Default templates that will be copied for each user during onboarding
('00000000-0000-0000-0000-000000000000', 'Welcome Email', 'Hi {{name}}, welcome to {{business_name}}! We''re excited to help you achieve your beauty goals.', 'email', 'contact_created', '{"delay_hours": 0}', ARRAY['name', 'business_name']),
('00000000-0000-0000-0000-000000000000', 'Follow-up Appointment', 'Hi {{name}}, it''s time to schedule your next appointment with us! Book now to maintain your results.', 'email', 'time_based', '{"delay_days": 30}', ARRAY['name']),
('00000000-0000-0000-0000-000000000000', 'Birthday Special', 'Happy Birthday {{name}}! Enjoy 20% off your next service as our gift to you.', 'email', 'date_based', '{"trigger_field": "birthday"}', ARRAY['name']);

-- Schedule the cadence processor to run every 5 minutes
SELECT cron.schedule(
  'process-cadence-sequences',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://ettophndagyzcusbovsq.supabase.co/functions/v1/cadence-scheduler',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0dG9waG5kYWd5emN1c2JvdnNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU3Nzg4NzYsImV4cCI6MjA2MTM1NDg3Nn0.SEINKsfqENNukEWTzjVgLm_stf07rSUd3Ce2wT2wuXs"}'::jsonb,
        body:=concat('{"scheduled_run": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);