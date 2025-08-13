import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import IntegrationStep from "./IntegrationStep";
import { 
  Building, 
  Users, 
  Calendar, 
  MessageSquare, 
  Share2, 
  CheckCircle,
  Upload,
  Settings,
  Zap
} from "lucide-react";

interface OnboardingData {
  businessName: string;
  businessType: string;
  primaryGoal: string;
  monthlyRevenue: number;
  adminHoursPerWeek: number;
  biggestTimeWasters: string[];
  enableTimeTracker: boolean;
  enableSharePrompts: boolean;
  reminderSettings: {
    booking: boolean;
    followUp: boolean;
    appointment: boolean;
  };
}

const BUSINESS_TYPES = [
  "Hair Salon",
  "Lash Studio", 
  "Nail Salon",
  "Spa & Wellness",
  "Makeup Artist",
  "Beauty Consultant",
  "Other"
];

const TIME_WASTERS = [
  "Booking appointments",
  "Following up with leads",
  "Sending reminders", 
  "Creating social content",
  "Managing inventory",
  "Revenue tracking",
  "Client communication"
];

const PRIMARY_GOALS = [
  "Increase revenue",
  "Save time",
  "Improve client retention",
  "Automate follow-ups",
  "Better lead conversion",
  "Social media growth"
];

