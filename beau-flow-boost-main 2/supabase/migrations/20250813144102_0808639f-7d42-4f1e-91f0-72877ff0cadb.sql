-- Create SMS/Email sending integration tables and enhance cadence system

-- Add SMS/Email provider configurations
CREATE TABLE IF NOT EXISTS public.communication_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider_type TEXT NOT NULL, -- 'twilio', 'resend', 'sendgrid'
  is_active BOOLEAN NOT NULL DEFAULT true,
  configuration JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.communication_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their communication settings"
ON public.communication_settings
FOR ALL
USING (auth.uid() = user_id);

-- Update lead_status to include more detailed cadence tracking
ALTER TABLE public.lead_status 
ADD COLUMN IF NOT EXISTS cadence_step INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cadence_paused BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS total_attempts INTEGER DEFAULT 0;

-- Create cadence progression rules table
CREATE TABLE IF NOT EXISTS public.cadence_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bucket INTEGER NOT NULL,
  tag TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  channel TEXT NOT NULL, -- 'sms', 'email', 'both'
  delay_hours INTEGER NOT NULL,
  template_content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, bucket, tag, step_number)
);

-- Enable RLS  
ALTER TABLE public.cadence_rules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their cadence rules"
ON public.cadence_rules  
FOR ALL
USING (auth.uid() = user_id);

-- Insert default cadence rules for Never Answered sequence
INSERT INTO public.cadence_rules (user_id, bucket, tag, step_number, channel, delay_hours, template_content) VALUES
-- Using a sample user ID - this will be replaced by actual user setup
('00000000-0000-0000-0000-000000000000', 2, 'never_answered', 1, 'email', 24, 'Hi {first_name}, I wanted to follow up on your interest in our beauty services. We have some amazing treatments that could be perfect for you!'),
('00000000-0000-0000-0000-000000000000', 2, 'never_answered', 2, 'sms', 48, 'Hey {first_name}! Just a quick follow-up - would love to help you achieve your beauty goals. Free consultation available!'),
('00000000-0000-0000-0000-000000000000', 2, 'never_answered', 3, 'email', 168, 'Hi {first_name}, I know life gets busy! Our beauty services are designed to save you time while making you look amazing. Still interested?'),
('00000000-0000-0000-0000-000000000000', 2, 'never_answered', 4, 'sms', 336, 'Last chance {first_name}! Our special offer expires soon. Book your consultation now!');

-- Create function to automatically progress cadence steps
CREATE OR REPLACE FUNCTION public.progress_cadence_step()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the cadence step and schedule next action
  UPDATE public.lead_status 
  SET 
    cadence_step = cadence_step + 1,
    next_action_at = now() + INTERVAL '1 hour' * (
      SELECT delay_hours 
      FROM public.cadence_rules 
      WHERE user_id = (SELECT user_id FROM contacts WHERE id = NEW.contact_id)
        AND bucket = NEW.bucket 
        AND tag = NEW.tag 
        AND step_number = NEW.cadence_step + 1
    ),
    last_contact_at = now(),
    total_attempts = total_attempts + 1,
    updated_at = now()
  WHERE contact_id = NEW.contact_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic cadence progression
CREATE OR REPLACE TRIGGER trigger_progress_cadence
  AFTER INSERT ON public.messages
  FOR EACH ROW
  WHEN (NEW.direction = 'outbound' AND NEW.status = 'sent')
  EXECUTE FUNCTION public.progress_cadence_step();

-- Update timestamps trigger for all new tables
CREATE TRIGGER update_communication_settings_updated_at
  BEFORE UPDATE ON public.communication_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cadence_rules_updated_at
  BEFORE UPDATE ON public.cadence_rules  
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();