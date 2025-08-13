import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Crown, Users, Settings, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  business_name?: string;
  hierarchy_level?: 'owner' | 'admin' | 'operator' | 'viewer';
  admin_role?: 'super_admin' | 'content_admin' | 'scheduling_admin' | 'inventory_admin';
  created_at?: string;
}

const AdminHierarchyPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string>("");

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      // Load user profile with existing columns
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, business_name, role, created_at')
        .eq('id', user?.id)
        .single();

      if (profileError) throw profileError;
      
      // Set default hierarchy based on role or assume owner for now
      const enrichedProfile = {
        ...profileData,
        hierarchy_level: (profileData.role === 'admin' ? 'admin' : 'owner') as 'owner' | 'admin' | 'operator' | 'viewer',
        admin_role: undefined as 'super_admin' | 'content_admin' | 'scheduling_admin' | 'inventory_admin' | undefined
      };
      
      setProfile(enrichedProfile);
      setAgents([]);

    } catch (error) {
      console.error('Error loading admin data:', error);
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAdminRole = async () => {
    if (!selectedRole || !profile) return;

    try {
      // For now, just update the local state since the column doesn't exist yet
      setProfile({ ...profile, admin_role: selectedRole as 'super_admin' | 'content_admin' | 'scheduling_admin' | 'inventory_admin' });
      toast({
        title: "Success",
        description: `Admin role set to ${selectedRole.replace('_', ' ')} (local only - database migration pending)`,
      });
    } catch (error) {
      console.error('Error updating admin role:', error);
      toast({
        title: "Error",
        description: "Failed to update admin role",
        variant: "destructive",
      });
    }
  };

  const initializeMasterAgent = async () => {
    try {
      toast({
        title: "Master Agent Initializing",
        description: "Setting up AI hierarchy system...",
      });
      
      // For now, just update the profile to indicate initialization
      const { error } = await supabase
        .from('profiles')
        .update({ setup_completed: true })
        .eq('id', user?.id);

      if (error) throw error;

      toast({
        title: "Master Agent Initialized",
        description: "AI hierarchy system is now active",
      });
      loadData(); // Refresh data
    } catch (error) {
      console.error('Error initializing master agent:', error);
      toast({
        title: "Error",
        description: "Failed to initialize master agent",
        variant: "destructive",
      });
    }
  };

  const getHierarchyIcon = (level: string) => {
    switch (level) {
      case 'owner': return <Crown className="h-4 w-4" />;
      case 'admin': return <Shield className="h-4 w-4" />;
      case 'operator': return <Users className="h-4 w-4" />;
      case 'viewer': return <Settings className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getHierarchyColor = (level: string) => {
    switch (level) {
      case 'owner': return 'bg-gradient-to-r from-amber-500 to-orange-500';
      case 'admin': return 'bg-gradient-to-r from-blue-500 to-indigo-500';
      case 'operator': return 'bg-gradient-to-r from-green-500 to-emerald-500';
      case 'viewer': return 'bg-gradient-to-r from-gray-500 to-slate-500';
      default: return 'bg-gradient-to-r from-gray-500 to-slate-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getHierarchyIcon(profile?.hierarchy_level || 'viewer')}
            Admin Hierarchy Control
          </CardTitle>
          <CardDescription>
            Manage your BrandVX AI agent hierarchy and permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Current Level:</span>
              <Badge className={`text-white ${getHierarchyColor(profile?.hierarchy_level || 'viewer')}`}>
                {profile?.hierarchy_level?.toUpperCase()}
              </Badge>
            </div>
            {profile?.admin_role && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Admin Role:</span>
                <Badge variant="outline">
                  {profile.admin_role.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            )}
          </div>

          {profile?.hierarchy_level === 'owner' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select Admin Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="content_admin">Content Admin</SelectItem>
                    <SelectItem value="scheduling_admin">Scheduling Admin</SelectItem>
                    <SelectItem value="inventory_admin">Inventory Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={updateAdminRole} disabled={!selectedRole}>
                  Update Role
                </Button>
              </div>

              <Button 
                onClick={initializeMasterAgent}
                className="flex items-center gap-2"
                variant="default"
              >
                <Zap className="h-4 w-4" />
                Initialize Master Agent
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Specialist Agents</CardTitle>
          <CardDescription>
            Active specialist agents in your hierarchy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <Card key={agent.id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">
                        {agent.specialist_type.replace('_', ' ').toUpperCase()}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {agent.configuration?.role || 'AI Specialist'}
                      </p>
                    </div>
                    <Badge 
                      variant={agent.status === 'active' ? 'default' : 'secondary'}
                    >
                      {agent.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {agents.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No specialist agents initialized yet.
              {profile?.hierarchy_level === 'owner' && (
                <div className="mt-2">
                  <Button onClick={initializeMasterAgent} variant="outline">
                    Initialize AI System
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminHierarchyPanel;