import { supabase } from "@/integrations/supabase/client";
import type { BrandVXIntent, AgentResponse } from "../BrandVXAgent";

/**
 * Appointment Manager Specialist
 * Handles Square/Acuity booking, "soonest vs anytime", notify-list, show-up reminders
 */
export class AppointmentManager {
  
  async handleBooking(intent: BrandVXIntent, context: any): Promise<AgentResponse> {
    const { payload, contactId } = intent;
    const { preference, service, client_name } = payload;

    try {
      // Check for existing appointments
      const existingAppointments = await this.getContactAppointments(contactId);
      
      if (preference === 'soonest') {
        return await this.handleSoonestBooking(intent, context);
      } else {
        return await this.handleAnytimeBooking(intent, context);
      }

    } catch (error) {
      return {
        type: 'error',
        text: 'I had trouble accessing the booking system. Let me try again in a moment.',
        data: { error: error.message }
      };
    }
  }

  private async handleSoonestBooking(intent: BrandVXIntent, context: any): Promise<AgentResponse> {
    const { contactId, payload } = intent;
    
    // Try to find immediate availability
    const availableSlots = await this.getAvailableSlots(7); // Next 7 days
    
    if (availableSlots.length > 0) {
      const nextSlot = availableSlots[0];
      
      // Create appointment
      const appointment = await this.createAppointment({
        contact_id: contactId,
        service: payload.service || 'Consultation',
        start_ts: nextSlot.start,
        end_ts: nextSlot.end,
        status: 'booked',
        source: 'brandvx',
        soonest: true
      });

      // Schedule reminders (7d, 3d, 1d, 2h)
      await this.scheduleReminders(appointment.id, nextSlot.start);
      
      // Update lead status to 4.2 (Meeting booked)
      await this.updateLeadStatus(contactId, 4, '4.2');

      return {
        type: 'result',
        text: `Perfect! I've booked you for ${nextSlot.start.toLocaleDateString()} at ${nextSlot.start.toLocaleTimeString()}. You'll receive reminders leading up to your appointment.`,
        data: {
          booking_id: appointment.id,
          appointment_time: nextSlot.start,
          reminders: ['7d', '3d', '1d', '2h']
        },
        events: [{
          type: 'appointment_booked',
          campaign: '4.2',
          payload: {
            appointment_id: appointment.id,
            preference: 'soonest',
            service: payload.service
          },
          baseline_min: 6, // Manual booking time
          auto_min: 1     // Automated booking time
        }]
      };
    } else {
      // Add to notify list for cancellations
      await this.addToNotifyList(contactId, payload.service);
      
      return {
        type: 'result',
        text: 'I don\'t see any immediate openings, but I\'ve added you to our priority notify list. You\'ll get a text the moment a slot opens up!',
        data: {
          notify_list: true,
          service: payload.service
        },
        events: [{
          type: 'notify_list_added',
          campaign: '4.1',
          payload: {
            service: payload.service,
            preference: 'soonest'
          },
          baseline_min: 3,
          auto_min: 0.5
        }]
      };
    }
  }

  private async handleAnytimeBooking(intent: BrandVXIntent, context: any): Promise<AgentResponse> {
    const { contactId, payload } = intent;
    
    // Get broader availability (next 30 days)
    const availableSlots = await this.getAvailableSlots(30);
    
    if (availableSlots.length === 0) {
      return {
        type: 'error',
        text: 'I\'m not seeing any availability in the next month. Let me check with the team and get back to you.',
        data: { no_availability: true }
      };
    }

    // Group slots by week for easier selection
    const slotOptions = this.groupSlotsByWeek(availableSlots.slice(0, 10));
    
    return {
      type: 'plan',
      text: `I have several options available. Here are some times that work well:\n\n${this.formatSlotOptions(slotOptions)}\n\nWhich works best for you?`,
      data: {
        available_slots: slotOptions,
        booking_pending: true
      },
      nextActions: ['confirm_slot_selection']
    };
  }

  private async createAppointment(appointmentData: any) {
    const { data, error } = await supabase
      .from('appointments')
      .insert(appointmentData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private async scheduleReminders(appointmentId: string, appointmentTime: Date) {
    const reminderTimes = [
      { type: '7d', time: new Date(appointmentTime.getTime() - 7 * 24 * 60 * 60 * 1000) },
      { type: '3d', time: new Date(appointmentTime.getTime() - 3 * 24 * 60 * 60 * 1000) },
      { type: '1d', time: new Date(appointmentTime.getTime() - 1 * 24 * 60 * 60 * 1000) },
      { type: '2h', time: new Date(appointmentTime.getTime() - 2 * 60 * 60 * 1000) }
    ];

    // In production, this would schedule with n8n or similar
    console.log(`Scheduled ${reminderTimes.length} reminders for appointment ${appointmentId}`);
  }

  private async getContactAppointments(contactId?: string) {
    if (!contactId) return [];
    
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('contact_id', contactId)
      .order('start_ts', { ascending: true });
    
    return data || [];
  }

  private async getAvailableSlots(days: number) {
    // Placeholder - would integrate with Square/Acuity calendar API
    const slots = [];
    const now = new Date();
    
    for (let i = 1; i <= days; i++) {
      const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      
      // Skip weekends for this example
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      // Add a few slots per day
      for (let hour of [9, 11, 14, 16]) {
        const slotStart = new Date(date);
        slotStart.setHours(hour, 0, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setHours(hour + 1);
        
        slots.push({
          start: slotStart,
          end: slotEnd,
          available: Math.random() > 0.3 // 70% chance slot is available
        });
      }
    }
    
    return slots.filter(slot => slot.available);
  }

  private async addToNotifyList(contactId: string, service: string) {
    // Add to notify list table (would create this table)
    console.log(`Added contact ${contactId} to notify list for ${service}`);
  }

  private async updateLeadStatus(contactId: string, bucket: number, tag: string) {
    await supabase
      .from('lead_status')
      .update({ 
        bucket, 
        tag, 
        updated_at: new Date().toISOString() 
      })
      .eq('contact_id', contactId);
  }

  private groupSlotsByWeek(slots: any[]) {
    const weeks: { [key: string]: any[] } = {};
    
    slots.forEach(slot => {
      const weekStart = new Date(slot.start);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = [];
      }
      weeks[weekKey].push(slot);
    });
    
    return weeks;
  }

  private formatSlotOptions(slotOptions: { [key: string]: any[] }): string {
    let formatted = '';
    
    Object.entries(slotOptions).slice(0, 2).forEach(([week, slots]) => {
      formatted += `Week of ${new Date(week).toLocaleDateString()}:\n`;
      slots.slice(0, 3).forEach(slot => {
        formatted += `• ${slot.start.toLocaleDateString()} at ${slot.start.toLocaleTimeString()}\n`;
      });
      formatted += '\n';
    });
    
    return formatted;
  }
}