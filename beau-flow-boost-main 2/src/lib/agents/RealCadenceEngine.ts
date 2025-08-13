import { supabase } from "@/integrations/supabase/client";
import { BrandVXAgent } from "./BrandVXAgent";

export interface RealCadenceStep {
  id: string;
  bucket: number;
  tag: string;
  step: number;
  delay_hours: number;
  channel: 'sms' | 'email' | 'call';
  template_id: string;
  conditions?: {
    min_engagement_score?: number;
    max_attempts?: number;
    exclude_tags?: string[];
  };
}

export interface RealCadenceTemplate {
  id: string;
  name: string;
  subject?: string;
  body: string;
  variables: string[];
  tone: 'professional' | 'casual' | 'urgent' | 'empathetic';
  industry_specific?: boolean;
}

/**
 * RealCadenceEngine - Orchestrates real automated messaging sequences
 * Uses actual database cadence_rules and real contact data
 */
export class RealCadenceEngine {
  private brandVXAgent: BrandVXAgent;

  constructor() {
    this.brandVXAgent = new BrandVXAgent();
  }

  /**
   * Process scheduled cadence steps using real database data
   */
  async processRealScheduledCadences(): Promise<void> {
    const now = new Date().toISOString();
    
    // Get all contacts with pending actions from real lead_status table
    const { data: pendingContacts, error } = await supabase
      .from('lead_status')
      .select(`
        contact_id,
        bucket,
        tag,
        next_action_at,
        cadence_step,
        total_attempts,
        contacts (
          id,
          user_id,
          name,
          email,
          phone,
          status
        )
      `)
      .lte('next_action_at', now)
      .not('next_action_at', 'is', null);

    if (error) {
      throw error;
    }

    if (!pendingContacts?.length) return;

    // Process each contact with real cadence rules
    for (const contactData of pendingContacts) {
      try {
        await this.executeRealCadenceStep(contactData);
      } catch (error) {
        await this.logRealCadenceError(contactData.contact_id, error);
      }
    }
  }

  private async executeRealCadenceStep(contactData: any): Promise<void> {
    const { contact_id, bucket, tag, contacts: contact } = contactData;

    if (!contact) return;

    // Get next cadence step from database or create default
    const cadenceStep = await this.getRealCadenceStep(bucket, tag, contactData.cadence_step || 0);
    if (!cadenceStep) {
      await this.completeRealCadence(contact_id, 'no_more_steps');
      return;
    }

    // Check step conditions against real data
    if (!this.checkRealStepConditions(cadenceStep, contact, contactData)) {
      await this.skipRealCadenceStep(contact_id, cadenceStep.id, 'conditions_not_met');
      return;
    }

    // Get personalized template with real data
    const template = await this.getRealPersonalizedTemplate(cadenceStep.template_id, contact);
    
    // Execute the cadence step via BrandVX Agent
    const response = await this.brandVXAgent.processIntent({
      type: 'cadence',
      userId: contact.user_id,
      contactId: contact_id,
      payload: {
        step: cadenceStep.step,
        campaign: `${bucket}.${tag}`,
        channel: cadenceStep.channel,
        template,
        contact_data: contact
      }
    });

    // Update real database with next step
    if (response.nextActions?.includes('continue_cadence')) {
      await this.scheduleRealNextStep(contact_id, bucket, tag, cadenceStep.step + 1);
    } else {
      await this.completeRealCadence(contact_id, response.data?.completion_reason || 'sequence_complete');
    }

    // Track real cadence performance
    await this.trackRealCadenceMetrics(contact_id, cadenceStep, response);
  }

  private async getRealCadenceStep(bucket: number, tag: string, currentStep: number): Promise<RealCadenceStep | null> {
    try {
      // Try to get real cadence rule from database
      const { data: cadenceRule, error } = await supabase
        .from('cadence_rules')
        .select('*')
        .eq('bucket', bucket)
        .eq('tag', tag)
        .eq('step_number', currentStep + 1)
        .maybeSingle();

      if (error) {
        // If table doesn't exist or no rule found, create sensible default
        return this.createDefaultCadenceStep(bucket, tag, currentStep + 1);
      }

      if (!cadenceRule) {
        // No more steps in sequence
        return null;
      }

      // Convert database rule to RealCadenceStep format
      return {
        id: `${bucket}.${tag}.${cadenceRule.step_number}`,
        bucket,
        tag,
        step: cadenceRule.step_number,
        delay_hours: cadenceRule.delay_hours,
        channel: cadenceRule.channel as 'email' | 'sms' | 'call',
        template_id: cadenceRule.id, // Use rule id as template reference
        conditions: {
          max_attempts: 5, // Default from schema
          min_engagement_score: 0, // Default value
          exclude_tags: [] // Default empty array
        }
      };
    } catch {
      // Fallback to default if any issues
      return this.createDefaultCadenceStep(bucket, tag, currentStep + 1);
    }
  }

