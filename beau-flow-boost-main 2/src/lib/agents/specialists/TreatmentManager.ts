import type { BrandVXIntent, AgentResponse } from "../BrandVXAgent";

/**
 * Treatment Manager Specialist
 * Handles Vivid Hair and Lash treatments with domain-specific checklists
 */
export class TreatmentManager {
  
  async handleTreatment(intent: BrandVXIntent, context: any): Promise<AgentResponse> {
    const { payload } = intent;
    const treatmentType = intent.type; // 'hair' or 'lash'

    if (treatmentType === 'hair') {
      return await this.handleVividHair(intent, context);
    } else if (treatmentType === 'lash') {
      return await this.handleLashTreatment(intent, context);
    }

    return {
      type: 'error',
      text: 'Unknown treatment type requested',
      data: { treatment_type: treatmentType }
    };
  }

  private async handleVividHair(intent: BrandVXIntent, context: any): Promise<AgentResponse> {
    const { payload } = intent;
    
    // Vivid Hair treatment checklist and planning
    const hairChecklist = [
      'Hair history assessment',
      'Color consultation', 
      'Allergy test required',
      'Maintenance schedule',
      'Product recommendations',
      'Aftercare instructions'
    ];

    if (payload.step === 'consultation') {
      return {
        type: 'plan',
        text: 'I\'ll guide you through our vivid hair consultation process. We\'ll cover your hair history, desired look, and maintenance commitment.',
        data: {
          checklist: hairChecklist,
          estimated_time: '60 minutes',
          next_steps: ['assessment', 'color_planning', 'scheduling']
        },
        events: [{
          type: 'hair_consultation_started',
          payload: { treatment_type: 'vivid_hair' },
          baseline_min: 15,
          auto_min: 3
        }]
      };
    }

    return {
      type: 'result',
      text: 'Vivid hair treatment plan created successfully',
      data: { treatment_type: 'vivid_hair', checklist: hairChecklist }
    };
  }

  private async handleLashTreatment(intent: BrandVXIntent, context: any): Promise<AgentResponse> {
    const { payload } = intent;
    
    // Lash treatment checklist
    const lashChecklist = [
      'Eye sensitivity assessment',
      'Lash condition evaluation',
      'Style consultation',
      'Aftercare planning',
      'Touch-up scheduling'
    ];

    if (payload.step === 'consultation') {
      return {
        type: 'plan', 
        text: 'Let\'s plan your perfect lash look. I\'ll assess your natural lashes and help you choose the ideal style and maintenance routine.',
        data: {
          checklist: lashChecklist,
          estimated_time: '90 minutes',
          next_steps: ['assessment', 'style_selection', 'application']
        },
        events: [{
          type: 'lash_consultation_started',
          payload: { treatment_type: 'lash_extensions' },
          baseline_min: 20,
          auto_min: 4
        }]
      };
    }

    return {
      type: 'result',
      text: 'Lash treatment plan ready',
      data: { treatment_type: 'lash', checklist: lashChecklist }
    };
  }
}