export default function OnboardingFlow() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    businessName: "",
    businessType: "",
    primaryGoal: "",
    monthlyRevenue: 0,
    adminHoursPerWeek: 0,
    biggestTimeWasters: [],
    enableTimeTracker: true,
    enableSharePrompts: true,
    reminderSettings: {
      booking: true,
      followUp: true,
      appointment: true
    }
  });

  const totalSteps = 7;
  const progress = (currentStep / totalSteps) * 100;

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const handleTimeWasterToggle = (timeWaster: string) => {
    const newWasters = data.biggestTimeWasters.includes(timeWaster)
      ? data.biggestTimeWasters.filter(w => w !== timeWaster)
      : [...data.biggestTimeWasters, timeWaster];
    updateData({ biggestTimeWasters: newWasters });
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeOnboarding = async () => {
    if (!user) {
      toast.error('User not found. Please sign in again.');
      return;
    }

    setLoading(true);
    try {
      console.log('Starting onboarding completion for user:', user.id);
      
      // Update user profile with onboarding data
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          business_name: data.businessName,
          business_type: data.businessType,
          primary_goal: data.primaryGoal,
          monthly_revenue: data.monthlyRevenue,
          admin_hours_per_week: data.adminHoursPerWeek,
          biggest_time_waster: data.biggestTimeWasters,
          setup_completed: true,
          time_saved_min: 0,
          usage_index: 0,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Profile update error:', error);
        throw error;
      }

      console.log('Profile updated successfully');

      // Log onboarding completion event
      const { error: eventError } = await supabase
        .from('events')
        .insert({
          user_id: user.id,
          type: 'onboarding_completed',
          source: 'dashboard',
          metadata: {
            business_type: data.businessType,
            primary_goal: data.primaryGoal,
            time_wasters: data.biggestTimeWasters
          },
          baseline_min: 30, // Baseline time for manual onboarding
          auto_min: 5 // Automated onboarding time
        });

      if (eventError) {
        console.error('Event logging error:', eventError);
        // Don't fail onboarding for event logging issues
      }

      toast.success('Onboarding completed! Welcome to BrandVX!');
      console.log('Onboarding completed, reloading page...');
      
      // Redirect to home page instead of dashboard
      setTimeout(() => {
        window.location.href = '/home';
      }, 1000);

    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      toast.error(`Failed to complete onboarding: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    const shareText = "🚀 Just launched with BrandVX — AI that runs my bookings, follow-ups and content creation. Ready to transform my beauty business!";
    
    if (navigator.share) {
      navigator.share({
        title: 'BrandVX Launch',
        text: shareText,
        url: window.location.origin
      });
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success('Share text copied to clipboard!');
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Tell us about your business
              </CardTitle>
              <CardDescription>
                Help us customize BrandVX for your specific needs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  value={data.businessName}
                  onChange={(e) => updateData({ businessName: e.target.value })}
                  placeholder="e.g., Bella's Beauty Studio"
                />
              </div>
              <div className="space-y-2">
                <Label>Business Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {BUSINESS_TYPES.map((type) => (
                    <Button
                      key={type}
                      variant={data.businessType === type ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateData({ businessType: type })}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                What's your primary goal?
              </CardTitle>
              <CardDescription>
                We'll optimize BrandVX to help you achieve this first
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                {PRIMARY_GOALS.map((goal) => (
                  <Button
                    key={goal}
                    variant={data.primaryGoal === goal ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => updateData({ primaryGoal: goal })}
                  >
                    {goal}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Current business metrics
              </CardTitle>
              <CardDescription>
                This helps us calculate your time savings and ROI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="revenue">Current Monthly Revenue ($)</Label>
                <Input
                  id="revenue"
                  type="number"
                  value={data.monthlyRevenue || ""}
                  onChange={(e) => updateData({ monthlyRevenue: parseInt(e.target.value) || 0 })}
                  placeholder="e.g., 15000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hours">Hours per week on admin tasks</Label>
                <Input
                  id="hours"
                  type="number"
                  value={data.adminHoursPerWeek || ""}
                  onChange={(e) => updateData({ adminHoursPerWeek: parseInt(e.target.value) || 0 })}
                  placeholder="e.g., 10"
                />
              </div>
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                What takes up most of your time?
              </CardTitle>
              <CardDescription>
                Select all that apply - we'll prioritize automating these first
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                {TIME_WASTERS.map((timeWaster) => (
                  <div key={timeWaster} className="flex items-center space-x-2">
                    <Checkbox
                      id={timeWaster}
                      checked={data.biggestTimeWasters.includes(timeWaster)}
                      onCheckedChange={() => handleTimeWasterToggle(timeWaster)}
                    />
                    <Label 
                      htmlFor={timeWaster}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {timeWaster}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 5:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Preferences & Settings
              </CardTitle>
              <CardDescription>
                Customize how BrandVX works for you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="timeTracker"
                    checked={data.enableTimeTracker}
                    onCheckedChange={(checked) => updateData({ enableTimeTracker: !!checked })}
                  />
                  <Label htmlFor="timeTracker">Show "Time Saved" widget to clients</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sharePrompts"
                    checked={data.enableSharePrompts}
                    onCheckedChange={(checked) => updateData({ enableSharePrompts: !!checked })}
                  />
                  <Label htmlFor="sharePrompts">Allow share prompts at key milestones</Label>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label className="text-base font-medium">Default Reminders</Label>
                <div className="space-y-2 pl-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="bookingReminder"
                      checked={data.reminderSettings.booking}
                      onCheckedChange={(checked) => 
                        updateData({ 
                          reminderSettings: { 
                            ...data.reminderSettings, 
                            booking: !!checked 
                          }
                        })
                      }
                    />
                    <Label htmlFor="bookingReminder">Booking confirmations</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="followUpReminder"
                      checked={data.reminderSettings.followUp}
                      onCheckedChange={(checked) => 
                        updateData({ 
                          reminderSettings: { 
                            ...data.reminderSettings, 
                            followUp: !!checked 
                          }
                        })
                      }
                    />
                    <Label htmlFor="followUpReminder">Follow-up sequences</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="appointmentReminder"
                      checked={data.reminderSettings.appointment}
                      onCheckedChange={(checked) => 
                        updateData({ 
                          reminderSettings: { 
                            ...data.reminderSettings, 
                            appointment: !!checked 
                          }
                        })
                      }
                    />
                    <Label htmlFor="appointmentReminder">Appointment reminders (7d/3d/1d/2h)</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 6:
        return (
          <IntegrationStep 
            userId={user?.id || ''} 
            onComplete={() => setCurrentStep(7)}
          />
        );

      case 7:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                You're all set!
              </CardTitle>
              <CardDescription>
                BrandVX is configured and ready to transform your business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="rounded-lg bg-green-50 p-4">
                  <h4 className="font-medium text-green-900">What happens next:</h4>
                  <ul className="mt-2 space-y-1 text-sm text-green-800">
                    <li>• Your connected tools are syncing data</li>
                    <li>• AI agent is analyzing your business patterns</li>
                    <li>• Automated cadences are being setup</li>
                    <li>• Real-time savings tracking begins now!</li>
                  </ul>
                </div>
                
                <div className="flex flex-col gap-3">
                  <Button 
                    onClick={handleShare}
                    variant="outline"
                    className="w-full"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share your BrandVX launch
                  </Button>
                  
                  <Button 
                    onClick={completeOnboarding}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? "Setting up..." : "Enter Dashboard"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Welcome to BrandVX</h1>
          <Badge variant="outline">
            Step {currentStep} of {totalSteps}
          </Badge>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {renderStep()}

      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          Previous
        </Button>
        
        {currentStep < totalSteps ? (
          <Button
            onClick={nextStep}
            disabled={
              (currentStep === 1 && (!data.businessName || !data.businessType)) ||
              (currentStep === 2 && !data.primaryGoal)
            }
          >
            Next
          </Button>
        ) : null}
      </div>
    </div>
  );
}