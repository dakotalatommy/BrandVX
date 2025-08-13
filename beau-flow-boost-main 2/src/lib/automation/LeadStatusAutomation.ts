import { supabase } from "@/integrations/supabase/client";

export interface LeadAction {
  type: 'appointment_booked' | 'email_reply' | 'sms_reply' | 'website_visit' | 'consultation_completed' | 'service_purchased' | 'payment_made';
  contactId: string;
  userId: string;
  metadata?: Record<string, any>;
}

export interface StatusTransition {
  from: string;
  to: string;
  triggers: string[];
  conditions?: Record<string, any>;
}

/**
 * Lead Status Automation Engine
 * Handles automatic progression of contacts through the sales funnel
 */
export class LeadStatusAutomation {
  
  // Define the status progression rules
  private static statusTransitions: StatusTransition[] = [
    {
      from: 'lead',
      to: 'prospect',
      triggers: ['email_reply', 'sms_reply', 'appointment_booked', 'website_visit']
    },
    {
      from: 'prospect', 
      to: 'client',
      triggers: ['consultation_completed', 'service_purchased', 'payment_made']
    }
  ];

  /**
   * Process a lead action and determine if status should change
   */
  static async processLeadAction(action: LeadAction): Promise<void> {
    try {
      // Get current contact status
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('id, status, user_id')
        .eq('id', action.contactId)
        .single();

      if (contactError || !contact) {
        console.error('Contact not found:', action.contactId);
        return;
      }

      // Find applicable transition
      const transition = this.statusTransitions.find(t => 
        t.from === contact.status && 
        t.triggers.includes(action.type)
      );

      if (!transition) {
        // No status change needed
        await this.logAction(action, 'no_change');
        return;
      }

      // Check if conditions are met (if any)
      if (transition.conditions && !await this.checkConditions(contact.id, transition.conditions)) {
        await this.logAction(action, 'conditions_not_met');
        return;
      }

      // Update contact status
      const { error: updateError } = await supabase
        .from('contacts')
        .update({ 
          status: transition.to,
          updated_at: new Date().toISOString()
        })
        .eq('id', contact.id);

      if (updateError) {
        console.error('Error updating contact status:', updateError);
        return;
      }

      // Update or create lead status record
      await this.updateLeadStatus(contact.id, transition.to, action);

      // Log the status change event
      await this.logStatusChange(action, transition);

      // Calculate and update time saved
      await this.updateTimeSaved(action.userId, 'lead_status_automation', 3, 0.2);

      console.log(`Contact ${contact.id} status changed: ${transition.from} → ${transition.to}`);

    } catch (error) {
      console.error('Error processing lead action:', error);
    }
  }

  /**
   * Update lead status tracking with bucket assignment
   */
  private static async updateLeadStatus(contactId: string, newStatus: string, action: LeadAction): Promise<void> {
    const bucket = this.getBucketForStatus(newStatus, action.type);
    const tag = this.getTagForAction(action.type);

    const { error } = await supabase
      .from('lead_status')
      .upsert({
        contact_id: contactId,
        bucket,
        tag,
        last_contact_at: new Date().toISOString(),
        reason: `Auto-progression from ${action.type}`,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'contact_id'
      });

    if (error) {
      console.error('Error updating lead status:', error);
    }
  }

  /**
   * Determine bucket based on status and action type
   */
  private static getBucketForStatus(status: string, actionType: string): number {
    if (status === 'prospect') {
      return actionType === 'appointment_booked' ? 4 : 3; // Hot leads vs warm leads
    }
    if (status === 'client') {
      return 5; // Converted customers
    }
    return 1; // Default for leads
  }

  /**
   * Get tag based on action type
   */
  private static getTagForAction(actionType: string): string {
    const tagMap: Record<string, string> = {
      'email_reply': 'responded',
      'sms_reply': 'responded', 
      'appointment_booked': 'booked',
      'website_visit': 'engaged',
      'consultation_completed': 'consulted',
      'service_purchased': 'converted',
      'payment_made': 'converted'
    };
    
    return tagMap[actionType] || 'general';
  }

  /**
   * Check additional conditions for status transitions
   */
  private static async checkConditions(contactId: string, conditions: Record<string, any>): Promise<boolean> {
    // Example: Check if minimum engagement score is met
    if (conditions.min_engagement_score) {
      const { data: interactions } = await supabase
        .from('messages')
        .select('id')
        .eq('contact_id', contactId)
        .eq('direction', 'inbound');

      const engagementScore = (interactions?.length || 0) * 10;
      if (engagementScore < conditions.min_engagement_score) {
        return false;
      }
    }

    return true;
  }

  /**
   * Log the action for tracking
   */
  private static async logAction(action: LeadAction, result: string): Promise<void> {
    await supabase
      .from('events')
      .insert({
        user_id: action.userId,
        type: 'lead_action_processed',
        source: 'lead_automation',
        metadata: {
          action_type: action.type,
          contact_id: action.contactId,
          result,
          ...action.metadata
        }
      });
  }

  /**
   * Log successful status change
   */
  private static async logStatusChange(action: LeadAction, transition: StatusTransition): Promise<void> {
    await supabase
      .from('events')
      .insert({
        user_id: action.userId,
        type: 'status_change',
        source: 'lead_automation',
        baseline_min: 5, // Manual status tracking would take 5 minutes
        auto_min: 0.1,   // Automated in 6 seconds
        metadata: {
          contact_id: action.contactId,
          from_status: transition.from,
          to_status: transition.to,
          trigger_action: action.type,
          automated: true
        }
      });
  }

  /**
   * Update time saved metrics
   */
  private static async updateTimeSaved(userId: string, task: string, baselineMin: number, autoMin: number): Promise<void> {
    await supabase
      .from('events')
      .insert({
        user_id: userId,
        type: 'time_saved',
        source: 'lead_automation',
        baseline_min: baselineMin,
        auto_min: autoMin,
        metadata: {
          task,
          time_saved_minutes: baselineMin - autoMin
        }
      });
  }

  /**
   * Trigger lead action from external events (appointments, payments, etc.)
   */
  static async triggerFromAppointment(contactId: string, userId: string, appointmentData: any): Promise<void> {
    await this.processLeadAction({
      type: 'appointment_booked',
      contactId,
      userId,
      metadata: { 
        appointment_id: appointmentData.id,
        service: appointmentData.service,
        source: 'appointment_system'
      }
    });
  }

  static async triggerFromMessage(contactId: string, userId: string, messageData: any): Promise<void> {
    const actionType = messageData.channel === 'sms' ? 'sms_reply' : 'email_reply';
    
    await this.processLeadAction({
      type: actionType,
      contactId,
      userId,
      metadata: {
        message_id: messageData.id,
        channel: messageData.channel,
        source: 'messaging_system'
      }
    });
  }

  static async triggerFromPayment(contactId: string, userId: string, paymentData: any): Promise<void> {
    await this.processLeadAction({
      type: 'payment_made',
      contactId,
      userId,
      metadata: {
        amount: paymentData.amount,
        service: paymentData.service,
        source: 'payment_system'
      }
    });
  }
}