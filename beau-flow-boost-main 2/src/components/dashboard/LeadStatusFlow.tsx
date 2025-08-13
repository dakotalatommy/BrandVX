import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  TrendingUp,
  ArrowRight,
  Clock,
  Target
} from "lucide-react";

interface StatusMetrics {
  leads: number;
  prospects: number;
  clients: number;
  total: number;
  conversion_rate: number;
  recent_transitions: Array<{
    id: string;
    contact_name: string;
    from_status: string;
    to_status: string;
    created_at: string;
    automated: boolean;
  }>;
}

export function LeadStatusFlow() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<StatusMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadStatusMetrics();
      
      // Set up real-time subscription for status changes
      const subscription = supabase
        .channel('status_changes')
        .on('postgres_changes', 
          { 
            event: 'UPDATE',
            schema: 'public',
            table: 'contacts',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            loadStatusMetrics(); // Reload when contacts change
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const loadStatusMetrics = async () => {
    try {
      // Get contact counts by status
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('status')
        .eq('user_id', user?.id);

      if (contactsError) throw contactsError;

      const statusCounts = contacts?.reduce((acc, contact) => {
        acc[contact.status] = (acc[contact.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const leads = statusCounts.lead || 0;
      const prospects = statusCounts.prospect || 0; 
      const clients = statusCounts.client || 0;
      const total = leads + prospects + clients;

      // Get recent status transitions from events
      const { data: transitions, error: transitionsError } = await supabase
        .from('events')
        .select(`
          id,
          created_at,
          metadata
        `)
        .eq('user_id', user?.id)
        .eq('type', 'status_change')
        .order('created_at', { ascending: false })
        .limit(5);

      if (transitionsError) throw transitionsError;

      // Get contact names for transitions
      const transitionsWithNames = await Promise.all(
        (transitions || []).map(async (transition) => {
          const metadata = transition.metadata as any;
          const contactId = metadata?.contact_id;
          const { data: contact } = await supabase
            .from('contacts')
            .select('name')
            .eq('id', contactId)
            .single();

          return {
            id: transition.id,
            contact_name: contact?.name || 'Unknown',
            from_status: metadata?.from_status || 'unknown',
            to_status: metadata?.to_status || 'unknown',
            created_at: transition.created_at,
            automated: metadata?.automated || false
          };
        })
      );

      const conversionRate = total > 0 ? Math.round((clients / total) * 100) : 0;

      setMetrics({
        leads,
        prospects,
        clients,
        total,
        conversion_rate: conversionRate,
        recent_transitions: transitionsWithNames
      });

    } catch (error) {
      console.error('Error loading status metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No status data available yet
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'lead': 'text-blue-600 bg-blue-100',
      'prospect': 'text-yellow-600 bg-yellow-100', 
      'client': 'text-green-600 bg-green-100'
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffMins < 1440) {
      return `${Math.floor(diffMins / 60)}h ago`;
    } else {
      return `${Math.floor(diffMins / 1440)}d ago`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Flow Overview */}
      <Card className="border-beauty-blush/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-beauty-rose" />
            Lead Status Automation
          </CardTitle>
          <CardDescription>
            Real-time lead progression and conversion tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Status Pipeline */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 rounded-full p-2">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Leads</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.leads}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-center">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="bg-yellow-100 rounded-full p-2">
                <UserPlus className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Prospects</p>
                <p className="text-2xl font-bold text-yellow-600">{metrics.prospects}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-center">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>

          {/* Conversion Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Conversion Rate</span>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                  {metrics.conversion_rate}%
                </Badge>
              </div>
              <Progress value={metrics.conversion_rate} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <UserCheck className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Clients</p>
                  <p className="text-2xl font-bold text-green-600">{metrics.clients}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transitions */}
      <Card className="border-beauty-blush/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-beauty-rose" />
            Recent Status Changes
          </CardTitle>
          <CardDescription>
            Automated lead progression activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.recent_transitions.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No recent status changes
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.recent_transitions.map((transition) => (
                <div key={transition.id} className="flex items-center justify-between p-3 bg-gradient-soft rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="bg-beauty-blush/20 rounded-full p-1">
                      <Target className="h-4 w-4 text-beauty-rose" />
                    </div>
                    <div>
                      <p className="font-medium">{transition.contact_name}</p>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Badge className={getStatusColor(transition.from_status)} variant="outline">
                          {transition.from_status}
                        </Badge>
                        <ArrowRight className="h-3 w-3" />
                        <Badge className={getStatusColor(transition.to_status)} variant="outline">
                          {transition.to_status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                      {formatTimeAgo(transition.created_at)}
                    </div>
                    {transition.automated && (
                      <Badge variant="outline" className="text-xs border-beauty-blush text-beauty-rose">
                        Auto
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}