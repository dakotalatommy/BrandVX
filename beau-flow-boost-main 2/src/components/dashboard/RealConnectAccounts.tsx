import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle, 
  ExternalLink, 
  AlertCircle,
  Calendar,
  Mail,
  CreditCard,
  MessageSquare,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

interface ConnectedAccount {
  id: string;
  platform: string;
  account_label: string;
  connected_at: string;
  status?: string;
  account_data?: any;
}

const INTEGRATIONS = [
  {
    id: 'hubspot',
    name: 'HubSpot CRM',
    description: 'Sync leads, contacts, and deals',
    icon: ExternalLink,
    color: 'text-orange-600',
    required: true,
    category: 'CRM',
    oauthFunction: 'hubspot-oauth'
  },
  {
    id: 'acuity',
    name: 'Acuity Scheduling',
    description: 'Sync appointments and bookings',
    icon: Calendar,
    color: 'text-blue-600',
    required: true,
    category: 'Booking',
    oauthFunction: 'acuity-oauth'
  },
  {
    id: 'square',
    name: 'Square POS',
    description: 'Sync payments and inventory',
    icon: CreditCard,
    color: 'text-green-600',
    required: true,
    category: 'POS',
    oauthFunction: 'square-oauth'
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    description: 'Email automation and delivery',
    icon: Mail,
    color: 'text-blue-500',
    required: false,
    category: 'Email',
    oauthFunction: 'sendgrid-oauth'
  },
  {
    id: 'twilio',
    name: 'Twilio SMS',
    description: 'SMS messaging and automation',
    icon: MessageSquare,
    color: 'text-red-600',
    required: false,
    category: 'SMS',
    oauthFunction: 'twilio-oauth'
  }
];

