-- Create profiles table for beauty business requirements
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  business_name TEXT,
  business_type TEXT,
  monthly_revenue INTEGER,
  admin_hours_per_week INTEGER,
  biggest_time_waster TEXT[],
  primary_goal TEXT,
  trial_ends_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days',
  setup_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Create connected_accounts table
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

-- Enable RLS on connected_accounts
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

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();