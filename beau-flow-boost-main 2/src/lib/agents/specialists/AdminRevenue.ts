import { supabase } from "@/integrations/supabase/client";
import type { BrandVXIntent, AgentResponse } from "../BrandVXAgent";

/**
 * Admin/Revenue Specialist
 * Handles snapshots, attribution, time saved calculations, and ROI analysis
 */
export class AdminRevenue {
  
  async handleAdmin(intent: BrandVXIntent, context: any): Promise<AgentResponse> {
    const { payload } = intent;
    const action = payload.action || 'revenue_snapshot';

    switch (action) {
      case 'revenue_snapshot':
        return await this.generateRevenueSnapshot(intent, context);
      case 'time_saved_analysis':
        return await this.calculateTimeSaved(intent, context);
      case 'roi_calculation':
        return await this.calculateROI(intent, context);
      case 'funnel_analysis':
        return await this.analyzeFunnel(intent, context);
      case 'ambassador_analysis':
        return await this.analyzeAmbassadors(intent, context);
      default:
        return {
          type: 'error',
          text: 'Please specify what kind of analysis you\'d like: revenue snapshot, time saved, ROI, or funnel analysis.',
          data: { unknown_action: action }
        };
    }
  }

  private async generateRevenueSnapshot(intent: BrandVXIntent, context: any): Promise<AgentResponse> {
    const { userId } = intent;
    const { period = 'monthly' } = intent.payload;

    // Get baseline and current revenue data
    const baseline = await this.getBaselineRevenue(userId);
    const current = await this.getCurrentRevenue(userId, period);
    const uplift = current.total - baseline.total;
    const upliftPercentage = baseline.total > 0 ? (uplift / baseline.total) * 100 : 0;

    // Calculate attribution to BrandVX features
    const attribution = await this.calculateBrandVXAttribution(userId, period);

    const snapshot = {
      period,
      baseline_revenue: baseline.total,
      current_revenue: current.total,
      revenue_uplift: uplift,
      uplift_percentage: Math.round(upliftPercentage * 100) / 100,
      brandvx_attribution: attribution,
      breakdown: {
        baseline: baseline.breakdown,
        current: current.breakdown
      }
    };

    return {
      type: 'result',
      text: `Revenue analysis complete. ${uplift > 0 ? `You're up $${uplift.toLocaleString()} (${upliftPercentage.toFixed(1)}%)` : 'Revenue is tracking with baseline'} this ${period}.`,
      data: snapshot,
      events: [{
        type: 'revenue_snapshot_generated',
        payload: { 
          period, 
          uplift, 
          uplift_percentage: upliftPercentage 
        },
        baseline_min: 10, // Manual revenue analysis time
        auto_min: 1      // Automated calculation time
      }]
    };
  }

  private async calculateTimeSaved(intent: BrandVXIntent, context: any): Promise<AgentResponse> {
    const { userId } = intent;
    const { period = 'monthly' } = intent.payload;

    // Get time savings from events
    const { data: events } = await supabase
      .from('events')
      .select('type, baseline_min, auto_min, created_at')
      .eq('user_id', userId)
      .gte('created_at', this.getPeriodStart(period))
      .not('baseline_min', 'is', null)
      .not('auto_min', 'is', null);

    const timeSavings = (events || []).reduce((acc, event) => {
      const saved = (event.baseline_min || 0) - (event.auto_min || 0);
      acc.total_saved += saved;
      acc.by_category[event.type] = (acc.by_category[event.type] || 0) + saved;
      return acc;
    }, {
      total_saved: 0,
      by_category: {} as Record<string, number>
    });

    // Calculate value of time saved
    const hourlyRate = context.user?.admin_hours_per_week ? 
      (context.user.monthly_revenue || 0) / (context.user.admin_hours_per_week * 4) : 50; // Default $50/hour
    
    const hoursSaved = timeSavings.total_saved / 60;
    const dollarValue = hoursSaved * hourlyRate;

    // Generate milestones
    const milestones = this.calculateTimeMilestones(timeSavings.total_saved);

    return {
      type: 'result',
      text: `You've saved ${Math.round(hoursSaved)} hours this ${period} (worth $${Math.round(dollarValue)})! ${milestones.next ? `Next milestone: ${milestones.next}` : 'Amazing progress!'}`,
      data: {
        period,
        minutes_saved: timeSavings.total_saved,
        hours_saved: hoursSaved,
        dollar_value: dollarValue,
        breakdown: timeSavings.by_category,
        milestones,
        top_time_savers: this.getTopTimeSavers(timeSavings.by_category)
      }
    };
  }