export function RealConnectAccounts() {
  const { user } = useAuth();
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadConnectedAccounts();
    }
  }, [user]);

  const loadConnectedAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('connected_accounts')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;
      setConnectedAccounts(data || []);
    } catch (error) {
      toast.error("Failed to load connected accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleRealConnect = async (integrationId: string) => {
    const integration = INTEGRATIONS.find(i => i.id === integrationId);
    if (!integration) return;

    setConnecting(integrationId);
    
    try {
      // Generate OAuth URL using edge function
      const { data, error } = await supabase.functions.invoke(integration.oauthFunction, {
        body: {
          action: 'generate_auth_url',
          user_id: user?.id,
          redirect_uri: `${window.location.origin}/oauth/callback`
        }
      });

      if (error) throw error;

      if (data?.auth_url) {
        // Open OAuth popup
        const popup = window.open(
          data.auth_url,
          'oauth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        // Listen for OAuth completion
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            
            // Check if connection was successful
            setTimeout(async () => {
              await loadConnectedAccounts();
              const connected = await checkConnectionStatus(integrationId);
              if (connected) {
                toast.success(`${integration.name} connected successfully!`);
                
                // Start data sync
                await initiateDataSync(integrationId);
              } else {
                toast.error("Connection was not completed");
              }
              setConnecting(null);
            }, 1000);
          }
        }, 1000);

        // Handle popup blocked
        if (!popup) {
          throw new Error('Popup was blocked. Please allow popups and try again.');
        }
      } else {
        throw new Error('Failed to generate OAuth URL');
      }

    } catch (error) {
      toast.error(`Failed to connect ${integration.name}: ${error.message}`);
      setConnecting(null);
    }
  };

  const checkConnectionStatus = async (integrationId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('connected_accounts')
        .select('id')
        .eq('user_id', user?.id)
        .eq('platform', integrationId)
        .maybeSingle();

      return !error && !!data;
    } catch {
      return false;
    }
  };

  const initiateDataSync = async (integrationId: string) => {
    setSyncing(integrationId);
    
    try {
      // Start background data sync via edge function
      const syncFunction = `${integrationId}-data-sync`;
      const { error } = await supabase.functions.invoke(syncFunction, {
        body: {
          action: 'sync_data',
          user_id: user?.id
        }
      });

      if (error) {
        toast.warning(`Connected successfully, but initial sync failed. Data will sync automatically.`);
      } else {
        toast.success(`Data sync initiated for ${integrationId}`);
      }
    } catch (error) {
      toast.warning('Connected successfully, data sync will happen automatically');
    } finally {
      setSyncing(null);
    }
  };

  const handleRefreshData = async (integrationId: string) => {
    setSyncing(integrationId);
    
    try {
      const syncFunction = `${integrationId}-data-sync`;
      const { error } = await supabase.functions.invoke(syncFunction, {
        body: {
          action: 'refresh_data',
          user_id: user?.id
        }
      });

      if (error) throw error;
      
      toast.success(`Data refreshed for ${integrationId}`);
    } catch (error) {
      toast.error(`Failed to refresh ${integrationId} data`);
    } finally {
      setSyncing(null);
    }
  };

  const isConnected = (integrationId: string) => {
    return connectedAccounts.some(account => account.platform === integrationId);
  };

  const getAccountInfo = (integrationId: string) => {
    return connectedAccounts.find(account => account.platform === integrationId);
  };

  const requiredIntegrations = INTEGRATIONS.filter(i => i.required);
  const optionalIntegrations = INTEGRATIONS.filter(i => !i.required);
  const connectedRequired = requiredIntegrations.filter(i => isConnected(i.id)).length;
  const setupProgress = (connectedRequired / requiredIntegrations.length) * 100;

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

  return (
    <div className="space-y-6">
      {/* Setup Progress */}
      <Card className="border-beauty-blush/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-beauty-rose" />
            Real Account Connections
          </CardTitle>
          <CardDescription>
            Connect your actual business tools for real-time automation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Setup Progress</span>
              <span className="text-sm text-muted-foreground">
                {connectedRequired}/{requiredIntegrations.length} required connections
              </span>
            </div>
            <Progress value={setupProgress} className="h-2" />
            
            {setupProgress === 100 && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">All required integrations connected!</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Required Integrations */}
      <Card className="border-beauty-blush/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            Required Integrations
          </CardTitle>
          <CardDescription>
            Connect these essential business tools for full automation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {requiredIntegrations.map((integration) => {
              const connected = isConnected(integration.id);
              const accountInfo = getAccountInfo(integration.id);
              const isConnectingThis = connecting === integration.id;
              const isSyncingThis = syncing === integration.id;
              
              return (
                <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <integration.icon className={`h-6 w-6 ${integration.color}`} />
                    <div>
                      <h4 className="font-medium">{integration.name}</h4>
                      <p className="text-sm text-muted-foreground">{integration.description}</p>
                      {connected && accountInfo && (
                        <p className="text-xs text-muted-foreground">
                          Connected {new Date(accountInfo.connected_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant={connected ? "default" : "secondary"} className="text-xs">
                      {integration.category}
                    </Badge>
                    
                    {connected ? (
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => handleRefreshData(integration.id)}
                          disabled={isSyncingThis}
                          className="border-beauty-rose text-beauty-rose hover:bg-beauty-blush/10"
                        >
                          {isSyncingThis ? (
                            <>
                              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Refresh
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        size="sm"
                        onClick={() => handleRealConnect(integration.id)}
                        disabled={isConnectingThis}
                        className="bg-gradient-beauty hover:opacity-90"
                      >
                        {isConnectingThis ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-2" />
                            Connecting...
                          </>
                        ) : (
                          'Connect'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Optional Integrations */}
      <Card className="border-beauty-blush/30">
        <CardHeader>
          <CardTitle>Optional Integrations</CardTitle>
          <CardDescription>
            Enhance your automation with these additional real connections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {optionalIntegrations.map((integration) => {
              const connected = isConnected(integration.id);
              const accountInfo = getAccountInfo(integration.id);
              const isConnectingThis = connecting === integration.id;
              const isSyncingThis = syncing === integration.id;
              
              return (
                <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <integration.icon className={`h-6 w-6 ${integration.color}`} />
                    <div>
                      <h4 className="font-medium">{integration.name}</h4>
                      <p className="text-sm text-muted-foreground">{integration.description}</p>
                      {connected && accountInfo && (
                        <p className="text-xs text-muted-foreground">
                          Connected {new Date(accountInfo.connected_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {integration.category}
                    </Badge>
                    
                    {connected ? (
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => handleRefreshData(integration.id)}
                          disabled={isSyncingThis}
                          className="border-beauty-rose text-beauty-rose hover:bg-beauty-blush/10"
                        >
                          {isSyncingThis ? (
                            <>
                              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Refresh
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => handleRealConnect(integration.id)}
                        disabled={isConnectingThis}
                        className="border-beauty-rose text-beauty-rose hover:bg-beauty-blush/10"
                      >
                        {isConnectingThis ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-beauty-rose border-t-transparent mr-2" />
                            Connecting...
                          </>
                        ) : (
                          'Connect'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}