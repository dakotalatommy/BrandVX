-- Add RLS policies for all tables with enabled RLS but no policies

-- Profiles table policies
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- Contacts table policies  
CREATE POLICY "Users can view their own contacts" ON public.contacts
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own contacts" ON public.contacts
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts" ON public.contacts
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts" ON public.contacts
FOR DELETE USING (auth.uid() = user_id);

-- Lead status table policies
CREATE POLICY "Users can view their own lead status" ON public.lead_status
FOR SELECT USING (auth.uid() = (SELECT user_id FROM contacts WHERE id = contact_id));

CREATE POLICY "Users can create lead status for their contacts" ON public.lead_status
FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM contacts WHERE id = contact_id));

CREATE POLICY "Users can update lead status for their contacts" ON public.lead_status
FOR UPDATE USING (auth.uid() = (SELECT user_id FROM contacts WHERE id = contact_id));

-- Connected accounts table policies
CREATE POLICY "Users can view their own connected accounts" ON public.connected_accounts
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own connected accounts" ON public.connected_accounts
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connected accounts" ON public.connected_accounts
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connected accounts" ON public.connected_accounts
FOR DELETE USING (auth.uid() = user_id);

-- Events table policies
CREATE POLICY "Users can view their own events" ON public.events
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own events" ON public.events
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Cadence rules table policies
CREATE POLICY "Users can view their own cadence rules" ON public.cadence_rules
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cadence rules" ON public.cadence_rules
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cadence rules" ON public.cadence_rules
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cadence rules" ON public.cadence_rules
FOR DELETE USING (auth.uid() = user_id);

-- Revenue records table policies
CREATE POLICY "Users can view their own revenue records" ON public.revenue_records
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own revenue records" ON public.revenue_records
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Onboarding progress table policies
CREATE POLICY "Users can view their own onboarding progress" ON public.onboarding_progress
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own onboarding progress" ON public.onboarding_progress
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding progress" ON public.onboarding_progress
FOR UPDATE USING (auth.uid() = user_id);

-- Automation rules table policies
CREATE POLICY "Users can view their own automation rules" ON public.automation_rules
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own automation rules" ON public.automation_rules
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own automation rules" ON public.automation_rules
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own automation rules" ON public.automation_rules
FOR DELETE USING (auth.uid() = user_id);

-- Analytics events table policies
CREATE POLICY "Users can view their own analytics events" ON public.analytics_events
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analytics events" ON public.analytics_events
FOR INSERT WITH CHECK (auth.uid() = user_id);