import { RealTimeAnalysis } from "./RealTimeAnalysis";

// Deprecated: Redirecting to RealTimeAnalysis component
// This component has been replaced with real data processing

interface TimeAnalysisData {
  current_hours_per_week: number;
  projected_hours_per_week: number;
  weekly_savings_dollars: number;
  analysis_data: {
    tasks_automated: string[];
    efficiency_gains: Record<string, number>;
    cost_breakdown: Record<string, number>;
  };
}

export function TimeAnalysis() {
  // Redirect to real implementation
  return <RealTimeAnalysis />;
}