  private createDefaultCadenceStep(bucket: number, tag: string, stepNumber: number): RealCadenceStep | null {
    // Create sensible defaults based on bucket and step
    if (stepNumber > 5) return null; // Max 5 steps

    const baseDelays = [24, 48, 72, 168, 336]; // 1 day, 2 days, 3 days, 1 week, 2 weeks
    const channels: ('sms' | 'email' | 'call')[] = ['sms', 'email', 'sms', 'email', 'call'];

    return {
      id: `default_${bucket}.${tag}.${stepNumber}`,
      bucket,
      tag,
      step: stepNumber,
      delay_hours: baseDelays[stepNumber - 1] || 168,
      channel: channels[stepNumber - 1] || 'email',
      template_id: `default_${bucket}_${tag}_${stepNumber}`,
      conditions: {
        max_attempts: 5
      }
    };
  }

  private checkRealStepConditions(step: RealCadenceStep, contact: any, leadStatus: any): boolean {
    if (step.conditions) {
      // Check max attempts from real data
      if (step.conditions.max_attempts && leadStatus.total_attempts >= step.conditions.max_attempts) {
        return false;
      }

      // Check minimum engagement score (would need to calculate from events)
      if (step.conditions.min_engagement_score) {
        // Could query events table for engagement metrics
      }

      // Check excluded tags
      if (step.conditions.exclude_tags?.length) {
        // Could check contact tags or status
        if (step.conditions.exclude_tags.includes(contact.status)) {
          return false;
        }
      }
    }

    return true;
  }

  private async getRealPersonalizedTemplate(templateId: string, contact: any): Promise<RealCadenceTemplate> {
    try {
      // Try to get real template from database
      const { data: template, error } = await supabase
        .from('cadence_templates')
        .select('*')
        .eq('id', templateId)
        .maybeSingle();

      if (error || !template) {
        // Create default template
        return this.createDefaultTemplate(templateId, contact);
      }

      // Personalize template with real contact data
      return this.personalizeRealTemplate(template, contact);
    } catch {
      return this.createDefaultTemplate(templateId, contact);
    }
  }

  private createDefaultTemplate(templateId: string, contact: any): RealCadenceTemplate {
    // Create templates based on template ID pattern
    const [, bucket, tag, step] = templateId.split('_');
    
    const templates = {
      '1_1_1': {
        subject: 'Welcome to {business_name}!',
        body: 'Hi {first_name}, thanks for your interest in our services. When would be a good time for a consultation?'
      },
      '2_1_1': {
        subject: 'Following up on your inquiry',
        body: 'Hi {first_name}, I wanted to follow up on your interest in {service}. Are you still looking to schedule?'
      },
      '5_1_1': {
        subject: 'Time for your next appointment?',
        body: 'Hi {first_name}, it\'s been a while since your last {service}. Ready to schedule your next visit?'
      }
    };

    const templateKey = `${bucket}_${tag}_${step}`;
    const defaultTemplate = templates[templateKey] || {
      subject: 'Following up from {business_name}',
      body: 'Hi {first_name}, just wanted to check in with you. How can we help?'
    };

    return {
      id: templateId,
      name: `Template ${templateKey}`,
      subject: defaultTemplate.subject,
      body: defaultTemplate.body,
      variables: ['first_name', 'business_name', 'service'],
      tone: 'professional'
    };
  }

  private personalizeRealTemplate(template: any, contact: any): RealCadenceTemplate {
    let personalizedBody = template.body;
    let personalizedSubject = template.subject || '';

    // Get business name from contact's user profile
    const businessName = contact.business_name || 'our business';
    
    // Replace variables with real contact data
    const variables = {
      '{name}': contact.name || 'there',
      '{first_name}': contact.name?.split(' ')[0] || 'there',
      '{business_name}': businessName,
      '{service}': contact.preferred_service || 'our services',
      '{last_service}': contact.last_service || 'your last service'
    };

    Object.entries(variables).forEach(([placeholder, value]) => {
      personalizedBody = personalizedBody.replace(new RegExp(placeholder, 'g'), value);
      personalizedSubject = personalizedSubject.replace(new RegExp(placeholder, 'g'), value);
    });

    return {
      id: template.id,
      name: template.name,
      subject: personalizedSubject,
      body: personalizedBody,
      variables: template.variables || [],
      tone: template.tone || 'professional',
      industry_specific: template.industry_specific
    };
  }

