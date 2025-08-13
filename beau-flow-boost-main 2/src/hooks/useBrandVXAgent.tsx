import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface AgentIntent {
  type: string;
  userId: string;
  contactId?: string;
  payload: any;
  hierarchyLevel: string;
  adminRole?: string;
}

interface AgentResponse {
  type: string;
  text: string;
  data?: any;
  nextActions?: string[];
  events?: any[];
  sovereigntyHash?: string;
  specialist?: string;
  recommendation?: string;
  actions?: string[];
  timeSavingMinutes?: number;
  priority?: string;
}

export const useBrandVXAgent = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<AgentResponse | null>(null);

  const processIntent = useCallback(async (
    intentType: string,
    payload: any,
    options: {
      contactId?: string;
      specialist?: string;
      temporalContext?: any;
    } = {}
  ): Promise<AgentResponse | null> => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to use AI agents",
        variant: "destructive",
      });
      return null;
    }

    setLoading(true);
    
    try {
      // For now, use default values until profile schema is updated
      const profile = {
        hierarchy_level: 'practitioner', // Default level
        admin_role: null
      };

      const intent: AgentIntent = {
        type: intentType,
        userId: user.id,
        contactId: options.contactId,
        payload,
        hierarchyLevel: profile?.hierarchy_level || 'viewer',
        adminRole: profile?.admin_role
      };

      let response: Response;

      if (options.specialist) {
        // Route to specialist
        response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brandvx-specialist-router`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            specialistType: options.specialist,
            intent,
            context: options.temporalContext || {},
            userId: user.id
          })
        });
      } else {
        // Route to master orchestrator
        response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/master-agent-orchestrator`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            intent,
            temporalContext: options.temporalContext || { timestamp: new Date().toISOString() }
          })
        });
      }

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Agent processing failed');
      }

      setLastResponse(result);

      // Show success toast for high-priority recommendations
      if (result.priority === 'high' && result.recommendation) {
        toast({
          title: "AI Recommendation",
          description: result.recommendation,
        });
      }

      return result;

    } catch (error) {
      console.error('BrandVX Agent error:', error);
      toast({
        title: "AI Agent Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const callSpecialist = useCallback(async (
    specialist: 'appointment_manager' | 'treatment_manager' | 'content_creator' | 'inventory_manager' | 'admin_revenue',
    intent: string,
    payload: any,
    context: any = {}
  ) => {
    return processIntent(intent, payload, { specialist, temporalContext: context });
  }, [processIntent]);

  const getSpecialistRecommendation = useCallback(async (
    specialist: string,
    queryType: string,
    data: any
  ) => {
    return callSpecialist(
      specialist as any,
      'get_recommendation',
      { queryType, data },
      { timestamp: new Date().toISOString() }
    );
  }, [callSpecialist]);

  return {
    processIntent,
    callSpecialist,
    getSpecialistRecommendation,
    loading,
    lastResponse
  };
};