  private async calculateROI(intent: BrandVXIntent, context: any): Promise<AgentResponse> {
    const { userId } = intent;
    
    // Calculate BrandVX costs (subscription + setup time)
    const brandvxCosts = {
      monthly_subscription: 99, // Example pricing
      setup_time_cost: 200,     // One-time setup value
      ongoing_costs: 99
    };

    // Get revenue uplift and time savings value
    const revenueSnapshot = await this.generateRevenueSnapshot(intent, context);
    const timeSavings = await this.calculateTimeSaved(intent, context);

    const monthlyBenefit = (revenueSnapshot.data.revenue_uplift || 0) + (timeSavings.data.dollar_value || 0);
    const roi = brandvxCosts.monthly_subscription > 0 ? 
      ((monthlyBenefit - brandvxCosts.monthly_subscription) / brandvxCosts.monthly_subscription) * 100 : 0;

    const paybackPeriod = brandvxCosts.setup_time_cost > 0 ? 
      brandvxCosts.setup_time_cost / monthlyBenefit : 0;

    return {
      type: 'result',
      text: `BrandVX is delivering ${roi.toFixed(0)}% ROI with a ${paybackPeriod.toFixed(1)} month payback period.`,
      data: {
        monthly_benefit: monthlyBenefit,
        monthly_cost: brandvxCosts.monthly_subscription,
        roi_percentage: roi,
        payback_months: paybackPeriod,
        annual_projection: monthlyBenefit * 12,
        breakdown: {
          revenue_uplift: revenueSnapshot.data.revenue_uplift,
          time_value: timeSavings.data.dollar_value,
          total_benefit: monthlyBenefit
        }
      }
    };
  }

  private async analyzeFunnel(intent: BrandVXIntent, context: any): Promise<AgentResponse> {
    const { userId } = intent;

    // Get funnel data from lead status and events
    const { data: leadStatusCounts } = await supabase
      .from('lead_status')
      .select(`
        bucket,
        contacts!inner(user_id)
      `)
      .eq('contacts.user_id', userId);

    // Count leads in each bucket
    const funnelCounts = Array.from({ length: 7 }, (_, i) => {
      const bucket = i + 1;
      const count = (leadStatusCounts || []).filter(item => item.bucket === bucket).length;
      return { bucket, count };
    });

    // Calculate conversion rates
    const totalLeads = funnelCounts.reduce((sum, stage) => sum + stage.count, 0);
    const conversionRates = funnelCounts.map((stage, index) => {
      const nextStage = funnelCounts[index + 1];
      const rate = stage.count > 0 && nextStage ? (nextStage.count / stage.count) * 100 : 0;
      return { ...stage, conversion_rate: rate };
    });

    const funnel = {
      total_leads: totalLeads,
      stages: conversionRates,
      bottlenecks: conversionRates
        .filter(stage => stage.conversion_rate < 30 && stage.count > 5)
        .map(stage => ({
          bucket: stage.bucket,
          issue: `Low conversion from bucket ${stage.bucket}`,
          recommendation: this.getFunnelRecommendation(stage.bucket)
        }))
    };

    return {
      type: 'result',
      text: `Funnel analysis complete. ${funnel.bottlenecks.length > 0 ? `Found ${funnel.bottlenecks.length} optimization opportunities.` : 'Funnel is performing well!'}`,
      data: funnel
    };
  }