  private async scheduleRealNextStep(contactId: string, bucket: number, tag: string, nextStep: number): Promise<void> {
    // Get real delay from cadence rules or use default
    let delayHours = 24; // Default
    
    try {
      const { data: rule } = await supabase
        .from('cadence_rules')
        .select('delay_hours')
        .eq('bucket', bucket)
        .eq('tag', tag)
        .eq('step_number', nextStep)
        .maybeSingle();

      if (rule?.delay_hours) {
        delayHours = rule.delay_hours;
      }
    } catch {
      // Use default
    }

    const nextActionAt = new Date();
    nextActionAt.setHours(nextActionAt.getHours() + delayHours);

    const { error } = await supabase
      .from('lead_status')
      .update({ 
        next_action_at: nextActionAt.toISOString(),
        cadence_step: nextStep,
        updated_at: new Date().toISOString()
      })
      .eq('contact_id', contactId);

    if (error) {
      throw error;
    }
  }

  private async completeRealCadence(contactId: string, reason: string): Promise<void> {
    const { error } = await supabase
      .from('lead_status')
      .update({ 
        next_action_at: null,
        cadence_status: 'completed',
        completion_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('contact_id', contactId);

    if (error) {
      throw error;
    }

    // Log completion event
    await supabase
      .from('events')
      .insert({
        user_id: contactId,
        type: 'real_cadence_completed',
        source: 'real_cadence_engine',
        metadata: { reason }
      });
  }

  private async skipRealCadenceStep(contactId: string, stepId: string, reason: string): Promise<void> {
    await supabase
      .from('events')
      .insert({
        user_id: contactId,
        type: 'real_cadence_step_skipped',
        source: 'real_cadence_engine',
        metadata: { step_id: stepId, reason }
      });
  }

  private async trackRealCadenceMetrics(contactId: string, step: RealCadenceStep, response: any): Promise<void> {
    // Track metrics in events table and update lead_status
    await supabase
      .from('events')
      .insert({
        user_id: contactId,
        type: 'real_cadence_metrics_tracked',
        source: 'real_cadence_engine',
        metadata: {
          step_id: step.id,
          channel: step.channel,
          template_id: step.template_id,
          response_type: response.type,
          engagement_generated: response.data?.engagement_score || 0,
          conversion_event: response.data?.conversion_event || null
        }
      });

    // Update attempt count - get current and increment
    try {
      const { data: current } = await supabase
        .from('lead_status')
        .select('total_attempts')
        .eq('contact_id', contactId)
        .single();
      
      await supabase
        .from('lead_status')
        .update({
          total_attempts: (current?.total_attempts || 0) + 1,
          last_contact_at: new Date().toISOString()
        })
        .eq('contact_id', contactId);
    } catch (error) {
      // If lead_status doesn't exist, create it
      await supabase
        .from('lead_status')
        .insert({
          contact_id: contactId,
          total_attempts: 1,
          last_contact_at: new Date().toISOString(),
          bucket: 1,
          tag: '1.1'
        });
    }
  }

  private async logRealCadenceError(contactId: string, error: any): Promise<void> {
    await supabase
      .from('events')
      .insert({
        user_id: contactId,
        type: 'real_cadence_error',
        source: 'real_cadence_engine',
        metadata: { 
          error: error.message,
          stack: error.stack?.substring(0, 1000)
        }
      });
  }

  /**
   * Initialize real cadence for a contact
   */
  async initializeRealCadence(contactId: string, bucket: number, tag: string): Promise<void> {
    // Get first step delay
    const firstStep = await this.getRealCadenceStep(bucket, tag, 0);
    
    if (!firstStep) return;

    const nextActionAt = new Date();
    nextActionAt.setHours(nextActionAt.getHours() + firstStep.delay_hours);

    await supabase
      .from('lead_status')
      .update({
        next_action_at: nextActionAt.toISOString(),
        cadence_step: 0,
        cadence_status: 'active',
        total_attempts: 0
      })
      .eq('contact_id', contactId);
  }

  /**
   * Pause real cadence for a contact
   */
  async pauseRealCadence(contactId: string, reason: string): Promise<void> {
    await supabase
      .from('lead_status')
      .update({
        next_action_at: null,
        cadence_status: 'paused',
        pause_reason: reason
      })
      .eq('contact_id', contactId);
  }

  /**
   * Resume real cadence for a contact
   */
  async resumeRealCadence(contactId: string): Promise<void> {
    const { data: leadStatus } = await supabase
      .from('lead_status')
      .select('bucket, tag, cadence_step')
      .eq('contact_id', contactId)
      .maybeSingle();

    if (!leadStatus) return;

    const nextStep = await this.getRealCadenceStep(
      leadStatus.bucket, 
      leadStatus.tag, 
      leadStatus.cadence_step || 0
    );

    if (nextStep) {
      const nextActionAt = new Date();
      nextActionAt.setHours(nextActionAt.getHours() + nextStep.delay_hours);

      await supabase
        .from('lead_status')
        .update({
          next_action_at: nextActionAt.toISOString(),
          cadence_status: 'active',
          pause_reason: null
        })
        .eq('contact_id', contactId);
    }
  }
}