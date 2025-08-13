import type { BrandVXIntent, AgentResponse } from "../BrandVXAgent";

/**
 * Content Creator Specialist
 * Handles caption creation, video ideas, and social media content for beauty businesses
 */
export class ContentCreator {
  
  async handleContent(intent: BrandVXIntent, context: any): Promise<AgentResponse> {
    const { payload } = intent;
    const contentType = payload.type || 'caption';

    switch (contentType) {
      case 'caption':
        return await this.createCaption(intent, context);
      case 'video_idea':
        return await this.createVideoIdea(intent, context);
      case 'story_prompts':
        return await this.createStoryPrompts(intent, context);
      case 'before_after':
        return await this.handleBeforeAfter(intent, context);
      default:
        return {
          type: 'error',
          text: 'I need to know what type of content you\'d like me to create. Try caption, video idea, or story prompts.',
          data: { unknown_content_type: contentType }
        };
    }
  }

  private async createCaption(intent: BrandVXIntent, context: any): Promise<AgentResponse> {
    const { payload } = intent;
    const { service, business_type, client_result } = payload;

    // Generate caption based on service and business type
    const templates = this.getCaptionTemplates(business_type || 'hair_salon');
    const selectedTemplate = templates[Math.floor(Math.random() * templates.length)];
    
    const caption = this.personalizeCaption(selectedTemplate, {
      service: service || 'transformation',
      result: client_result || 'amazing results'
    });

    return {
      type: 'result',
      text: 'Here\'s your content ready to post:',
      data: {
        caption,
        hashtags: this.generateHashtags(service, business_type),
        suggested_posting_time: this.suggestPostingTime(),
        engagement_tips: [
          'Ask a question to boost engagement',
          'Tag relevant brands/products used',
          'Share to stories for extra reach'
        ]
      },
      events: [{
        type: 'content_created',
        campaign: 'content_automation',
        payload: { content_type: 'caption', service },
        baseline_min: 10, // Manual caption writing time
        auto_min: 2      // AI generation time
      }]
    };
  }

  private async createVideoIdea(intent: BrandVXIntent, context: any): Promise<AgentResponse> {
    const { payload } = intent;
    const { service, trending_audio } = payload;

    const videoIdeas = this.getVideoIdeas(service);
    const selectedIdea = videoIdeas[Math.floor(Math.random() * videoIdeas.length)];

    return {
      type: 'result',
      text: 'Perfect video concept for your next reel:',
      data: {
        concept: selectedIdea,
        shooting_tips: [
          'Use natural lighting near a window',
          'Keep clips short and dynamic',
          'Show the transformation process'
        ],
        trending_audio: trending_audio || 'Use trending beauty sounds',
        estimated_views: 'High engagement potential'
      },
      events: [{
        type: 'video_idea_generated',
        payload: { service, concept: selectedIdea.title },
        baseline_min: 15,
        auto_min: 3
      }]
    };
  }

  private async createStoryPrompts(intent: BrandVXIntent, context: any): Promise<AgentResponse> {
    const storyPrompts = [
      'Behind the scenes of your morning setup',
      'Quick before/after reveal',
      'Product recommendation with demo',
      'Client testimonial feature',
      'Day in the life at the salon'
    ];

    return {
      type: 'result',
      text: 'Here are engaging story ideas for today:',
      data: {
        prompts: storyPrompts,
        interactive_elements: [
          'Polls: "Which look do you prefer?"',
          'Questions: "What\'s your biggest hair concern?"',
          'Quiz: "What\'s your ideal hair color?"'
        ]
      }
    };
  }

  private async handleBeforeAfter(intent: BrandVXIntent, context: any): Promise<AgentResponse> {
    const { payload } = intent;
    const { service, template } = payload;

    const beforeAfterContent = this.createBeforeAfterContent(service, template);

    return {
      type: 'result',
      text: 'Your before/after post is ready:',
      data: {
        ...beforeAfterContent,
        export_formats: ['Instagram Post', 'Facebook Post', 'TikTok'],
        performance_prediction: 'High engagement expected'
      },
      events: [{
        type: 'before_after_created',
        payload: { service, template },
        baseline_min: 8,
        auto_min: 1.5
      }]
    };
  }

  private getCaptionTemplates(businessType: string): string[] {
    const templates = {
      hair_salon: [
        'Another gorgeous transformation! ✨ {service} magic happening at the salon. Who\'s ready for their glow-up? 💫',
        'When you trust the process... {result} speaks for itself! 🔥 Book your {service} consultation today.',
        'This {service} has me absolutely obsessed! 😍 The perfect blend of artistry and technique.',
      ],
      lash_studio: [
        'Lash goals achieved! 👁️✨ These {service} are everything and more. Who else is ready for that flutter life?',
        'Before: tired eyes. After: absolute magic! ✨ {service} transformation complete.',
        'The confidence boost is real! 💪 {service} that make you feel unstoppable.',
      ],
      nail_salon: [
        'Nails that speak louder than words! 💅 This {service} design is pure art.',
        'From concept to creation - {service} perfection! ✨ What design should we try next?',
      ]
    };

    return templates[businessType as keyof typeof templates] || templates.hair_salon;
  }

  private personalizeCaption(template: string, variables: Record<string, string>): string {
    let personalized = template;
    Object.entries(variables).forEach(([key, value]) => {
      personalized = personalized.replace(`{${key}}`, value);
    });
    return personalized;
  }

  private generateHashtags(service?: string, businessType?: string): string[] {
    const baseHashtags = ['#beauty', '#transformation', '#salon', '#professional'];
    
    const serviceHashtags: Record<string, string[]> = {
      'hair_color': ['#haircolor', '#balayage', '#highlights'],
      'lash_extensions': ['#lashextensions', '#lashart', '#lashes'],
      'nail_art': ['#nailart', '#manicure', '#nails']
    };

    const typeHashtags: Record<string, string[]> = {
      'hair_salon': ['#hairsalon', '#hairstylist', '#hair'],
      'lash_studio': ['#lashstudio', '#lashtech', '#eyelashes'],
      'nail_salon': ['#nailsalon', '#nailtech', '#naildesign']
    };

    let hashtags = [...baseHashtags];
    
    if (service && serviceHashtags[service]) {
      hashtags.push(...serviceHashtags[service]);
    }
    
    if (businessType && typeHashtags[businessType]) {
      hashtags.push(...typeHashtags[businessType]);
    }

    return hashtags.slice(0, 10); // Limit to 10 hashtags
  }

  private suggestPostingTime(): string {
    const hour = new Date().getHours();
    
    if (hour < 12) {
      return '6-9 PM (prime engagement time)';
    } else if (hour < 17) {
      return '7-9 PM (evening peak)';
    } else {
      return '6-8 AM tomorrow (morning engagement)';
    }
  }

  private getVideoIdeas(service?: string) {
    return [
      {
        title: 'Transformation Time-lapse',
        description: 'Speed up the entire process from start to finish',
        hook: 'You won\'t believe this transformation...'
      },
      {
        title: 'Behind the Technique',
        description: 'Show your professional skills in action',
        hook: 'The secret to perfect results is...'
      },
      {
        title: 'Before/After Reveal',
        description: 'Dramatic reveal with trending audio',
        hook: 'Wait for it... the glow up is real!'
      }
    ];
  }

  private createBeforeAfterContent(service?: string, template?: string) {
    return {
      caption: `The power of professional ${service || 'treatment'}! ✨ This transformation speaks for itself. Ready for your glow-up?`,
      layout: template || 'side-by-side',
      call_to_action: 'Book your consultation today!',
      hashtags: this.generateHashtags(service)
    };
  }
}