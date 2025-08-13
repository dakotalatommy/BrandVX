import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { DataComparator } from "@/lib/integrations/DataComparator";
import IntegrationStep from "@/components/onboarding/IntegrationStep";
import { Square, Calendar, Users, RefreshCw, TrendingUp, AlertTriangle } from "lucide-react";

interface ComparisonResult {
  accuracy: number;
  discrepancies: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  recommendations: string[];
}

const Integrations = () => {
  const { user } = useAuth();
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (user) {
      loadConnectedAccounts();
    }
  }, [user]);

  const loadConnectedAccounts = async () => {
    try {
      const { data } = await supabase
        .from('connected_accounts')
        .select('*')
        .eq('user_id', user?.id);
      
      setConnectedAccounts(data || []);
    } catch (error) {
      console.error('Error loading connected accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const runDataComparison = async () => {
    if (!user?.id) return;
    
    setSyncing(true);
    try {
      const comparator = new DataComparator();
      const results = await comparator.compareData(user.id);
      setComparisonResults(results);
    } catch (error) {
      console.error('Data comparison failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  const getIntegrationStatus = (platform: string) => {
    return connectedAccounts.find(acc => acc.platform === platform);
  };

  const isConnected = (platform: string) => {
    return !!getIntegrationStatus(platform);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading integrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Integrations</h1>
          <p className="text-muted-foreground">
            Manage your connected business tools and data synchronization
          </p>
        </div>

        <Tabs defaultValue="connections" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="connections">Connections</TabsTrigger>
            <TabsTrigger value="data-sync">Data Sync</TabsTrigger>
            <TabsTrigger value="setup">Setup New</TabsTrigger>
          </TabsList>

          <TabsContent value="connections" className="space-y-4">
            <div className="grid gap-4">
              {/* Square Integration Status */}
              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <Square className="h-8 w-8 mr-3" />
                  <div className="flex-1">
                    <CardTitle className="text-lg">Square POS</CardTitle>
                    <CardDescription>Point of sale and payment processing</CardDescription>
                  </div>
                  <Badge variant={isConnected('square') ? 'default' : 'secondary'}>
                    {isConnected('square') ? 'Connected' : 'Not Connected'}
                  </Badge>
                </CardHeader>
                <CardContent>
                  {isConnected('square') && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Last sync: {getIntegrationStatus('square')?.connected_at ? 
                          new Date(getIntegrationStatus('square').connected_at).toLocaleDateString() : 'Never'}
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Sync Now
                        </Button>
                        <Button size="sm" variant="outline">
                          Configure
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Acuity Integration Status */}
              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <Calendar className="h-8 w-8 mr-3" />
                  <div className="flex-1">
                    <CardTitle className="text-lg">Acuity Scheduling</CardTitle>
                    <CardDescription>Appointment scheduling and management</CardDescription>
                  </div>
                  <Badge variant={isConnected('acuity') ? 'default' : 'secondary'}>
                    {isConnected('acuity') ? 'Connected' : 'Not Connected'}
                  </Badge>
                </CardHeader>
                <CardContent>
                  {isConnected('acuity') && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Last sync: {getIntegrationStatus('acuity')?.connected_at ? 
                          new Date(getIntegrationStatus('acuity').connected_at).toLocaleDateString() : 'Never'}
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Sync Now
                        </Button>
                        <Button size="sm" variant="outline">
                          Configure
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* HubSpot Integration Status */}
              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <Users className="h-8 w-8 mr-3" />
                  <div className="flex-1">
                    <CardTitle className="text-lg">HubSpot CRM</CardTitle>
                    <CardDescription>Customer relationship management</CardDescription>
                  </div>
                  <Badge variant={isConnected('hubspot') ? 'default' : 'secondary'}>
                    {isConnected('hubspot') ? 'Connected' : 'Not Connected'}
                  </Badge>
                </CardHeader>
                <CardContent>
                  {isConnected('hubspot') && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Last sync: {getIntegrationStatus('hubspot')?.connected_at ? 
                          new Date(getIntegrationStatus('hubspot').connected_at).toLocaleDateString() : 'Never'}
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Sync Now
                        </Button>
                        <Button size="sm" variant="outline">
                          Configure
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="data-sync" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Data Accuracy Analysis
                </CardTitle>
                <CardDescription>
                  Compare data across your connected platforms to ensure accuracy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={runDataComparison}
                  disabled={syncing}
                  className="w-full"
                >
                  {syncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing Data...
                    </>
                  ) : (
                    'Run Data Comparison'
                  )}
                </Button>

                {comparisonResults && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Data Accuracy</span>
                      <span className="text-sm text-muted-foreground">
                        {comparisonResults.accuracy}%
                      </span>
                    </div>
                    <Progress value={comparisonResults.accuracy} className="w-full" />

                    {comparisonResults.discrepancies.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
                          Data Discrepancies Found
                        </h4>
                        {comparisonResults.discrepancies.map((discrepancy, index) => (
                          <div key={index} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{discrepancy.type}</span>
                              <Badge variant={
                                discrepancy.severity === 'high' ? 'destructive' :
                                discrepancy.severity === 'medium' ? 'default' : 'secondary'
                              }>
                                {discrepancy.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {discrepancy.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {comparisonResults.recommendations.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Recommendations</h4>
                        <ul className="space-y-1">
                          {comparisonResults.recommendations.map((rec, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-start">
                              <span className="mr-2">•</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="setup">
            <Card>
              <CardHeader>
                <CardTitle>Connect New Integration</CardTitle>
                <CardDescription>
                  Add new business tools to your BrandVX workspace
                </CardDescription>
              </CardHeader>
              <CardContent>
                <IntegrationStep 
                  userId={user?.id || ''} 
                  onComplete={() => {
                    loadConnectedAccounts();
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Integrations;