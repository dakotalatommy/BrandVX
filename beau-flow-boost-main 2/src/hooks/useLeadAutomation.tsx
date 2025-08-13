import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { LeadStatusAutomation } from "@/lib/automation/LeadStatusAutomation";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to set up lead automation triggers across the app
 */
export function useLeadAutomation() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Set up real-time listeners for events that should trigger lead status changes
    const setupAutomationTriggers = () => {
      
      // Listen for new appointments
      const appointmentSubscription = supabase
        .channel('appointment_automation')
        .on('postgres_changes', 
          { 
            event: 'INSERT',
            schema: 'public',
            table: 'appointments'
          },
          async (payload) => {
            const appointment = payload.new;
            if (appointment.contact_id) {
              // Get contact's user_id
              const { data: contact } = await supabase
                .from('contacts')
                .select('user_id')
                .eq('id', appointment.contact_id)
                .single();

              if (contact?.user_id === user.id) {
                await LeadStatusAutomation.triggerFromAppointment(
                  appointment.contact_id,
                  contact.user_id,
                  appointment
                );
              }
            }
          }
        )
        .subscribe();

      // Listen for inbound messages (replies)
      const messageSubscription = supabase
        .channel('message_automation')
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public', 
            table: 'messages'
          },
          async (payload) => {
            const message = payload.new;
            if (message.direction === 'inbound' && message.contact_id) {
              // Get contact's user_id
              const { data: contact } = await supabase
                .from('contacts')
                .select('user_id')
                .eq('id', message.contact_id)
                .single();

              if (contact?.user_id === user.id) {
                await LeadStatusAutomation.triggerFromMessage(
                  message.contact_id,
                  contact.user_id,
                  message
                );
              }
            }
          }
        )
        .subscribe();

      // Listen for payments/revenue records
      const paymentSubscription = supabase
        .channel('payment_automation')
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'revenue_records'
          },
          async (payload) => {
            const payment = payload.new;
            if (payment.user_id === user.id) {
              // For revenue records, we need to link to a contact
              // This would normally come from the payment metadata
              const contactId = payment.metadata?.contact_id;
              if (contactId) {
                await LeadStatusAutomation.triggerFromPayment(
                  contactId,
                  payment.user_id,
                  payment
                );
              }
            }
          }
        )
        .subscribe();

      return () => {
        appointmentSubscription.unsubscribe();
        messageSubscription.unsubscribe();
        paymentSubscription.unsubscribe();
      };
    };

    const cleanup = setupAutomationTriggers();
    return cleanup;

  }, [user]);

  // Utility function to manually trigger lead actions
  const triggerLeadAction = async (
    actionType: 'appointment_booked' | 'email_reply' | 'sms_reply' | 'website_visit' | 'consultation_completed' | 'service_purchased' | 'payment_made',
    contactId: string,
    metadata?: Record<string, any>
  ) => {
    if (!user) return;
    
    await LeadStatusAutomation.processLeadAction({
      type: actionType,
      contactId,
      userId: user.id,
      metadata
    });
  };

  return {
    triggerLeadAction
  };
}