-- BrandVX Database Schema Implementation
-- Core Identity & Tenant Management
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'trial',
  settings JSONB DEFAULT '{}',
  compliance_flags JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.operators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator',
  permissions JSONB DEFAULT '{}',
  locale TEXT DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, email)
);

-- Contact Management & Lead State
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  email TEXT,
  hs_contact_id TEXT,
  status TEXT NOT NULL DEFAULT 'lead',
  consent_flags JSONB DEFAULT '{}',
  tags TEXT[],
  sources TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lead_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  bucket INTEGER NOT NULL CHECK (bucket >= 1 AND bucket <= 7),
  tag TEXT NOT NULL,
  next_action_at TIMESTAMP WITH TIME ZONE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contact_id)
);

-- Appointment Management
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
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

-- Messaging & Communication
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
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

-- Campaigns & Cadences
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  variant TEXT,
  schedule JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inventory Management
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 0,
  thresholds JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, sku)
);

-- Revenue & Financial Data
CREATE TABLE IF NOT EXISTS public.revenue_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  source TEXT,
  pos_ref TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Loyalty & Usage Tracking
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

CREATE TABLE IF NOT EXISTS public.usage_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Events Ledger (Core Attribution System)
CREATE TABLE IF NOT EXISTS public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  campaign TEXT,
  payload JSONB,
  baseline_min INTEGER,
  auto_min INTEGER,
  dedup_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, dedup_key)
);

-- Memory System
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

-- Audit Trail
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.operators(id),
  action TEXT NOT NULL,
  entity_ref TEXT,
  diff JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summary_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Operators can access their tenant data" ON public.tenants
  FOR ALL USING (
    id IN (
      SELECT tenant_id FROM public.operators 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Operators can manage their profile" ON public.operators
  FOR ALL USING (id = auth.uid());

CREATE POLICY "Tenant-scoped contact access" ON public.contacts
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.operators 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Tenant-scoped lead status access" ON public.lead_status
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.operators 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Tenant-scoped appointment access" ON public.appointments
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.operators 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Tenant-scoped message access" ON public.messages
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.operators 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Tenant-scoped campaign access" ON public.campaigns
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.operators 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Tenant-scoped inventory access" ON public.inventory_items
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.operators 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Tenant-scoped revenue access" ON public.revenue_records
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.operators 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Contact-scoped loyalty access" ON public.loyalty_scores
  FOR ALL USING (
    contact_id IN (
      SELECT c.id FROM public.contacts c
      JOIN public.operators o ON c.tenant_id = o.tenant_id
      WHERE o.id = auth.uid()
    )
  );

CREATE POLICY "Tenant-scoped usage stats access" ON public.usage_stats
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.operators 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Tenant-scoped event access" ON public.events
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.operators 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Contact-scoped entity access" ON public.entity_store
  FOR ALL USING (
    contact_id IN (
      SELECT c.id FROM public.contacts c
      JOIN public.operators o ON c.tenant_id = o.tenant_id
      WHERE o.id = auth.uid()
    )
  );

CREATE POLICY "Contact-scoped summary access" ON public.summary_store
  FOR ALL USING (
    contact_id IN (
      SELECT c.id FROM public.contacts c
      JOIN public.operators o ON c.tenant_id = o.tenant_id
      WHERE o.id = auth.uid()
    )
  );

CREATE POLICY "Tenant-scoped audit access" ON public.audit_logs
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.operators 
      WHERE id = auth.uid()
    )
  );

-- Indexes for Performance
CREATE INDEX idx_contacts_tenant_id ON public.contacts(tenant_id);
CREATE INDEX idx_contacts_email ON public.contacts(email);
CREATE INDEX idx_contacts_phone ON public.contacts(phone);
CREATE INDEX idx_lead_status_next_action ON public.lead_status(next_action_at) WHERE next_action_at IS NOT NULL;
CREATE INDEX idx_appointments_start_ts ON public.appointments(start_ts);
CREATE INDEX idx_events_type_campaign ON public.events(type, campaign);
CREATE INDEX idx_events_created_at ON public.events(created_at);
CREATE INDEX idx_messages_status ON public.messages(status);

-- Timestamp update triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_operators_updated_at
    BEFORE UPDATE ON public.operators
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON public.contacts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_status_updated_at
    BEFORE UPDATE ON public.lead_status
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at
    BEFORE UPDATE ON public.inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loyalty_scores_updated_at
    BEFORE UPDATE ON public.loyalty_scores
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();