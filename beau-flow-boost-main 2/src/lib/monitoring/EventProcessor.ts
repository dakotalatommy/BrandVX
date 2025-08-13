import { supabase } from "@/integrations/supabase/client";

export interface EventPattern {
  id: string;
  name: string;
  conditions: EventCondition[];
  actions: EventAction[];
  priority: number;
  active: boolean;
}

export interface EventCondition {
  type: 'event_sequence' | 'time_window' | 'property_match' | 'frequency';
  params: Record<string, any>;
}

export interface EventAction {
  type: 'trigger_cadence' | 'update_status' | 'send_notification' | 'score_adjustment' | 'agent_action';
  params: Record<string, any>;
}

/**
 * EventProcessor - Real-time event processing and pattern recognition
 * Enables intelligent automation based on user behavior patterns
 */
export class EventProcessor {
  private patterns: EventPattern[] = [];

  constructor() {
    this.loadEventPatterns();
  }

  /**
   * Process incoming events and trigger automated responses
   */
  async processEvent(event: {
    type: string;
    user_id?: string;
    contact_id?: string;
    metadata: Record<string, any>;
    source: string;
  }): Promise<void> {
    try {
      // Store the event
      const { data: storedEvent } = await supabase
        .from('events')
        .insert({
          type: event.type,
          user_id: event.user_id || 'system',
          metadata: event.metadata,
          source: event.source
        })
        .select()
        .single();

      if (!storedEvent) return;

      // Check for pattern matches
      await this.checkEventPatterns(storedEvent);

      // Update real-time metrics
      await this.updateRealTimeMetrics(storedEvent);

      // Trigger real-time dashboard updates
      await this.triggerDashboardUpdate(event.user_id, event.contact_id);

    } catch (error) {
      console.error('Error processing event:', error);
      await this.logProcessingError(event, error);
    }
  }

  private async checkEventPatterns(event: any): Promise<void> {
    for (const pattern of this.patterns) {
      if (!pattern.active) continue;

      const matches = await this.evaluatePattern(pattern, event);
      if (matches) {
        await this.executePatternActions(pattern, event);
      }
    }
  }

  private async evaluatePattern(pattern: EventPattern, event: any): Promise<boolean> {
    for (const condition of pattern.conditions) {
      const conditionMet = await this.evaluateCondition(condition, event);
      if (!conditionMet) return false;
    }
    return true;
  }

  private async evaluateCondition(condition: EventCondition, event: any): Promise<boolean> {
    switch (condition.type) {
      case 'event_sequence':
        return await this.checkEventSequence(condition.params, event);
      
      case 'time_window':
        return await this.checkTimeWindow(condition.params, event);
      
      case 'property_match':
        return this.checkPropertyMatch(condition.params, event);
      
      case 'frequency':
        return await this.checkEventFrequency(condition.params, event);
      
      default:
        return false;
    }
  }

  private async checkEventSequence(params: any, event: any): Promise<boolean> {
    const { sequence, within_hours } = params;
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - within_hours);

    const { data: recentEvents } = await supabase
      .from('events')
      .select('type, created_at')
      .eq('user_id', event.user_id)
      .gte('created_at', cutoffTime.toISOString())
      .order('created_at', { ascending: true });

    if (!recentEvents) return false;

