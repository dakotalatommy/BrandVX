-- Update profiles table to match beauty business requirements
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS business_type TEXT,
ADD COLUMN IF NOT EXISTS monthly_revenue INTEGER,
ADD COLUMN IF NOT EXISTS admin_hours_per_week INTEGER,
ADD COLUMN IF NOT EXISTS biggest_time_waster TEXT[],
ADD COLUMN IF NOT EXISTS primary_goal TEXT,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days',
ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT FALSE;

-- Drop existing connected_accounts table if it exists and recreate with proper structure
DROP TABLE IF EXISTS public.connected_accounts CASCADE;
CREATE TABLE public.connected_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'instagram', 'facebook', 'acuity', 'square'
  account_id TEXT,
  access_token TEXT, -- will be encrypted
  refresh_token TEXT, -- will be encrypted  
  account_data JSONB, -- follower count, page info, etc
  connected_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Enable RLS
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for connected_accounts
CREATE POLICY "Users can view their own connected accounts" 
ON public.connected_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connected accounts" 
ON public.connected_accounts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connected accounts" 
ON public.connected_accounts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connected accounts" 
ON public.connected_accounts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create time analysis table
CREATE TABLE public.time_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  current_hours_per_week INTEGER,
  projected_hours_per_week INTEGER,
  weekly_savings_dollars INTEGER,
  analysis_data JSONB, -- breakdown by category
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on time_analysis
ALTER TABLE public.time_analysis ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for time_analysis
CREATE POLICY "Users can view their own time analysis" 
ON public.time_analysis 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own time analysis" 
ON public.time_analysis 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time analysis" 
ON public.time_analysis 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Update trigger for connected_accounts
CREATE TRIGGER update_connected_accounts_updated_at
BEFORE UPDATE ON public.connected_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update trigger for time_analysis
CREATE TRIGGER update_time_analysis_updated_at
BEFORE UPDATE ON public.time_analysis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();