  private async analyzeAmbassadors(intent: BrandVXIntent, context: any): Promise<AgentResponse> {
    const { userId } = intent;

    // Get loyalty scores and ambassador candidates
    const { data: loyaltyData } = await supabase
      .from('loyalty_scores')
      .select(`
        *,
        contacts!inner(name, user_id)
      `)
      .eq('contacts.user_id', userId)
      .order('referrals', { ascending: false });

    const candidates = (loyaltyData || []).filter(score => 
      score.referrals >= 5 && 
      score.usage_index >= 50 && 
      !score.ambassador_flag
    );

    const currentAmbassadors = (loyaltyData || []).filter(score => score.ambassador_flag);

    const analysis = {
      current_ambassadors: currentAmbassadors.length,
      potential_candidates: candidates.length,
      top_referrers: loyaltyData?.slice(0, 5).map(score => ({
        name: score.contacts?.name,
        referrals: score.referrals,
        tier: score.tier
      })),
      recommendations: candidates.slice(0, 3).map(candidate => ({
        name: candidate.contacts?.name,
        referrals: candidate.referrals,
        usage_index: candidate.usage_index,
        action: 'Invite to ambassador program'
      }))
    };

    return {
      type: 'result',
      text: `Ambassador analysis: ${currentAmbassadors.length} active ambassadors, ${candidates.length} new candidates identified.`,
      data: analysis
    };
  }

  // Helper methods
  private async getBaselineRevenue(userId: string) {
    // Get user's reported baseline revenue
    const { data: profile } = await supabase
      .from('profiles')
      .select('monthly_revenue')
      .eq('id', userId)
      .single();

    return {
      total: profile?.monthly_revenue || 0,
      breakdown: { baseline: profile?.monthly_revenue || 0 }
    };
  }

  private async getCurrentRevenue(userId: string, period: string) {
    const startDate = this.getPeriodStart(period);
    
    const { data: revenue } = await supabase
      .from('revenue_records')
      .select('amount, source')
      .eq('user_id', userId)
      .gte('created_at', startDate);

    const total = (revenue || []).reduce((sum, record) => sum + Number(record.amount), 0);
    const breakdown = (revenue || []).reduce((acc, record) => {
      acc[record.source || 'unknown'] = (acc[record.source || 'unknown'] || 0) + Number(record.amount);
      return acc;
    }, {} as Record<string, number>);

    return { total, breakdown };
  }

  private async calculateBrandVXAttribution(userId: string, period: string) {
    // Simple attribution based on automated vs manual activities
    const startDate = this.getPeriodStart(period);
    
    const { data: events } = await supabase
      .from('events')
      .select('type, metadata')
      .eq('user_id', userId)
      .gte('created_at', startDate)
      .in('type', ['appointment_booked', 'cadence_step_completed', 'lead_converted']);

    const attribution = {
      automated_bookings: events?.filter(e => e.type === 'appointment_booked').length || 0,
      automated_follow_ups: events?.filter(e => e.type === 'cadence_step_completed').length || 0,
      lead_conversions: events?.filter(e => e.type === 'lead_converted').length || 0
    };

    return attribution;
  }

  private calculateTimeMilestones(totalMinutes: number) {
    const hours = totalMinutes / 60;
    const milestones = [10, 25, 50, 100, 250, 500];
    
    const achieved = milestones.filter(m => hours >= m);
    const next = milestones.find(m => hours < m);
    
    return {
      achieved: achieved[achieved.length - 1],
      next: next ? `${next} hours` : null,
      progress_to_next: next ? Math.round((hours / next) * 100) : 100
    };
  }

  private getTopTimeSavers(breakdown: Record<string, number>) {
    return Object.entries(breakdown)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type, minutes]) => ({
        activity: type.replace(/_/g, ' '),
        minutes_saved: minutes,
        hours_saved: Math.round(minutes / 60 * 10) / 10
      }));
  }

  private getPeriodStart(period: string): string {
    const now = new Date();
    switch (period) {
      case 'weekly':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      case 'quarterly':
        return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString();
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }
  }

  private getFunnelRecommendation(bucket: number): string {
    const recommendations = {
      1: 'Improve initial outreach messaging',
      2: 'Strengthen follow-up cadence', 
      3: 'Enhance retargeting offers',
      4: 'Optimize booking process',
      5: 'Improve onboarding experience',
      6: 'Enhance loyalty programs',
      7: 'Focus on reactivation campaigns'
    };
    
    return recommendations[bucket as keyof typeof recommendations] || 'Analyze conversion barriers';
  }
}