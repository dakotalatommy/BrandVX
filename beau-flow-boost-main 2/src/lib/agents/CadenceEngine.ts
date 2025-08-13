import { RealCadenceEngine } from "./RealCadenceEngine";

// Deprecated: Redirecting to RealCadenceEngine
// This class has been replaced with real database-driven cadences

export interface CadenceStep {
  id: string;
  bucket: number;
  tag: string;
  step: number;
  delay_hours: number;
  channel: 'sms' | 'email' | 'call';
  template_id: string;
  conditions?: {
    min_engagement_score?: number;
    max_attempts?: number;
    exclude_tags?: string[];
  };
}

export interface CadenceTemplate {
  id: string;
  name: string;
  subject?: string;
  body: string;
  variables: string[];
  tone: 'professional' | 'casual' | 'urgent' | 'empathetic';
  industry_specific?: boolean;
}

/**
 * CadenceEngine - Redirects to RealCadenceEngine
 * @deprecated Use RealCadenceEngine for actual cadence processing
 */
export class CadenceEngine {
  private realEngine: RealCadenceEngine;

  constructor() {
    this.realEngine = new RealCadenceEngine();
  }

  /**
   * @deprecated Use RealCadenceEngine.processRealScheduledCadences
   */
  async processScheduledCadences(): Promise<void> {
    return this.realEngine.processRealScheduledCadences();
  }
}