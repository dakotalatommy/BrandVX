import { supabase } from "@/integrations/supabase/client";
import { AppointmentManager } from "./specialists/AppointmentManager";
import { TreatmentManager } from "./specialists/TreatmentManager";
import { ContentCreator } from "./specialists/ContentCreator";
import { InventoryManager } from "./specialists/InventoryManager";
import { AdminRevenue } from "./specialists/AdminRevenue";
import { MemoryManager } from "./memory/MemoryManager";

export interface BrandVXIntent {
  type: 'consultation' | 'hair' | 'lash' | 'content' | 'inventory' | 'admin' | 'book' | 'retarget' | 'cadence';
  userId: string;
  contactId?: string;
  payload: Record<string, any>;
}

export interface AgentResponse {
  type: 'result' | 'plan' | 'error';
  text: string;
  data?: Record<string, any>;
  nextActions?: string[];
  events?: Array<{
    type: string;
    campaign?: string;
    payload: Record<string, any>;
    baseline_min?: number;
    auto_min?: number;
  }>;
}

/**
 * BrandVX Master Agent - Orchestrates all specialist agents
 * Implements H-layer technical constraints with L-layer brand tone
 */
export class BrandVXAgent {
  private memoryManager: MemoryManager;
  private appointmentManager: AppointmentManager;
  private treatmentManager: TreatmentManager;
  private contentCreator: ContentCreator;
  private inventoryManager: InventoryManager;
  private adminRevenue: AdminRevenue;

  constructor() {
    this.memoryManager = new MemoryManager();
    this.appointmentManager = new AppointmentManager();
    this.treatmentManager = new TreatmentManager();
    this.contentCreator = new ContentCreator();
    this.inventoryManager = new InventoryManager();
    this.adminRevenue = new AdminRevenue();
  }

  /**
   * Main orchestration method - routes intent to appropriate specialist
   * Following BrandVX tone: confident, empathetic, strategy-first
   */
  async processIntent(intent: BrandVXIntent): Promise<AgentResponse> {
    try {
      // Load context from memory system
      const context = await this.loadContext(intent.userId, intent.contactId);
      
      // Apply compliance and quality gates
      const complianceCheck = await this.checkCompliance(intent, context);
      if (!complianceCheck.passed) {
        return {
          type: 'error',
          text: complianceCheck.reason,
          data: { compliance_failure: true }
        };
      }

      // Route to appropriate specialist
      let response: AgentResponse;
      
      switch (intent.type) {
        case 'consultation':
          response = await this.handleConsultation(intent, context);
          break;
        case 'book':
          response = await this.appointmentManager.handleBooking(intent, context);
          break;
        case 'hair':
        case 'lash':
          response = await this.treatmentManager.handleTreatment(intent, context);
          break;
        case 'content':
          response = await this.contentCreator.handleContent(intent, context);
          break;
        case 'inventory':
          response = await this.inventoryManager.handleInventory(intent, context);
          break;
        case 'admin':
          response = await this.adminRevenue.handleAdmin(intent, context);
          break;
        case 'retarget':
          response = await this.handleRetargeting(intent, context);
          break;
        case 'cadence':
          response = await this.handleCadence(intent, context);
          break;
        default:
          response = {
            type: 'error',
            text: 'I don\'t understand that request. Could you clarify what you\'d like me to help with?',
            data: { unknown_intent: intent.type }
          };
      }

      // Write events and update memory
      await this.writeEvents(intent, response);
      await this.updateMemory(intent, context, response);

      return response;

    } catch (error) {
      console.error('BrandVX Agent Error:', error);
      return {
        type: 'error',
        text: 'I encountered an issue processing your request. Let me get that sorted for you.',
        data: { error: error.message }
      };
    }
  }

  private async loadContext(userId: string, contactId?: string) {
    const context = {
      user: await this.getUserProfile(userId),
      contact: contactId ? await this.getContactData(contactId) : null,
      entity: contactId ? await this.memoryManager.getEntity(contactId) : {},
      summary: contactId ? await this.memoryManager.getSummary(contactId) : '',
      vectors: contactId ? await this.memoryManager.getTopVectors(contactId, 6) : []
    };

    return context;
  }

  private async checkCompliance(intent: BrandVXIntent, context: any) {
    // Check consent flags for messaging
    if (['cadence', 'retarget'].includes(intent.type) && context.contact) {
      const consentFlags = context.contact.consent_flags || {};
      
      if (intent.payload.channel === 'sms' && !consentFlags.sms) {
        return { passed: false, reason: 'SMS consent not granted for this contact' };
      }
      
      if (intent.payload.channel === 'email' && !consentFlags.email) {
        return { passed: false, reason: 'Email consent not granted for this contact' };
      }
    }

    // Check rate limits (simplified)
    const recentMessages = await this.getRecentMessages(intent.contactId);
    if (recentMessages.length > 5) { // Max 5 messages per day
      return { passed: false, reason: 'Daily message limit reached for this contact' };
    }

    return { passed: true };
  }

