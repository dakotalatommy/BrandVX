import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Clock, DollarSign, Users, TrendingUp, Calendar, MessageSquare, Star, Share2 } from "lucide-react";
import { toast } from "sonner";
import { LeadStatusFlow } from "./dashboard/LeadStatusFlow";

interface DashboardMetrics {
  timeSavedHours: number;
  revenueUplift: number;
  usageIndex: number;
  referrals: number;
  contactCount: number;
  appointmentCount: number;
}

interface BucketStats {
  bucket: number;
  name: string;
  count: number;
  color: string;
}

interface AmbassadorCandidate {
  id: string;
  name: string;
  revenue: number;
  referrals: number;
  usageIndex: number;
}

export default function BrandVXDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    timeSavedHours: 0,
    revenueUplift: 0,
    usageIndex: 0,
    referrals: 0,
    contactCount: 0,
    appointmentCount: 0,
  });
  const [bucketStats, setBucketStats] = useState<BucketStats[]>([]);
  const [ambassadorCandidates, setAmbassadorCandidates] = useState<AmbassadorCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [readiness, setReadiness] = useState<{connected:boolean; first_sync_done:boolean; counts: Record<string, number>}>({connected:false, first_sync_done:false, counts:{}});
  const [queueItems, setQueueItems] = useState<Array<{contact_id:string; cadence_id:string; step_index:number; next_action_at:number}>>([]);

  const bucketNames = {
    1: "New Lead",
    2: "Never Answered", 
    3: "Retargeting",
    4: "Engaged",
    5: "Retention",
    6: "Loyalty",
    7: "Dead"
  };

  const bucketColors = {
    1: "bg-blue-100 text-blue-800",
    2: "bg-yellow-100 text-yellow-800",
    3: "bg-orange-100 text-orange-800",
    4: "bg-green-100 text-green-800", 
    5: "bg-purple-100 text-purple-800",
    6: "bg-pink-100 text-pink-800",
    7: "bg-gray-100 text-gray-800"
  };

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const H_API = import.meta.env.VITE_BACKEND_API_URL || "";

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Readiness banner from H
      if (H_API) {
        const r = await fetch(`${H_API}/onboarding/status?tenant_id=t1`, { headers: { "x-tenant-id": "t1" } });
        if (r.ok) {
          const j = await r.json();
          setReadiness(j);
        }
      }
      if (H_API) {
        const r3 = await fetch(`${H_API}/cadences/queue?tenant_id=t1&limit=50`, { headers: { "x-tenant-id": "t1" } });
        if (r3.ok) {
          const j3 = await r3.json();
          setQueueItems(j3.items || []);
        }
      }

      // Load user profile and metrics
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      // Load contacts count
      const { count: contactCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      // Load appointments count
      const { count: appointmentCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('contact_id', 'any'); // Will need to join properly

      // Buckets via H (preferred) else fallback to L counts
      let bucketCounts: BucketStats[] = [];
      if (H_API) {
        const r2 = await fetch(`${H_API}/buckets/distribution?tenant_id=t1`, { headers: { "x-tenant-id": "t1" } });
        if (r2.ok) {
          const j2 = await r2.json();
          bucketCounts = (j2.buckets || []).map((b: any) => ({
            bucket: b.bucket,
            name: bucketNames[b.bucket as keyof typeof bucketNames],
            count: b.count || 0,
            color: bucketColors[b.bucket as keyof typeof bucketColors]
          }));
        }
      }
      if (!bucketCounts.length) {
        const { data: bucketData } = await supabase
          .from('lead_status')
          .select(`bucket, contacts!inner(user_id)`) as any;
        bucketCounts = Array.from({ length: 7 }, (_, i) => ({
          bucket: i + 1,
          name: bucketNames[(i + 1) as keyof typeof bucketNames],
          count: (bucketData || []).filter((item: any) => item.bucket === i + 1).length || 0,
          color: bucketColors[(i + 1) as keyof typeof bucketColors]
        }));
      }

      // Load ambassador candidates (simplified)
      const { data: loyaltyData } = await supabase
        .from('loyalty_scores')
        .select(`
          *,
          contacts!inner(name, user_id)
        `)
        .eq('contacts.user_id', user?.id)
        .eq('ambassador_flag', true);

      const candidates = loyaltyData?.map(item => ({
        id: item.contact_id,
        name: item.contacts?.name || 'Unknown',
        revenue: 25000, // Would come from revenue calculations
        referrals: item.referrals,
        usageIndex: parseFloat(item.usage_index?.toString() || '0')
      })) || [];

      // Update metrics
      setMetrics({
        timeSavedHours: Math.floor((profile?.time_saved_min || 0) / 60),
        revenueUplift: profile?.monthly_revenue || 0,
        usageIndex: profile?.usage_index || 0,
        referrals: loyaltyData?.reduce((sum, item) => sum + item.referrals, 0) || 0,
        contactCount: contactCount || 0,
        appointmentCount: appointmentCount || 0,
      });

      setBucketStats(bucketCounts);
      setAmbassadorCandidates(candidates);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleShareMilestone = (milestone: string) => {
    // Create share prompt for key milestone
    const shareText = `🎉 Just hit a major milestone with BrandVX: ${milestone}! AI is transforming how I run my beauty business.`;
    
    if (navigator.share) {
      navigator.share({
        title: 'BrandVX Milestone',
        text: shareText,
        url: window.location.origin
      });
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success('Share text copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Readiness banner */}
      <div className="rounded-lg border p-4 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Data Readiness</h3>
            <p className="text-sm text-muted-foreground">{readiness.first_sync_done ? "Your integrations are connected and data is flowing." : "Connect accounts to start seeing live data."}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant={readiness.connected ? "default" : "secondary"}>{readiness.connected ? "Connected" : "Not Connected"}</Badge>
            <Badge variant={readiness.first_sync_done ? "default" : "secondary"}>{readiness.first_sync_done ? "First Sync Done" : "Awaiting Sync"}</Badge>
          </div>
        </div>
      </div>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">BrandVX Dashboard</h1>
          <p className="text-muted-foreground">
            Your beauty business automation at a glance
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => handleShareMilestone(`${metrics.timeSavedHours} hours saved`)}
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share Progress
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.timeSavedHours}h</div>
            <p className="text-xs text-muted-foreground">
              +12h from last week
            </p>
            <Progress value={75} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Uplift</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.revenueUplift.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +15% from baseline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usage Index</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.usageIndex}</div>
            <p className="text-xs text-muted-foreground">
              Moderate activity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.referrals}</div>
            <p className="text-xs text-muted-foreground">
              +2 this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lead Status Automation */}
      <LeadStatusFlow />

      {/* Main Content Tabs */}
      <Tabs defaultValue="funnel" className="space-y-4">
        <TabsList>
          <TabsTrigger value="funnel">Lead Funnel</TabsTrigger>
          <TabsTrigger value="ambassadors">Ambassador Candidates</TabsTrigger>
          <TabsTrigger value="cadences">Cadence Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="funnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Lead Distribution (7-Bucket System)
              </CardTitle>
              <CardDescription>
                Current contacts across the BrandVX lead lifecycle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {bucketStats.map((bucket) => (
                  <div key={bucket.bucket} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{bucket.name}</span>
                      <Badge className={bucket.color}>
                        {bucket.count}
                      </Badge>
                    </div>
                    <Progress 
                      value={(bucket.count / Math.max(metrics.contactCount, 1)) * 100} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ambassadors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Ambassador Candidates
              </CardTitle>
              <CardDescription>
                Clients meeting ambassador thresholds ($25k+ revenue, 5+ referrals, moderate usage)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ambassadorCandidates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No ambassador candidates yet</p>
                  <p className="text-sm">Keep growing to unlock this feature!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {ambassadorCandidates.map((candidate) => (
                    <div key={candidate.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div>
                        <h4 className="font-medium">{candidate.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          ${candidate.revenue.toLocaleString()}/mo • {candidate.referrals} referrals
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Contact
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cadences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Upcoming Cadence Actions
              </CardTitle>
              <CardDescription>
                Next 50 scheduled messages and follow-ups
              </CardDescription>
            </CardHeader>
            <CardContent>
              {queueItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Connect accounts to populate queue</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {queueItems.map((q) => (
                    <div key={`${q.contact_id}-${q.step_index}`} className="flex items-center justify-between p-3 rounded border">
                      <div>
                        <div className="text-sm font-medium">Contact: {q.contact_id}</div>
                        <div className="text-xs text-muted-foreground">Cadence: {q.cadence_id} • Step: {q.step_index + 1}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">Next: {q.next_action_at}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}