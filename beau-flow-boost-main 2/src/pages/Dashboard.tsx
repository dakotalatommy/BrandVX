import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BrandVXDashboard from "@/components/BrandVXDashboard";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";

const Dashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        // If no profile exists, create one
        if (error.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user?.id,
              setup_completed: false,
              time_saved_min: 0,
              usage_index: 0
            });
          
          if (insertError) {
            console.error('Error creating profile:', insertError);
          } else {
            setProfile({ setup_completed: false });
          }
        }
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your BrandVX dashboard...</p>
        </div>
      </div>
    );
  }

  // Show onboarding if user hasn't completed setup
  if (!profile?.setup_completed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <OnboardingFlow />
      </div>
    );
  }

  // Show main dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <BrandVXDashboard />
    </div>
  );
};

export default Dashboard;