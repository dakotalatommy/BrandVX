import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  MessageSquare, 
  Calendar, 
  UserPlus, 
  BarChart3, 
  Settings,
  ArrowRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: any;
  action: () => void;
  badge?: string;
  variant?: 'default' | 'secondary' | 'outline';
}

const QuickActions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const handleAIAction = async (actionType: string) => {
    setLoading(prev => ({ ...prev, [actionType]: true }));
    
    try {
      // Route to master agent orchestrator
      const { data, error } = await supabase.functions.invoke('master-agent-orchestrator', {
        body: {
          action: actionType,
          user_id: user?.id,
          context: {
            timestamp: new Date().toISOString(),
            source: 'quick_actions'
          }
        }
      });

      if (error) throw error;

      toast({
        title: "AI Action Initiated",
        description: `${actionType} is being processed by our AI specialists.`,
      });
    } catch (error) {
      console.error('Error executing AI action:', error);
      toast({
        title: "Action Failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, [actionType]: false }));
    }
  };

  const quickActions: QuickAction[] = [
    {
      id: 'generate_content',
      title: 'Generate Content',
      description: 'Create AI-powered marketing content',
      icon: MessageSquare,
      action: () => handleAIAction('generate_content'),
      badge: 'AI',
      variant: 'default'
    },
    {
      id: 'schedule_campaign',
      title: 'Schedule Campaign',
      description: 'Set up automated email sequences',
      icon: Calendar,
      action: () => handleAIAction('schedule_campaign'),
      badge: 'Auto',
      variant: 'secondary'
    },
    {
      id: 'add_contact',
      title: 'Add Contact',
      description: 'Quickly add new contacts',
      icon: UserPlus,
      action: () => window.location.href = '/contacts',
      variant: 'outline'
    },
    {
      id: 'analyze_revenue',
      title: 'Revenue Analysis',
      description: 'Get AI insights on your revenue',
      icon: BarChart3,
      action: () => handleAIAction('analyze_revenue'),
      badge: 'Insights',
      variant: 'default'
    },
    {
      id: 'optimize_appointments',
      title: 'Optimize Schedule',
      description: 'AI-powered appointment optimization',
      icon: Settings,
      action: () => handleAIAction('optimize_appointments'),
      badge: 'Smart',
      variant: 'secondary'
    },
    {
      id: 'inventory_check',
      title: 'Inventory Alert',
      description: 'Check and reorder inventory items',
      icon: Zap,
      action: () => handleAIAction('inventory_check'),
      badge: 'Alert',
      variant: 'outline'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const isLoading = loading[action.id];
            
            return (
              <Button
                key={action.id}
                variant={action.variant}
                className="h-auto p-4 justify-start text-left"
                onClick={action.action}
                disabled={isLoading}
              >
                <div className="flex items-center gap-3 w-full">
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{action.title}</span>
                      {action.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {action.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {action.description}
                    </p>
                  </div>
                  {!isLoading && (
                    <ArrowRight className="h-4 w-4 flex-shrink-0 opacity-50" />
                  )}
                  {isLoading && (
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;