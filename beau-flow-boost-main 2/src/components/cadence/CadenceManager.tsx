import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Pause, 
  Settings, 
  MessageSquare, 
  Mail, 
  Phone,
  Clock,
  Users,
  TrendingUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CadenceRule {
  id: string;
  bucket: number;
  tag: string;
  step_number: number;
  channel: string;
  delay_hours: number;
  template_content: string;
  is_active: boolean;
}

interface CadenceStats {
  totalContacts: number;
  activeSequences: number;
  completedThisWeek: number;
  responseRate: number;
}

export default function CadenceManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rules, setRules] = useState<CadenceRule[]>([]);
  const [stats, setStats] = useState<CadenceStats>({
    totalContacts: 0,
    activeSequences: 0,
    completedThisWeek: 0,
    responseRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadCadenceData();
    }
  }, [user]);

  const loadCadenceData = async () => {
    try {
      // Load cadence rules
      const { data: rulesData, error: rulesError } = await supabase
        .from('cadence_rules')
        .select('*')
        .eq('user_id', user?.id)
        .order('bucket', { ascending: true })
        .order('step_number', { ascending: true });

      if (rulesError) {
        console.error('Error loading cadence rules:', rulesError);
      } else {
        setRules(rulesData || []);
      }

      // Load cadence statistics
      const { data: leadStatusData } = await supabase
        .from('lead_status')
        .select('*, contacts!inner(user_id)')
        .eq('contacts.user_id', user?.id);

      const activeSequences = leadStatusData?.filter(ls => ls.next_action_at && !ls.cadence_paused).length || 0;
      
      // Get completed sequences this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data: completedEvents } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user?.id)
        .eq('type', 'cadence_completed')
        .gte('created_at', weekAgo.toISOString());

      setStats({
        totalContacts: leadStatusData?.length || 0,
        activeSequences,
        completedThisWeek: completedEvents?.length || 0,
        responseRate: 0.15 // TODO: Calculate actual response rate
      });

    } catch (error) {
      console.error('Error loading cadence data:', error);
      toast({
        title: "Error",
        description: "Failed to load cadence data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('cadence_rules')
        .update({ is_active: !isActive })
        .eq('id', ruleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Cadence rule ${!isActive ? 'activated' : 'paused'}`
      });

      loadCadenceData();
    } catch (error) {
      console.error('Error toggling cadence rule:', error);
      toast({
        title: "Error",
        description: "Failed to update cadence rule",
        variant: "destructive"
      });
    }
  };

  const triggerCadenceScheduler = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cadence-scheduler`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ manual_trigger: true })
      });

      const result = await response.json();
      
      toast({
        title: "Success", 
        description: `Processed ${result.processed_count} cadence actions`
      });
      
      loadCadenceData();
    } catch (error) {
      console.error('Error triggering cadence scheduler:', error);
      toast({
        title: "Error",
        description: "Failed to trigger cadence scheduler",
        variant: "destructive"
      });
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'call': return <Phone className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getBucketName = (bucket: number) => {
    switch (bucket) {
      case 1: return 'Inbound Leads';
      case 2: return 'Never Answered';
      case 3: return 'Engaged';
      case 4: return 'Retargeting Disinterested';
      case 5: return 'Retention';
      default: return `Bucket ${bucket}`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const groupedRules = rules.reduce((acc, rule) => {
    const key = `${rule.bucket}-${rule.tag}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(rule);
    return acc;
  }, {} as Record<string, CadenceRule[]>);

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Contacts</p>
                <p className="text-2xl font-bold">{stats.totalContacts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Play className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Sequences</p>
                <p className="text-2xl font-bold">{stats.activeSequences}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Completed This Week</p>
                <p className="text-2xl font-bold">{stats.completedThisWeek}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Response Rate</p>
                <p className="text-2xl font-bold">{(stats.responseRate * 100).toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sequences" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="sequences">Active Sequences</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <Button onClick={triggerCadenceScheduler} variant="outline">
            <Play className="h-4 w-4 mr-2" />
            Run Scheduler
          </Button>
        </div>

        <TabsContent value="sequences" className="space-y-4">
          {Object.entries(groupedRules).map(([key, sequenceRules]) => {
            const [bucket, tag] = key.split('-');
            const isActive = sequenceRules.some(r => r.is_active);
            
            return (
              <Card key={key}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {getBucketName(parseInt(bucket))} - {tag.replace('_', ' ')}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {sequenceRules.length} steps configured
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={isActive ? "default" : "secondary"}>
                        {isActive ? 'Active' : 'Paused'}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleRule(sequenceRules[0].id, isActive)}
                      >
                        {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sequenceRules.map((rule, index) => (
                      <div key={rule.id} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                          <span className="text-sm font-medium">{rule.step_number}</span>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            {getChannelIcon(rule.channel)}
                            <Badge variant="outline" className="text-xs">
                              {rule.channel.toUpperCase()}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {rule.delay_hours}h delay
                            </span>
                          </div>
                          <p className="text-sm">{rule.template_content.substring(0, 100)}...</p>
                        </div>

                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Cadence Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Cadence settings will be available here for customizing templates, 
                timing, and communication preferences.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}