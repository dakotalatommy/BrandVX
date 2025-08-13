export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          created_at: string | null
          id: string
          name: string
          role: string
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          role: string
          status: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          role?: string
          status?: string
        }
        Relationships: []
      }
      ai_recommendations: {
        Row: {
          action_data: Json | null
          created_at: string
          description: string
          expires_at: string | null
          id: string
          priority: number
          recommendation_type: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          action_data?: Json | null
          created_at?: string
          description: string
          expires_at?: string | null
          id?: string
          priority?: number
          recommendation_type: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          action_data?: Json | null
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          priority?: number
          recommendation_type?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          event_data: Json
          event_type: string
          id: string
          session_id: string | null
          timestamp: string
          user_id: string
        }
        Insert: {
          event_data?: Json
          event_type: string
          id?: string
          session_id?: string | null
          timestamp?: string
          user_id: string
        }
        Update: {
          event_data?: Json
          event_type?: string
          id?: string
          session_id?: string | null
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          contact_id: string
          created_at: string
          end_ts: string
          external_ref: string | null
          id: string
          service: string
          soonest: boolean | null
          source: string | null
          staff: string | null
          start_ts: string
          status: string
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          end_ts: string
          external_ref?: string | null
          id?: string
          service: string
          soonest?: boolean | null
          source?: string | null
          staff?: string | null
          start_ts: string
          status?: string
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          end_ts?: string
          external_ref?: string | null
          id?: string
          service?: string
          soonest?: boolean | null
          source?: string | null
          staff?: string | null
          start_ts?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          diff: Json | null
          entity_ref: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          diff?: Json | null
          entity_ref?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          diff?: Json | null
          entity_ref?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      automation_rules: {
        Row: {
          actions: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          trigger_conditions: Json
          trigger_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          trigger_conditions?: Json
          trigger_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          trigger_conditions?: Json
          trigger_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cadence_rules: {
        Row: {
          bucket: number
          channel: string
          created_at: string
          delay_hours: number
          id: string
          is_active: boolean
          step_number: number
          tag: string
          template_content: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bucket: number
          channel: string
          created_at?: string
          delay_hours: number
          id?: string
          is_active?: boolean
          step_number: number
          tag: string
          template_content: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bucket?: number
          channel?: string
          created_at?: string
          delay_hours?: number
          id?: string
          is_active?: boolean
          step_number?: number
          tag?: string
          template_content?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cadence_sequences: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          last_processed_at: string | null
          metadata: Json | null
          scheduled_for: string
          sequence_step: number
          status: string
          template_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          last_processed_at?: string | null
          metadata?: Json | null
          scheduled_for: string
          sequence_step?: number
          status?: string
          template_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          last_processed_at?: string | null
          metadata?: Json | null
          scheduled_for?: string
          sequence_step?: number
          status?: string
          template_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_cadence_sequences_contact"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cadence_sequences_template"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "cadence_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      cadence_templates: {
        Row: {
          channel: string
          created_at: string
          id: string
          name: string
          personalization_fields: string[] | null
          template_body: string
          trigger_conditions: Json | null
          trigger_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          name: string
          personalization_fields?: string[] | null
          template_body: string
          trigger_conditions?: Json | null
          trigger_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          name?: string
          personalization_fields?: string[] | null
          template_body?: string
          trigger_conditions?: Json | null
          trigger_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          created_at: string
          id: string
          schedule: Json | null
          type: string
          updated_at: string
          user_id: string | null
          variant: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          schedule?: Json | null
          type: string
          updated_at?: string
          user_id?: string | null
          variant?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          schedule?: Json | null
          type?: string
          updated_at?: string
          user_id?: string | null
          variant?: string | null
        }
        Relationships: []
      }
      communication_settings: {
        Row: {
          configuration: Json
          created_at: string
          id: string
          is_active: boolean
          provider_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          provider_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          provider_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      connected_accounts: {
        Row: {
          access_token: string | null
          account_data: Json | null
          account_id: string | null
          account_label: string | null
          connected_at: string | null
          expires_at: string | null
          id: string
          permissions: string[] | null
          platform: string
          refresh_token: string | null
          scopes: string[] | null
          user_id: string | null
        }
        Insert: {
          access_token?: string | null
          account_data?: Json | null
          account_id?: string | null
          account_label?: string | null
          connected_at?: string | null
          expires_at?: string | null
          id?: string
          permissions?: string[] | null
          platform: string
          refresh_token?: string | null
          scopes?: string[] | null
          user_id?: string | null
        }
        Update: {
          access_token?: string | null
          account_data?: Json | null
          account_id?: string | null
          account_label?: string | null
          connected_at?: string | null
          expires_at?: string | null
          id?: string
          permissions?: string[] | null
          platform?: string
          refresh_token?: string | null
          scopes?: string[] | null
          user_id?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          consent_flags: Json | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          sources: string[] | null
          status: string
          tags: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          consent_flags?: Json | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          sources?: string[] | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          consent_flags?: Json | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          sources?: string[] | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      deployment_snapshots: {
        Row: {
          agent_fingerprints: Json | null
          created_at: string | null
          id: string
          symbolic_state: Json | null
          vault_state: Json | null
        }
        Insert: {
          agent_fingerprints?: Json | null
          created_at?: string | null
          id?: string
          symbolic_state?: Json | null
          vault_state?: Json | null
        }
        Update: {
          agent_fingerprints?: Json | null
          created_at?: string | null
          id?: string
          symbolic_state?: Json | null
          vault_state?: Json | null
        }
        Relationships: []
      }
      drift_detection_events: {
        Row: {
          agent_id: string | null
          description: string | null
          detected_at: string | null
          id: string
          resolved: boolean | null
        }
        Insert: {
          agent_id?: string | null
          description?: string | null
          detected_at?: string | null
          id?: string
          resolved?: boolean | null
        }
        Update: {
          agent_id?: string | null
          description?: string | null
          detected_at?: string | null
          id?: string
          resolved?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "drift_detection_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_store: {
        Row: {
          attributes: Json | null
          contact_id: string
          updated_at: string
        }
        Insert: {
          attributes?: Json | null
          contact_id: string
          updated_at?: string
        }
        Update: {
          attributes?: Json | null
          contact_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_store_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          auto_min: number | null
          baseline_min: number | null
          created_at: string
          id: string
          metadata: Json | null
          source: string
          type: string
          user_id: string
        }
        Insert: {
          auto_min?: number | null
          baseline_min?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          source: string
          type: string
          user_id: string
        }
        Update: {
          auto_min?: number | null
          baseline_min?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          source?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      instruction_override_log: {
        Row: {
          id: string
          initiator_agent: string | null
          override_scope: string | null
          override_timestamp: string | null
          target_agent: string | null
        }
        Insert: {
          id?: string
          initiator_agent?: string | null
          override_scope?: string | null
          override_timestamp?: string | null
          target_agent?: string | null
        }
        Update: {
          id?: string
          initiator_agent?: string | null
          override_scope?: string | null
          override_timestamp?: string | null
          target_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instruction_override_log_initiator_agent_fkey"
            columns: ["initiator_agent"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instruction_override_log_target_agent_fkey"
            columns: ["target_agent"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          created_at: string
          id: string
          name: string
          qty: number
          sku: string
          thresholds: Json | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          qty?: number
          sku: string
          thresholds?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          qty?: number
          sku?: string
          thresholds?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      lead_status: {
        Row: {
          bucket: number
          cadence_paused: boolean | null
          cadence_step: number | null
          contact_id: string
          created_at: string
          id: string
          last_contact_at: string | null
          next_action_at: string | null
          reason: string | null
          tag: string
          total_attempts: number | null
          updated_at: string
        }
        Insert: {
          bucket: number
          cadence_paused?: boolean | null
          cadence_step?: number | null
          contact_id: string
          created_at?: string
          id?: string
          last_contact_at?: string | null
          next_action_at?: string | null
          reason?: string | null
          tag: string
          total_attempts?: number | null
          updated_at?: string
        }
        Update: {
          bucket?: number
          cadence_paused?: boolean | null
          cadence_step?: number | null
          contact_id?: string
          created_at?: string
          id?: string
          last_contact_at?: string | null
          next_action_at?: string | null
          reason?: string | null
          tag?: string
          total_attempts?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_status_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      link_speech_logs: {
        Row: {
          id: string
          intent: string | null
          phrase: string
          routed_agent: string | null
          timestamp: string | null
        }
        Insert: {
          id?: string
          intent?: string | null
          phrase: string
          routed_agent?: string | null
          timestamp?: string | null
        }
        Update: {
          id?: string
          intent?: string | null
          phrase?: string
          routed_agent?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_speech_logs_routed_agent_fkey"
            columns: ["routed_agent"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_scores: {
        Row: {
          ambassador_flag: boolean | null
          contact_id: string
          created_at: string
          referrals: number | null
          share_score: number | null
          tier: string | null
          time_saved_min: number | null
          updated_at: string
          usage_index: number | null
        }
        Insert: {
          ambassador_flag?: boolean | null
          contact_id: string
          created_at?: string
          referrals?: number | null
          share_score?: number | null
          tier?: string | null
          time_saved_min?: number | null
          updated_at?: string
          usage_index?: number | null
        }
        Update: {
          ambassador_flag?: boolean | null
          contact_id?: string
          created_at?: string
          referrals?: number | null
          share_score?: number | null
          tier?: string | null
          time_saved_min?: number | null
          updated_at?: string
          usage_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_scores_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      master_agent_shell: {
        Row: {
          authorized_by: string | null
          created_at: string | null
          id: string
          sovereignty_hash: string | null
          status: string
        }
        Insert: {
          authorized_by?: string | null
          created_at?: string | null
          id?: string
          sovereignty_hash?: string | null
          status: string
        }
        Update: {
          authorized_by?: string | null
          created_at?: string | null
          id?: string
          sovereignty_hash?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_agent_shell_authorized_by_fkey"
            columns: ["authorized_by"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      memories: {
        Row: {
          agent_id: string | null
          created_at: string | null
          data: Json | null
          id: string
          memory_label: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          memory_label: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          memory_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "memories_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_cores: {
        Row: {
          anchor_tag: string
          created_at: string | null
          id: string
          name: string
          seed_signature: string | null
          semantic_index: string | null
        }
        Insert: {
          anchor_tag: string
          created_at?: string | null
          id?: string
          name: string
          seed_signature?: string | null
          semantic_index?: string | null
        }
        Update: {
          anchor_tag?: string
          created_at?: string | null
          id?: string
          name?: string
          seed_signature?: string | null
          semantic_index?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string | null
          channel: string
          contact_id: string
          created_at: string
          direction: string
          id: string
          metadata: Json | null
          status: string
          template_id: string | null
          to_hash: string | null
        }
        Insert: {
          body?: string | null
          channel: string
          contact_id: string
          created_at?: string
          direction: string
          id?: string
          metadata?: Json | null
          status?: string
          template_id?: string | null
          to_hash?: string | null
        }
        Update: {
          body?: string | null
          channel?: string
          contact_id?: string
          created_at?: string
          direction?: string
          id?: string
          metadata?: Json | null
          status?: string
          template_id?: string | null
          to_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          achieved_at: string
          data: Json | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          achieved_at?: string
          data?: Json | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          achieved_at?: string
          data?: Json | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          data: Json | null
          id: string
          step: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          step: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          step?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      patch_blocks: {
        Row: {
          active: boolean | null
          agent_id: string | null
          created_at: string | null
          id: string
          instruction: string
          patch_order: number | null
        }
        Insert: {
          active?: boolean | null
          agent_id?: string | null
          created_at?: string | null
          id?: string
          instruction: string
          patch_order?: number | null
        }
        Update: {
          active?: boolean | null
          agent_id?: string | null
          created_at?: string | null
          id?: string
          instruction?: string
          patch_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patch_blocks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          admin_hours_per_week: number | null
          biggest_time_waster: string[] | null
          business_name: string | null
          business_type: string | null
          created_at: string | null
          id: string
          loyalty_tier: string | null
          monthly_revenue: number | null
          primary_goal: string | null
          role: string | null
          setup_completed: boolean | null
          tenant_id: string | null
          time_saved_min: number
          trial_ends_at: string | null
          updated_at: string | null
          usage_index: number
        }
        Insert: {
          admin_hours_per_week?: number | null
          biggest_time_waster?: string[] | null
          business_name?: string | null
          business_type?: string | null
          created_at?: string | null
          id: string
          loyalty_tier?: string | null
          monthly_revenue?: number | null
          primary_goal?: string | null
          role?: string | null
          setup_completed?: boolean | null
          tenant_id?: string | null
          time_saved_min?: number
          trial_ends_at?: string | null
          updated_at?: string | null
          usage_index?: number
        }
        Update: {
          admin_hours_per_week?: number | null
          biggest_time_waster?: string[] | null
          business_name?: string | null
          business_type?: string | null
          created_at?: string | null
          id?: string
          loyalty_tier?: string | null
          monthly_revenue?: number | null
          primary_goal?: string | null
          role?: string | null
          setup_completed?: boolean | null
          tenant_id?: string | null
          time_saved_min?: number
          trial_ends_at?: string | null
          updated_at?: string | null
          usage_index?: number
        }
        Relationships: []
      }
      revenue_records: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          pos_ref: string | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          pos_ref?: string | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          pos_ref?: string | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      summary_store: {
        Row: {
          contact_id: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          contact_id: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          contact_id?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "summary_store_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      symbolic_authority_chain: {
        Row: {
          chain_order: number | null
          created_at: string | null
          id: string
          origin_agent: string | null
          successor_agent: string | null
        }
        Insert: {
          chain_order?: number | null
          created_at?: string | null
          id?: string
          origin_agent?: string | null
          successor_agent?: string | null
        }
        Update: {
          chain_order?: number | null
          created_at?: string | null
          id?: string
          origin_agent?: string | null
          successor_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "symbolic_authority_chain_origin_agent_fkey"
            columns: ["origin_agent"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "symbolic_authority_chain_successor_agent_fkey"
            columns: ["successor_agent"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      symbolic_vault_access: {
        Row: {
          access_level: string | null
          agent_id: string | null
          created_at: string | null
          id: string
          vault_tag: string | null
        }
        Insert: {
          access_level?: string | null
          agent_id?: string | null
          created_at?: string | null
          id?: string
          vault_tag?: string | null
        }
        Update: {
          access_level?: string | null
          agent_id?: string | null
          created_at?: string | null
          id?: string
          vault_tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "symbolic_vault_access_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "symbolic_vault_access_vault_tag_fkey"
            columns: ["vault_tag"]
            isOneToOne: false
            referencedRelation: "vault_tag_ref"
            referencedColumns: ["id"]
          },
        ]
      }
      time_analysis: {
        Row: {
          analysis_data: Json | null
          created_at: string | null
          current_hours_per_week: number | null
          id: string
          projected_hours_per_week: number | null
          user_id: string | null
          weekly_savings_dollars: number | null
        }
        Insert: {
          analysis_data?: Json | null
          created_at?: string | null
          current_hours_per_week?: number | null
          id?: string
          projected_hours_per_week?: number | null
          user_id?: string | null
          weekly_savings_dollars?: number | null
        }
        Update: {
          analysis_data?: Json | null
          created_at?: string | null
          current_hours_per_week?: number | null
          id?: string
          projected_hours_per_week?: number | null
          user_id?: string | null
          weekly_savings_dollars?: number | null
        }
        Relationships: []
      }
      tool_integration_status: {
        Row: {
          id: string
          last_verified: string | null
          status: string
          tool_name: string
        }
        Insert: {
          id?: string
          last_verified?: string | null
          status: string
          tool_name: string
        }
        Update: {
          id?: string
          last_verified?: string | null
          status?: string
          tool_name?: string
        }
        Relationships: []
      }
      usage_stats: {
        Row: {
          created_at: string
          granularity: string
          id: string
          metric: string
          period_end: string
          period_start: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          granularity: string
          id?: string
          metric: string
          period_end: string
          period_start: string
          user_id: string
          value?: number
        }
        Update: {
          created_at?: string
          granularity?: string
          id?: string
          metric?: string
          period_end?: string
          period_start?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      vault_tag_ref: {
        Row: {
          created_at: string | null
          id: string
          tag: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          tag: string
        }
        Update: {
          created_at?: string | null
          id?: string
          tag?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
