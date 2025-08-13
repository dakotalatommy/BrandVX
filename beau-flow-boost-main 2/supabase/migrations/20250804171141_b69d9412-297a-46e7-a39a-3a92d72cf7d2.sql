-- Final security fix: Enable RLS on all remaining tables without it
-- These appear to be system/debug tables not needed for the beauty business app

-- Enable RLS on all remaining tables to fix security warnings
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drift_detection_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instruction_override_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_speech_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_agent_shell ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_cores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patch_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symbolic_authority_chain ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symbolic_vault_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_integration_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_tag_ref ENABLE ROW LEVEL SECURITY;