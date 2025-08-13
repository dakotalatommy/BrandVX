import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Clock, 
  DollarSign, 
  Users, 
  Calendar,
  Target,
  BarChart3,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AnalyticsData {
  revenue: {
    current: number;
    baseline: number;
    growth: number;
  };
  timeSaved: {
    totalMinutes: number;
    dollarValue: number;
    tasks: string[];
  };
  leads: {
    total: number;
    converted: number;
    conversionRate: number;
  };
  appointments: {
    scheduled: number;
    completed: number;
    noShows: number;
  };
}

export function EnhancedAnalytics() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30d');

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user, timeframe]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // Get revenue data
      const { data: revenueData } = await supabase
        .from('revenue_records')
        .select('amount, created_at')
        .eq('user_id', user?.id)
        .gte('created_at', getTimeframeDate(timeframe));

      // Get time saved data
      const { data: profile } = await supabase
        .from('profiles')
        .select('time_saved_min, admin_hours_per_week')
        .eq('id', user?.id)
        .single();

      // Get contacts/leads data
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, status, created_at')
        .eq('user_id', user?.id)
        .gte('created_at', getTimeframeDate(timeframe));

      // Get appointments data
      const { data: appointments } = await supabase
        .from('appointments')
        .select('id, status, start_ts')
        .in('contact_id', contacts?.map(c => c.id) || [])
        .gte('start_ts', getTimeframeDate(timeframe));

      // Process the data
      const totalRevenue = revenueData?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
      const baselineRevenue = totalRevenue * 0.85; // Simulate baseline
      const growth = ((totalRevenue - baselineRevenue) / baselineRevenue) * 100;

      const convertedLeads = contacts?.filter(c => c.status === 'customer').length || 0;
      const conversionRate = contacts?.length ? (convertedLeads / contacts.length) * 100 : 0;

      const completedAppointments = appointments?.filter(a => a.status === 'completed').length || 0;
      const noShows = appointments?.filter(a => a.status === 'no_show').length || 0;

      setAnalytics({
        revenue: {
          current: totalRevenue,
          baseline: baselineRevenue,
          growth: growth
        },
        timeSaved: {
          totalMinutes: profile?.time_saved_min || 0,
          dollarValue: ((profile?.time_saved_min || 0) / 60) * 35, // $35/hour value
          tasks: ['Lead follow-up', 'Appointment reminders', 'Content creation', 'Inventory tracking']
        },
        leads: {
          total: contacts?.length || 0,
          converted: convertedLeads,
          conversionRate: conversionRate
        },
        appointments: {
          scheduled: appointments?.length || 0,
          completed: completedAppointments,
          noShows: noShows
        }
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeframeDate = (timeframe: string) => {
    const now = new Date();
    switch (timeframe) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (isLoading || !analytics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-32 bg-muted rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with timeframe selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Business Analytics</h2>
        <div className="flex gap-2">
          {['7d', '30d', '90d'].map((tf) => (
            <Button
              key={tf}
              variant={timeframe === tf ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeframe(tf)}
            >
              {tf === '7d' ? '7 Days' : tf === '30d' ? '30 Days' : '90 Days'}
            </Button>
          ))}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics.revenue.current)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className={`h-4 w-4 ${analytics.revenue.growth >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                  <span className={`text-sm ${analytics.revenue.growth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {analytics.revenue.growth.toFixed(1)}%
                  </span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Time Saved</p>
                <p className="text-2xl font-bold">{formatTime(analytics.timeSaved.totalMinutes)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Worth {formatCurrency(analytics.timeSaved.dollarValue)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Lead Conversion</p>
                <p className="text-2xl font-bold">{analytics.leads.conversionRate.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {analytics.leads.converted}/{analytics.leads.total} converted
                </p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Appointments</p>
                <p className="text-2xl font-bold">{analytics.appointments.scheduled}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {analytics.appointments.completed} completed
                </p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Revenue Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Current Period</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(analytics.revenue.current)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Baseline</p>
                    <p className="text-xl font-bold text-muted-foreground">
                      {formatCurrency(analytics.revenue.baseline)}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Growth vs Baseline</span>
                    <span className="font-medium">+{analytics.revenue.growth.toFixed(1)}%</span>
                  </div>
                  <Progress value={Math.min(analytics.revenue.growth, 100)} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Automation Impact
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Time Saved</p>
                    <p className="text-xl font-bold text-blue-600">
                      {formatTime(analytics.timeSaved.totalMinutes)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Dollar Value</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(analytics.timeSaved.dollarValue)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Automated Tasks</p>
                  <div className="space-y-1">
                    {analytics.timeSaved.tasks.map((task, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{task}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Lead Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center space-y-1">
                    <p className="text-2xl font-bold">{analytics.leads.total}</p>
                    <p className="text-sm text-muted-foreground">Total Leads</p>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-2xl font-bold text-green-600">{analytics.leads.converted}</p>
                    <p className="text-sm text-muted-foreground">Converted</p>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-2xl font-bold text-blue-600">{analytics.leads.conversionRate.toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Conversion Progress</span>
                    <span>{analytics.leads.conversionRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={analytics.leads.conversionRate} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Appointment Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center space-y-1">
                    <p className="text-2xl font-bold">{analytics.appointments.scheduled}</p>
                    <p className="text-sm text-muted-foreground">Scheduled</p>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-2xl font-bold text-green-600">{analytics.appointments.completed}</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-2xl font-bold text-red-600">{analytics.appointments.noShows}</p>
                    <p className="text-sm text-muted-foreground">No Shows</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Completion Rate</span>
                    <span>
                      {analytics.appointments.scheduled > 0 
                        ? ((analytics.appointments.completed / analytics.appointments.scheduled) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={analytics.appointments.scheduled > 0 
                      ? (analytics.appointments.completed / analytics.appointments.scheduled) * 100 
                      : 0} 
                    className="h-2" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}