    // Check if the sequence matches
    const eventTypes = recentEvents.map(e => e.type);
    return this.matchesSequence(eventTypes, sequence);
  }

  private matchesSequence(events: string[], sequence: string[]): boolean {
    let sequenceIndex = 0;
    
    for (const event of events) {
      if (event === sequence[sequenceIndex]) {
        sequenceIndex++;
        if (sequenceIndex === sequence.length) return true;
      }
    }
    
    return false;
  }

  private async checkTimeWindow(params: any, event: any): Promise<boolean> {
    const { hours_since_last, event_type } = params;
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours_since_last);

    const { data: lastEvent } = await supabase
      .from('events')
      .select('created_at')
      .eq('user_id', event.user_id)
      .eq('type', event_type)
      .gte('created_at', cutoffTime.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return !lastEvent; // True if no recent event found
  }

  private checkPropertyMatch(params: any, event: any): boolean {
    const { property_path, expected_value } = params;
    const actualValue = this.getNestedProperty(event, property_path);
    return actualValue === expected_value;
  }

  private async checkEventFrequency(params: any, event: any): Promise<boolean> {
    const { event_type, count, within_hours } = params;
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - within_hours);

    const { count: eventCount } = await supabase
      .from('events')
      .select('id', { count: 'exact' })
      .eq('user_id', event.user_id)
      .eq('type', event_type)
      .gte('created_at', cutoffTime.toISOString());

    return (eventCount || 0) >= count;
  }

  private async executePatternActions(pattern: EventPattern, event: any): Promise<void> {
    for (const action of pattern.actions) {
      try {
        await this.executeAction(action, event);
      } catch (error) {
        console.error(`Failed to execute action ${action.type} for pattern ${pattern.id}:`, error);
      }
    }

    // Log pattern execution
    await supabase
      .from('events')
      .insert({
        user_id: event.user_id,
        type: 'pattern_executed',
        source: 'event_processor',
        metadata: {
          pattern_id: pattern.id,
          pattern_name: pattern.name,
          trigger_event: event.type
        }
      });
  }

  private async executeAction(action: EventAction, event: any): Promise<void> {
    switch (action.type) {
      case 'trigger_cadence':
        await this.triggerCadence(action.params, event);
        break;
      
      case 'update_status':
        await this.updateLeadStatus(action.params, event);
        break;
      
      case 'send_notification':
        await this.sendNotification(action.params, event);
        break;
      
      case 'score_adjustment':
        await this.adjustEngagementScore(action.params, event);
        break;
      
      case 'agent_action':
        await this.triggerAgentAction(action.params, event);
        break;
    }
  }

  private async triggerCadence(params: any, event: any): Promise<void> {
    const { bucket, tag, delay_hours } = params;
    
    const nextActionAt = new Date();
    nextActionAt.setHours(nextActionAt.getHours() + (delay_hours || 0));

    // Find or create lead status
    const { data: existingStatus } = await supabase
      .from('lead_status')
      .select('*')
      .eq('contact_id', event.user_id)
      .single();

    if (existingStatus) {
      await supabase
        .from('lead_status')
        .update({
          bucket,
          tag,
          next_action_at: nextActionAt.toISOString(),
          active: true,
          updated_at: new Date().toISOString()
        })
        .eq('contact_id', event.user_id);
    }
  }

  private async updateLeadStatus(params: any, event: any): Promise<void> {
    const updates: any = { updated_at: new Date().toISOString() };
    
    if (params.bucket) updates.bucket = params.bucket;
    if (params.tag) updates.tag = params.tag;
    if (params.active !== undefined) updates.active = params.active;

    await supabase
      .from('lead_status')
      .update(updates)
      .eq('contact_id', event.user_id);
  }

  private async sendNotification(params: any, event: any): Promise<void> {
    // Implementation would integrate with notification system
    console.log(`Notification triggered: ${params.message} for user ${event.user_id}`);
  }

  private async adjustEngagementScore(params: any, event: any): Promise<void> {
    const { adjustment, reason } = params;
    
    // Since engagement_score doesn't exist in contacts table yet, log it as an event
    await supabase
      .from('events')
      .insert({
        user_id: event.user_id,
        type: 'engagement_score_adjusted',
        source: 'event_processor',
        metadata: {
          adjustment,
          reason,
          triggered_by: event.type
        }
      });
  }

  private async triggerAgentAction(params: any, event: any): Promise<void> {
    // Would trigger BrandVX Agent with specific intent
    console.log(`Agent action triggered: ${params.action} for user ${event.user_id}`);
  }

  private async updateRealTimeMetrics(event: any): Promise<void> {
    // Update dashboard metrics in real-time
    const today = new Date().toISOString().split('T')[0];
    
    // Store metrics as events since daily_metrics table doesn't exist
    await supabase
      .from('events')
      .insert({
        user_id: event.user_id,
        type: 'daily_metric_updated',
        source: 'metrics_system',
        metadata: {
          date: today,
          event_type: event.type,
          increment: 1
        }
      });
  }

  private async triggerDashboardUpdate(userId?: string, contactId?: string): Promise<void> {
    // Real-time dashboard updates via WebSocket or polling
    const updatePayload = {
      type: 'metrics_update',
      user_id: userId,
      contact_id: contactId,
      timestamp: new Date().toISOString()
    };

    // Would publish to real-time channel
    console.log('Dashboard update triggered:', updatePayload);
  }

  private async loadEventPatterns(): Promise<void> {
    // Load default patterns since event_patterns table doesn't exist yet
    this.patterns = EventProcessor.getDefaultPatterns();
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async logProcessingError(event: any, error: any): Promise<void> {
    await supabase
      .from('events')
      .insert({
        user_id: event.user_id || 'system',
        type: 'processing_error',
        source: 'event_processor',
        metadata: {
          original_event: event,
          error: error.message,
          stack: error.stack?.substring(0, 1000)
        }
      });
  }

  /**
   * Pre-configured patterns for common business scenarios
   */
  static getDefaultPatterns(): EventPattern[] {
    return [
      {
        id: 'abandoned_consultation',
        name: 'Abandoned Consultation Follow-up',
        conditions: [
          {
            type: 'event_sequence',
            params: {
              sequence: ['consultation_started'],
              within_hours: 1
            }
          },
          {
            type: 'time_window',
            params: {
              hours_since_last: 1,
              event_type: 'consultation_completed'
            }
          }
        ],
        actions: [
          {
            type: 'trigger_cadence',
            params: {
              bucket: 1,
              tag: '1.1',
              delay_hours: 0.5
            }
          }
        ],
        priority: 1,
        active: true
      },
      {
        id: 'high_engagement_conversion',
        name: 'High Engagement Conversion Push',
        conditions: [
          {
            type: 'frequency',
            params: {
              event_type: 'message_opened',
              count: 3,
              within_hours: 24
            }
          }
        ],
        actions: [
          {
            type: 'score_adjustment',
            params: {
              adjustment: 10,
              reason: 'high_engagement'
            }
          },
          {
            type: 'agent_action',
            params: {
              action: 'personalized_offer'
            }
          }
        ],
        priority: 2,
        active: true
      }
    ];
  }
}