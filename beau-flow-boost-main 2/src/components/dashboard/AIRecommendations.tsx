import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Lightbulb, 
  Clock, 
  Target, 
  Zap,
  Sparkles,
  TrendingUp,
  RefreshCw,
  CheckCircle,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";

interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  recommendation_type: string;
  priority: number;
  status: string;
  action_data: {
    timeToComplete: string;
    expectedImpact: string;
    actionSteps: string[];
    category: string;
  };
  created_at: string;
}

export function AIRecommendations() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (user) {
      loadRecommendations();
    }
  }, [user]);

  const loadRecommendations = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_recommendations')
        .select('*')
        .eq('user_id', user?.id)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Type cast the action_data field properly
      const typedRecommendations = (data || []).map(item => ({
        ...item,
        action_data: item.action_data as any // Handle JSON type from Supabase
      })) as AIRecommendation[];
      
      setRecommendations(typedRecommendations);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-recommendations', {
        body: { userId: user?.id }
      });

      if (error) throw error;

      toast.success("Fresh AI recommendations generated!");
      await loadRecommendations();
    } catch (error) {
      console.error('Error generating recommendations:', error);
      toast.error("Failed to generate recommendations");
    } finally {
      setGenerating(false);
    }
  };

  const markCompleted = async (recommendationId: string) => {
    try {
      const { error } = await supabase
        .from('ai_recommendations')
        .update({ status: 'completed' })
        .eq('id', recommendationId);

      if (error) throw error;

      toast.success("Recommendation marked as completed!");
      await loadRecommendations();
    } catch (error) {
      console.error('Error updating recommendation:', error);
      toast.error("Failed to update recommendation");
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return "bg-red-100 text-red-700 border-red-200";
    if (priority >= 5) return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-blue-100 text-blue-700 border-blue-200";
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 8) return "High Impact";
    if (priority >= 5) return "Medium Impact";
    return "Low Impact";
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      growth: TrendingUp,
      automation: Zap,
      optimization: Target,
      integration: ArrowRight
    };
    const Icon = icons[category as keyof typeof icons] || Lightbulb;
    return <Icon className="h-4 w-4" />;
  };

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
    <Card className="border-beauty-blush/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-beauty-rose" />
            <div>
              <CardTitle>AI Recommendations</CardTitle>
              <CardDescription>
                Personalized insights powered by GPT-5 intelligence
              </CardDescription>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={generateRecommendations}
            disabled={generating}
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-beauty-rose border-t-transparent mr-2" />
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <div className="text-center py-8">
            <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">
              No AI recommendations yet
            </p>
            <Button 
              onClick={generateRecommendations} 
              disabled={generating}
              className="bg-gradient-beauty hover:opacity-90"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Recommendations
                </>
              )}
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="active" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active">
                Active ({recommendations.filter(r => r.status !== 'completed').length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({recommendations.filter(r => r.status === 'completed').length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {recommendations.filter(r => r.status !== 'completed').map((rec) => (
                <div key={rec.id} className="p-4 rounded-lg border bg-gradient-soft">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(rec.action_data?.category || rec.recommendation_type)}
                      <h4 className="font-medium">{rec.title}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(rec.priority)} variant="outline">
                        {getPriorityLabel(rec.priority)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="mr-1 h-3 w-3" />
                        {rec.action_data?.timeToComplete || '15 min'}
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    {rec.description}
                  </p>
                  
                  <div className="bg-white/50 rounded p-3 mb-3">
                    <p className="text-xs font-medium text-beauty-rose mb-2">Expected Impact:</p>
                    <p className="text-sm">{rec.action_data?.expectedImpact || 'Improve business efficiency'}</p>
                  </div>
                  
                  {rec.action_data?.actionSteps && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium">Action Steps:</p>
                      <ol className="text-sm space-y-1">
                        {rec.action_data.actionSteps.map((step, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-beauty-rose font-medium text-xs mt-0.5">
                              {index + 1}.
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  
                  <div className="flex justify-end mt-4">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => markCompleted(rec.id)}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark Complete
                    </Button>
                  </div>
                </div>
              ))}
              
              {recommendations.filter(r => r.status !== 'completed').length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>All recommendations completed!</p>
                  <p className="text-sm">Generate fresh insights to keep growing.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {recommendations.filter(r => r.status === 'completed').map((rec) => (
                <div key={rec.id} className="p-4 rounded-lg border bg-green-50/50 opacity-75">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <h4 className="font-medium line-through">{rec.title}</h4>
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                      Completed
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {rec.description}
                  </p>
                </div>
              ))}
              
              {recommendations.filter(r => r.status === 'completed').length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No completed recommendations yet</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

export default AIRecommendations;