  private async handleConsultation(intent: BrandVXIntent, context: any): Promise<AgentResponse> {
    // Consultation Coordinator - handles replies, gathers requirements, triages
    const { payload } = intent;
    
    if (payload.message_type === 'inbound_reply') {
      // Parse intent from inbound message
      const parsedIntent = await this.parseInboundMessage(payload.message);
      
      if (parsedIntent.includes('book')) {
        return {
          type: 'plan',
          text: 'I see you\'d like to book an appointment. Let me help you find the perfect time.',
          nextActions: ['book_appointment'],
          data: { parsed_intent: 'booking' }
        };
      }
      
      if (parsedIntent.includes('reschedule')) {
        return {
          type: 'plan', 
          text: 'I can help you reschedule. Would you prefer the soonest available slot, or do you have specific dates in mind?',
          nextActions: ['reschedule_appointment'],
          data: { parsed_intent: 'reschedule' }
        };
      }
    }

    return {
      type: 'result',
      text: 'I\'m here to help with your beauty journey. What can I assist you with today?',
      data: { consultation_started: true }
    };
  }

  private async handleRetargeting(intent: BrandVXIntent, context: any): Promise<AgentResponse> {
    const contact = context.contact;
    const leadStatus = await this.getLeadStatus(contact.id);
    
    // Determine retargeting type based on current bucket
    if (leadStatus.bucket === 2) {
      // Never Answered -> Sudden Death - No Answer
      await this.updateLeadStatus(contact.id, 3, '3.1');
      return {
        type: 'result',
        text: 'Moving to emotional counter-offer sequence',
        data: { retarget_type: 'no_answer' },
        events: [{
          type: 'retarget_initiated',
          campaign: '3.1',
          payload: { reason: 'never_answered' },
          baseline_min: 3,
          auto_min: 0.5
        }]
      };
    }

    return {
      type: 'result',
      text: 'Retargeting sequence configured',
      data: { current_bucket: leadStatus.bucket }
    };
  }

  private async handleCadence(intent: BrandVXIntent, context: any): Promise<AgentResponse> {
    const { contactId, payload } = intent;
    const { step, campaign } = payload;

    // Execute cadence step based on bucket.tag
    const leadStatus = await this.getLeadStatus(contactId);
    const template = await this.getCadenceTemplate(leadStatus.bucket, leadStatus.tag, step);
    
    return {
      type: 'result',
      text: `Cadence ${campaign} step ${step} executed`,
      data: { template_used: template.id },
      events: [{
        type: 'cadence_step_completed',
        campaign: `${leadStatus.bucket}.${leadStatus.tag}`,
        payload: { step, template_id: template.id },
        baseline_min: 2,
        auto_min: 0.3
      }]
    };
  }

  private async writeEvents(intent: BrandVXIntent, response: AgentResponse) {
    if (response.events) {
      for (const event of response.events) {
        await supabase
          .from('events')
          .insert({
            user_id: intent.userId,
            type: event.type,
            source: 'brandvx_agent',
            metadata: event.payload,
            baseline_min: event.baseline_min,
            auto_min: event.auto_min
          });
      }
    }
  }

  private async updateMemory(intent: BrandVXIntent, context: any, response: AgentResponse) {
    if (intent.contactId && response.data) {
      // Update entity store with new attributes
      await this.memoryManager.updateEntity(intent.contactId, response.data);
      
      // Update summary with interaction
      const summaryUpdate = `${intent.type}: ${response.text}`;
      await this.memoryManager.updateSummary(intent.contactId, summaryUpdate);
    }
  }

  // Helper methods
  private async getUserProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return data;
  }

  private async getContactData(contactId: string) {
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();
    return data;
  }

  private async getLeadStatus(contactId: string) {
    const { data } = await supabase
      .from('lead_status')
      .select('*')
      .eq('contact_id', contactId)
      .single();
    return data;
  }

  private async updateLeadStatus(contactId: string, bucket: number, tag: string) {
    await supabase
      .from('lead_status')
      .update({ bucket, tag, updated_at: new Date().toISOString() })
      .eq('contact_id', contactId);
  }

  private async getRecentMessages(contactId?: string) {
    if (!contactId) return [];
    
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('contact_id', contactId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    return data || [];
  }

  private async parseInboundMessage(message: string): Promise<string> {
    // Simple keyword detection (would use AI in production)
    const keywords = ['book', 'schedule', 'appointment', 'reschedule', 'cancel', 'stop', 'help'];
    return keywords.find(keyword => message.toLowerCase().includes(keyword)) || 'unknown';
  }

  private async getCadenceTemplate(bucket: number, tag: string, step: number) {
    // Would fetch from templates table in production
    return {
      id: `${bucket}.${tag}.${step}`,
      subject: 'BrandVX Follow-up',
      body: 'Template content...'
    };
  }
}