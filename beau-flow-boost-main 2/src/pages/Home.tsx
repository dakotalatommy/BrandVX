import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Calendar,
  MessageSquare,
  Bell,
  Settings,
  ArrowRight,
  Activity,
  Target,
  Zap
} from "lucide-react";

interface BusinessMetrics {
  timeSavedHours: number;
  revenueUplift: number;
  usageIndex: number;
  referrals: number;
  activeContacts: number;
  appointmentsToday: number;
  pendingMessages: number;
  automationRate: number;
}

interface RecentActivity {
  id: string;
  type: 'appointment' | 'message' | 'automation' | 'integration';
  title: string;
  subtitle: string;
  timestamp: Date;
  status: 'success' | 'pending' | 'error';
}

export default function Home() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Load user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      setProfile(profileData);

      // Load business metrics
      await loadBusinessMetrics();
      await loadRecentActivity();

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBusinessMetrics = async () => {
    try {
      // Get contact counts
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, status, created_at')
        .eq('user_id', user?.id);

      // Get appointment counts for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: todayAppointments } = await supabase
        .from('appointments')
        .select('id')
        .gte('start_ts', today.toISOString())
        .lt('start_ts', tomorrow.toISOString())
        .in('contact_id', contacts?.map(c => c.id) || []);

      // Get pending messages
      const { data: pendingMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('status', 'queued')
        .in('contact_id', contacts?.map(c => c.id) || []);

      // Get time analysis data
      const { data: timeAnalysis } = await supabase
        .from('time_analysis')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Calculate metrics
      const activeContacts = contacts?.filter(c => c.status !== 'dead').length || 0;
      const newContactsThisMonth = contacts?.filter(c => {
        const contactDate = new Date(c.created_at);
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return contactDate > monthAgo;
      }).length || 0;

      setMetrics({
        timeSavedHours: timeAnalysis?.current_hours_per_week ? 
          timeAnalysis.current_hours_per_week - timeAnalysis.projected_hours_per_week : 0,
        revenueUplift: timeAnalysis?.weekly_savings_dollars * 4 || 0,
        usageIndex: profile?.usage_index || 0,
        referrals: newContactsThisMonth,
        activeContacts,
        appointmentsToday: todayAppointments?.length || 0,
        pendingMessages: pendingMessages?.length || 0,
        automationRate: activeContacts > 0 ? Math.min(90, activeContacts * 5) : 0
      });

    } catch (error) {
      console.error('Error loading business metrics:', error);
    }
  };

  const loadRecentActivity = async () => {
    try {
      // Get recent events
      const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      const activities: RecentActivity[] = events?.map(event => ({
        id: event.id,
        type: event.type.includes('appointment') ? 'appointment' : 
              event.type.includes('message') ? 'message' :
              event.type.includes('automation') ? 'automation' : 'integration',
        title: formatEventTitle(event.type),
        subtitle: formatEventSubtitle(event),
        timestamp: new Date(event.created_at),
        status: 'success'
      })) || [];

      setRecentActivity(activities);

    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  const formatEventTitle = (eventType: string): string => {
    switch (eventType) {
      case 'onboarding_completed': return 'Onboarding Completed';
      case 'integration_connected': return 'Integration Connected';
      case 'appointment_booked': return 'Appointment Booked';
      case 'message_sent': return 'Message Sent';
      case 'automation_triggered': return 'Automation Triggered';
      default: return eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const formatEventSubtitle = (event: any): string => {
    const metadata = event.metadata || {};
    return metadata.description || `${event.source} activity`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'appointment': return Calendar;
      case 'message': return MessageSquare;
      case 'automation': return Zap;
      default: return Activity;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your business overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      <div className="container mx-auto p-6 space-y-8">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {profile?.business_name || 'Beauty Professional'}</h1>
            <p className="text-muted-foreground mt-2">
              Here's what's happening with your business today
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-beauty-blush/30">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-beauty-rose" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Time Saved</p>
                  <p className="text-2xl font-bold text-beauty-rose">
                    {metrics?.timeSavedHours || 0}h
                  </p>
                  <p className="text-xs text-muted-foreground">this week</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-beauty-blush/30">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Revenue Impact</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${metrics?.revenueUplift?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">monthly</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-beauty-blush/30">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Contacts</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {metrics?.activeContacts || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">in your CRM</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-beauty-blush/30">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Automation Rate</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {metrics?.automationRate || 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">of tasks automated</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="actions">Quick Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Today's Schedule */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Today's Schedule
                  </CardTitle>
                  <CardDescription>
                    {metrics?.appointmentsToday || 0} appointments scheduled
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {metrics?.appointmentsToday ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        You have {metrics.appointmentsToday} appointment{metrics.appointmentsToday !== 1 ? 's' : ''} today
                      </p>
                      <Button variant="outline" className="w-full">
                        <Calendar className="h-4 w-4 mr-2" />
                        View Full Schedule
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No appointments scheduled for today</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pending Messages */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Message Queue
                  </CardTitle>
                  <CardDescription>
                    {metrics?.pendingMessages || 0} messages ready to send
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {metrics?.pendingMessages ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {metrics.pendingMessages} automated message{metrics.pendingMessages !== 1 ? 's' : ''} in queue
                      </p>
                      <Button variant="outline" className="w-full">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Review Messages
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">All messages sent</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest updates from your business automation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity) => {
                      const IconComponent = getActivityIcon(activity.type);
                      return (
                        <div key={activity.id} className="flex items-center space-x-3 p-3 rounded-lg border">
                          <IconComponent className={`h-5 w-5 ${getStatusColor(activity.status)}`} />
                          <div className="flex-1">
                            <p className="font-medium">{activity.title}</p>
                            <p className="text-sm text-muted-foreground">{activity.subtitle}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {activity.timestamp.toLocaleDateString()}
                            </p>
                            <Badge variant={activity.status === 'success' ? 'default' : 'secondary'}>
                              {activity.status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6">
                      <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No recent activity</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Business Growth</CardTitle>
                  <CardDescription>Your key performance indicators</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">New Contacts This Month</span>
                      <span className="font-bold">{metrics?.referrals || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Automation Efficiency</span>
                      <span className="font-bold">{metrics?.automationRate || 0}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Time Savings</span>
                      <span className="font-bold">{metrics?.timeSavedHours || 0} hours/week</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Optimization Tips</CardTitle>
                  <CardDescription>Ways to improve your automation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-blue-50 border-l-4 border-blue-500">
                      <p className="text-sm font-medium">Connect more integrations</p>
                      <p className="text-xs text-muted-foreground">Add PostHog for better analytics</p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-50 border-l-4 border-green-500">
                      <p className="text-sm font-medium">Review cadence performance</p>
                      <p className="text-xs text-muted-foreground">Optimize message timing</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="actions" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                  <h3 className="font-medium mb-2">View Contacts</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Manage your customer relationships
                  </p>
                  <Button variant="outline" className="w-full">
                    Open Contacts
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <MessageSquare className="h-8 w-8 text-green-600 mx-auto mb-3" />
                  <h3 className="font-medium mb-2">Chat with Agent</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Get help from your AI assistant
                  </p>
                  <Button variant="outline" className="w-full">
                    Start Chat
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                  <h3 className="font-medium mb-2">View Analytics</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Detailed business insights
                  </p>
                  <Button variant="outline" className="w-full">
                    Open Dashboard
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}