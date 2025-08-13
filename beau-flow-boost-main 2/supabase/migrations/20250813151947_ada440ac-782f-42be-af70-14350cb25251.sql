-- Create onboarding progress tracking
CREATE TABLE public.onboarding_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  step TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their onboarding progress" 
ON public.onboarding_progress 
FOR ALL 
USING (auth.uid() = user_id);

-- Create automation rules table
CREATE TABLE public.automation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_conditions JSONB NOT NULL DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their automation rules" 
ON public.automation_rules 
FOR ALL 
USING (auth.uid() = user_id);

-- Create analytics events table
CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  session_id TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their analytics events" 
ON public.analytics_events 
FOR ALL 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_onboarding_progress_updated_at
BEFORE UPDATE ON public.onboarding_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automation_rules_updated_at
BEFORE UPDATE ON public.automation_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();