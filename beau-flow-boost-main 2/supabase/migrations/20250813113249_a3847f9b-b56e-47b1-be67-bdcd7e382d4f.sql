-- BrandVX Core Schema (compatible with existing structure)
-- Update profiles table for BrandVX tenant structure
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'operator';

-- Contacts management
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'lead',
  consent_flags JSONB DEFAULT '{}',
  tags TEXT[],
  sources TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Lead status tracking (7-bucket system)
CREATE TABLE IF NOT EXISTS public.lead_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  bucket INTEGER NOT NULL CHECK (bucket >= 1 AND bucket <= 7),
  tag TEXT NOT NULL,
  next_action_at TIMESTAMP WITH TIME ZONE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contact_id)
);

-- Appointments
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  staff TEXT,
  start_ts TIMESTAMP WITH TIME ZONE NOT NULL,
  end_ts TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'booked',
  source TEXT DEFAULT 'external',
  external_ref TEXT,
  soonest BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  template_id TEXT,
  to_hash TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Campaigns
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  variant TEXT,
  schedule JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inventory
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 0,
  thresholds JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Revenue tracking
CREATE TABLE IF NOT EXISTS public.revenue_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  source TEXT,
  pos_ref TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Loyalty and ambassador tracking
CREATE TABLE IF NOT EXISTS public.loyalty_scores (
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE PRIMARY KEY,
  referrals INTEGER DEFAULT 0,
  usage_index DECIMAL(5,2) DEFAULT 0.0,
  share_score INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'basic',
  ambassador_flag BOOLEAN DEFAULT false,
  time_saved_min INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Memory system
CREATE TABLE IF NOT EXISTS public.entity_store (
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE PRIMARY KEY,
  attributes JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.summary_store (
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE PRIMARY KEY,
  summary TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID,
  action TEXT NOT NULL,
  entity_ref TEXT,
  diff JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summary_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their contacts" ON public.contacts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage lead status for their contacts" ON public.lead_status
  FOR ALL USING (
    contact_id IN (
      SELECT id FROM public.contacts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage appointments for their contacts" ON public.appointments
  FOR ALL USING (
    contact_id IN (
      SELECT id FROM public.contacts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage messages for their contacts" ON public.messages
  FOR ALL USING (
    contact_id IN (
      SELECT id FROM public.contacts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their campaigns" ON public.campaigns
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their inventory" ON public.inventory_items
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their revenue" ON public.revenue_records
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view loyalty scores for their contacts" ON public.loyalty_scores
  FOR ALL USING (
    contact_id IN (
      SELECT id FROM public.contacts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access entity store for their contacts" ON public.entity_store
  FOR ALL USING (
    contact_id IN (
      SELECT id FROM public.contacts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access summary store for their contacts" ON public.summary_store
  FOR ALL USING (
    contact_id IN (
      SELECT id FROM public.contacts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their audit logs" ON public.audit_logs
  FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON public.contacts(phone);
CREATE INDEX IF NOT EXISTS idx_lead_status_next_action ON public.lead_status(next_action_at) WHERE next_action_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_start_ts ON public.appointments(start_ts);
CREATE INDEX IF NOT EXISTS idx_events_type ON public.events(type);
CREATE INDEX IF NOT EXISTS idx_messages_status ON public.messages(status);