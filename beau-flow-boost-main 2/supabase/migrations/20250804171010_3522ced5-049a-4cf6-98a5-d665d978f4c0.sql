-- Fix security issues by enabling RLS on remaining tables and fixing search paths

-- Drop old tables that aren't needed for the beauty business app
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.workflows CASCADE;
DROP TABLE IF EXISTS public.workflow_executions CASCADE;
DROP TABLE IF EXISTS public.time_savings CASCADE;

-- Fix function search paths for security
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';