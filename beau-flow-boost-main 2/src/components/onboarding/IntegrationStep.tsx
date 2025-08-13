import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Square, Calendar, Users, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { SquareConnector } from "@/lib/integrations/SquareConnector";
import { AcuityConnector } from "@/lib/integrations/AcuityConnector";
import { HubSpotConnector } from "@/lib/integrations/HubSpotConnector";
import { DataComparator } from "@/lib/integrations/DataComparator";
import { AutoCRMSetup } from "@/lib/integrations/AutoCRMSetup";

interface IntegrationStepProps {
  userId: string;
  onComplete: () => void;
}

interface IntegrationStatus {
  square: 'pending' | 'connecting' | 'connected' | 'syncing' | 'error';
  acuity: 'pending' | 'connecting' | 'connected' | 'syncing' | 'error';
  hubspot: 'pending' | 'connecting' | 'connected' | 'syncing' | 'auto-setup' | 'error';
}

const IntegrationStep = ({ userId, onComplete }: IntegrationStepProps) => {
  const { toast } = useToast();
  const [status, setStatus] = useState<IntegrationStatus>({
    square: 'pending',
    acuity: 'pending',
    hubspot: 'pending'
  });
  const [syncProgress, setSyncProgress] = useState(0);

  const handleSquareConnect = async () => {
    setStatus(prev => ({ ...prev, square: 'connecting' }));
    
    try {
      const authUrl = SquareConnector.generateAuthUrl(userId);
      
      // Open OAuth popup
      const popup = window.open(authUrl, 'square-auth', 'width=600,height=600');
      
      // Listen for OAuth callback
      const handleMessage = async (event: MessageEvent) => {
        if (event.data.type === 'SQUARE_AUTH_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          popup?.close();
          
          setStatus(prev => ({ ...prev, square: 'syncing' }));
          
          // Exchange code for tokens and sync data
          const connector = new SquareConnector();
          await connector.exchangeCodeForTokens(event.data.code, userId);
          await connector.syncToDatabase(userId);
          
          setStatus(prev => ({ ...prev, square: 'connected' }));
          toast({
            title: "Square Connected",
            description: "Your Square data has been synced successfully.",
          });
        }
      };
      
      window.addEventListener('message', handleMessage);
      
    } catch (error) {
      setStatus(prev => ({ ...prev, square: 'error' }));
      toast({
        title: "Square Connection Failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    }
  };

  const handleAcuityConnect = async () => {
    setStatus(prev => ({ ...prev, acuity: 'connecting' }));
    
    try {
      const authUrl = AcuityConnector.generateAuthUrl(userId);
      
      const popup = window.open(authUrl, 'acuity-auth', 'width=600,height=600');
      
      const handleMessage = async (event: MessageEvent) => {
        if (event.data.type === 'ACUITY_AUTH_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          popup?.close();
          
          setStatus(prev => ({ ...prev, acuity: 'syncing' }));
          
          const connector = new AcuityConnector();
          await connector.exchangeCodeForTokens(event.data.code, userId);
          await connector.syncToDatabase(userId);
          
          setStatus(prev => ({ ...prev, acuity: 'connected' }));
          toast({
            title: "Acuity Connected",
            description: "Your appointment data has been synced successfully.",
          });
          
          // Check if we should auto-setup CRM
          await checkCRMSetup();
        }
      };
      
      window.addEventListener('message', handleMessage);
      
    } catch (error) {
      setStatus(prev => ({ ...prev, acuity: 'error' }));
      toast({
        title: "Acuity Connection Failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    }
  };

  const handleHubSpotConnect = async () => {
    setStatus(prev => ({ ...prev, hubspot: 'connecting' }));
    
    try {
      const authUrl = HubSpotConnector.generateAuthUrl(userId);
      
      const popup = window.open(authUrl, 'hubspot-auth', 'width=600,height=600');
      
      const handleMessage = async (event: MessageEvent) => {
        if (event.data.type === 'HUBSPOT_AUTH_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          popup?.close();
          
          setStatus(prev => ({ ...prev, hubspot: 'syncing' }));
          
          const connector = new HubSpotConnector();
          await connector.exchangeCodeForTokens(event.data.code, userId);
          await connector.syncToDatabase(userId);
          
          setStatus(prev => ({ ...prev, hubspot: 'connected' }));
          toast({
            title: "HubSpot Connected",
            description: "Your CRM data has been synced successfully.",
          });
        }
      };
      
      window.addEventListener('message', handleMessage);
      
    } catch (error) {
      setStatus(prev => ({ ...prev, hubspot: 'error' }));
      toast({
        title: "HubSpot Connection Failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    }
  };

  const checkCRMSetup = async () => {
    try {
      const autoSetup = new AutoCRMSetup();
      const needsCRM = await autoSetup.assessCRMNeeds(userId);
      
      if (needsCRM.shouldSetup && status.hubspot === 'pending') {
        setStatus(prev => ({ ...prev, hubspot: 'auto-setup' }));
        
        await autoSetup.setupHubSpotCRM(userId);
        
        setStatus(prev => ({ ...prev, hubspot: 'connected' }));
        toast({
          title: "CRM Auto-Setup Complete",
          description: "We've set up HubSpot CRM with your existing customer data.",
        });
      }
    } catch (error) {
      console.error('CRM auto-setup failed:', error);
    }
  };

  const getStatusIcon = (integrationStatus: string) => {
    switch (integrationStatus) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'connecting':
      case 'syncing':
      case 'auto-setup':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const isAllConnected = Object.values(status).every(s => s === 'connected');

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Connect Your Business Tools</h2>
        <p className="text-muted-foreground">
          Link your existing tools to unlock BrandVX's full potential
        </p>
      </div>

      <div className="grid gap-4">
        {/* Square POS Integration */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <Square className="h-8 w-8 mr-3" />
            <div className="flex-1">
              <CardTitle className="text-lg">Square POS</CardTitle>
              <CardDescription>Sync your transaction and customer data</CardDescription>
            </div>
            {getStatusIcon(status.square)}
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge variant={status.square === 'connected' ? 'default' : 'secondary'}>
                {status.square === 'connected' ? 'Connected' : 
                 status.square === 'syncing' ? 'Syncing...' :
                 status.square === 'connecting' ? 'Connecting...' :
                 status.square === 'error' ? 'Error' : 'Not Connected'}
              </Badge>
              <Button 
                onClick={handleSquareConnect}
                disabled={status.square === 'connecting' || status.square === 'syncing' || status.square === 'connected'}
                variant={status.square === 'connected' ? 'outline' : 'default'}
              >
                {status.square === 'connected' ? 'Connected' : 'Connect Square'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Acuity Scheduling Integration */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <Calendar className="h-8 w-8 mr-3" />
            <div className="flex-1">
              <CardTitle className="text-lg">Acuity Scheduling</CardTitle>
              <CardDescription>Import your appointment history and bookings</CardDescription>
            </div>
            {getStatusIcon(status.acuity)}
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge variant={status.acuity === 'connected' ? 'default' : 'secondary'}>
                {status.acuity === 'connected' ? 'Connected' : 
                 status.acuity === 'syncing' ? 'Syncing...' :
                 status.acuity === 'connecting' ? 'Connecting...' :
                 status.acuity === 'error' ? 'Error' : 'Not Connected'}
              </Badge>
              <Button 
                onClick={handleAcuityConnect}
                disabled={status.acuity === 'connecting' || status.acuity === 'syncing' || status.acuity === 'connected'}
                variant={status.acuity === 'connected' ? 'outline' : 'default'}
              >
                {status.acuity === 'connected' ? 'Connected' : 'Connect Acuity'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* HubSpot CRM Integration */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <Users className="h-8 w-8 mr-3" />
            <div className="flex-1">
              <CardTitle className="text-lg">HubSpot CRM</CardTitle>
              <CardDescription>
                {status.hubspot === 'auto-setup' ? 
                  'Auto-setting up based on your customer data...' :
                  'Manage your customer relationships and data'}
              </CardDescription>
            </div>
            {getStatusIcon(status.hubspot)}
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge variant={status.hubspot === 'connected' ? 'default' : 'secondary'}>
                {status.hubspot === 'connected' ? 'Connected' : 
                 status.hubspot === 'auto-setup' ? 'Auto-Setting Up...' :
                 status.hubspot === 'syncing' ? 'Syncing...' :
                 status.hubspot === 'connecting' ? 'Connecting...' :
                 status.hubspot === 'error' ? 'Error' : 'Not Connected'}
              </Badge>
              <Button 
                onClick={handleHubSpotConnect}
                disabled={status.hubspot === 'connecting' || status.hubspot === 'syncing' || status.hubspot === 'connected' || status.hubspot === 'auto-setup'}
                variant={status.hubspot === 'connected' ? 'outline' : 'default'}
              >
                {status.hubspot === 'connected' ? 'Connected' : 'Connect HubSpot'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {isAllConnected && (
        <div className="text-center pt-6">
          <Button onClick={onComplete} size="lg">
            Continue to Dashboard
          </Button>
        </div>
      )}
    </div>
  );
};

export default IntegrationStep;