import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles } from 'lucide-react';

interface BusinessSurveyProps {
  userId: string;
  onComplete: () => void;
  existingProfile: any;
}

export function BusinessSurvey({ userId, onComplete, existingProfile }: BusinessSurveyProps) {
  const [loading, setLoading] = useState(false);
  const [businessType, setBusinessType] = useState(existingProfile?.business_type || '');
  const [monthlyRevenue, setMonthlyRevenue] = useState(existingProfile?.monthly_revenue || 25000);
  const [adminHours, setAdminHours] = useState(existingProfile?.admin_hours_per_week || 15);
  const [timeWasters, setTimeWasters] = useState<string[]>(existingProfile?.biggest_time_waster || []);
  const [primaryGoal, setPrimaryGoal] = useState(existingProfile?.primary_goal || '');

  const { toast } = useToast();

  const handleTimeWasterChange = (waster: string, checked: boolean) => {
    if (checked) {
      setTimeWasters([...timeWasters, waster]);
    } else {
      setTimeWasters(timeWasters.filter(w => w !== waster));
    }
  };

  const handleSubmit = async () => {
    if (!businessType || !primaryGoal) {
      toast({
        title: "Please complete all fields",
        description: "Business type and primary goal are required.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const profileData = {
        id: userId,
        business_type: businessType,
        monthly_revenue: monthlyRevenue,
        admin_hours_per_week: adminHours,
        biggest_time_waster: timeWasters,
        primary_goal: primaryGoal,
        setup_completed: false,
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(profileData);

      if (error) throw error;

      toast({
        title: "Survey completed!",
        description: "Let's connect your accounts to analyze your time savings.",
      });

      onComplete();
    } catch (error: any) {
      toast({
        title: "Error saving survey",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-beauty border-beauty-blush/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-beauty-rose" />
          Tell Us About Your Business
        </CardTitle>
        <CardDescription>
          This helps us calculate your personalized time savings (2 minutes)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Business Type */}
        <div className="space-y-2">
          <Label>What type of beauty business do you run?</Label>
          <Select value={businessType} onValueChange={setBusinessType}>
            <SelectTrigger>
              <SelectValue placeholder="Select your business type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hair-salon">Hair Salon</SelectItem>
              <SelectItem value="nail-salon">Nail Salon</SelectItem>
              <SelectItem value="medical-spa">Medical Spa</SelectItem>
              <SelectItem value="lash-studio">Lash Studio</SelectItem>
              <SelectItem value="esthetics">Esthetics</SelectItem>
              <SelectItem value="mobile-services">Mobile Services</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Monthly Revenue */}
        <div className="space-y-3">
          <Label>What's your approximate monthly revenue?</Label>
          <div className="px-4">
            <Slider
              value={[monthlyRevenue]}
              onValueChange={(value) => setMonthlyRevenue(value[0])}
              max={100000}
              min={10000}
              step={5000}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground mt-2">
              <span>$10k</span>
              <span className="font-medium text-beauty-rose">
                ${monthlyRevenue.toLocaleString()}
              </span>
              <span>$100k+</span>
            </div>
          </div>
        </div>

        {/* Admin Hours */}
        <div className="space-y-3">
          <Label>How many hours per week do you spend on admin/social media?</Label>
          <div className="px-4">
            <Slider
              value={[adminHours]}
              onValueChange={(value) => setAdminHours(value[0])}
              max={40}
              min={5}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground mt-2">
              <span>5 hours</span>
              <span className="font-medium text-beauty-rose">
                {adminHours} hours
              </span>
              <span>40+ hours</span>
            </div>
          </div>
        </div>

        {/* Time Wasters */}
        <div className="space-y-3">
          <Label>What are your biggest time wasters? (Check all that apply)</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              'Social media posting',
              'Client communication',
              'Booking management',
              'Inventory tracking',
              'Marketing campaigns'
            ].map((waster) => (
              <div key={waster} className="flex items-center space-x-2">
                <Checkbox
                  id={waster}
                  checked={timeWasters.includes(waster)}
                  onCheckedChange={(checked) => handleTimeWasterChange(waster, checked as boolean)}
                />
                <Label htmlFor={waster} className="text-sm">{waster}</Label>
              </div>
            ))}
          </div>
        </div>

        {/* Primary Goal */}
        <div className="space-y-3">
          <Label>What's your primary goal?</Label>
          <RadioGroup value={primaryGoal} onValueChange={setPrimaryGoal}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { value: 'save-time', label: 'Save time' },
                { value: 'make-money', label: 'Make more money' },
                { value: 'get-organized', label: 'Get organized' },
                { value: 'grow-social', label: 'Grow social media' }
              ].map((goal) => (
                <div key={goal.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={goal.value} id={goal.value} />
                  <Label htmlFor={goal.value} className="text-sm">{goal.label}</Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>

        <Button 
          onClick={handleSubmit} 
          className="w-full bg-gradient-beauty hover:opacity-90 transition-opacity"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Continue to Account Connections
        </Button>
      </CardContent>
    </Card>
  );
}