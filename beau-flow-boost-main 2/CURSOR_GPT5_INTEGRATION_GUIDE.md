# BrandVX Platform - GPT-5 Integration Guide

## SYSTEM OVERVIEW
This is a comprehensive beauty business automation platform built with React/TypeScript frontend and Supabase backend. The platform automates social media, client communication, and administrative tasks for beauty professionals.

## CORE ARCHITECTURE

### Frontend Structure (L-Layer)
```
src/
├── components/
│   ├── BrandVXDashboard.tsx      # Main dashboard with metrics
│   ├── agent/BrandVXChat.tsx     # AI chat interface
│   ├── voice/VoiceInterface.tsx  # Real-time audio chat
│   ├── cadence/CadenceManager.tsx # Automation sequences
│   ├── contacts/ContactManager.tsx # Client database
│   ├── automation/AutomationCenter.tsx # Rule builder
│   ├── onboarding/OnboardingFlow.tsx # 6-step setup
│   └── auth/AuthForm.tsx         # Authentication
├── hooks/
│   ├── useAuth.tsx               # Authentication state
│   ├── useBrandVXAgent.tsx       # AI agent integration
│   └── useLeadAutomation.tsx     # Lead processing
├── utils/
│   └── RealtimeAudio.ts          # WebRTC audio processing
└── pages/
    ├── Dashboard.tsx             # Main app entry
    ├── Auth.tsx                  # Login/signup
    ├── Agent.tsx                 # AI chat page
    ├── Contacts.tsx              # Contact management
    └── Integrations.tsx          # OAuth connections
```

### Backend Structure (H-Layer)
```
supabase/
├── functions/
│   ├── master-agent-orchestrator/    # Main AI routing
│   ├── brandvx-specialist-router/    # Specialist delegation
│   ├── ai-recommendations/           # Business insights
│   ├── automation-processor/         # Rule execution
│   ├── cadence-scheduler/           # Sequence automation
│   ├── *-oauth/                     # OAuth flows (HubSpot, Square, Acuity)
│   ├── *-data-sync/                 # Data synchronization
│   ├── realtime-token/              # OpenAI session management
│   └── _shared/token-encryption.ts  # AES-GCM encryption
└── migrations/                      # Database schema
```

## KEY SYSTEMS EXPLANATION

### 1. AI Agent System
**Files**: `src/components/agent/BrandVXChat.tsx`, `src/hooks/useBrandVXAgent.tsx`
- **Purpose**: Voice and text-enabled AI assistant
- **Features**: Real-time conversation, specialist routing, function calling
- **Integration**: OpenAI Realtime API, specialist delegation
- **Voice**: WebRTC + 24kHz PCM audio processing

### 2. Authentication & Onboarding
**Files**: `src/hooks/useAuth.tsx`, `src/components/onboarding/OnboardingFlow.tsx`
- **Flow**: Signup → Profile Creation → 6-Step Onboarding → Dashboard
- **Security**: Email verification, RLS policies, session management
- **Data**: Business metrics, goals, time wasters, preferences

### 3. Cadence Engine
**Files**: `src/components/cadence/CadenceManager.tsx`, `supabase/functions/cadence-scheduler/`
- **Purpose**: Automated multi-step follow-up sequences
- **Features**: Template system, scheduling, multi-channel communication
- **Triggers**: Time-based, event-based, lead status changes

### 4. Integration Hub
**Files**: OAuth functions for HubSpot, Square, Acuity
- **Security**: AES-GCM encrypted token storage
- **Features**: One-click connections, data synchronization
- **Platforms**: CRM (HubSpot), Payments (Square), Booking (Acuity)

### 5. Analytics Dashboard
**Files**: `src/components/BrandVXDashboard.tsx`, `src/components/analytics/EnhancedAnalytics.tsx`
- **Metrics**: Time saved, revenue growth, usage analytics
- **Visualization**: Lead status flow, ambassador tracking
- **Real-time**: Live updates via Supabase subscriptions

## DATABASE SCHEMA OVERVIEW

### Core Tables
- **profiles**: User business information and preferences
- **contacts**: Client database with lead scoring
- **messages**: Communication history and templates
- **events**: Analytics and tracking data
- **connected_accounts**: Encrypted OAuth credentials
- **automation_rules**: User-defined workflows
- **cadence_rules**: Follow-up sequence configuration

### Security Implementation
- **RLS Policies**: Complete user data isolation
- **Token Encryption**: AES-GCM for OAuth credentials
- **Input Validation**: SQL injection and XSS prevention

## EDGE FUNCTIONS EXPLAINED

### AI & Automation
- **master-agent-orchestrator**: Routes user requests to appropriate AI specialists
- **brandvx-specialist-router**: Delegates to Revenue, Content, Inventory, Treatment specialists
- **ai-recommendations**: Generates business insights using OpenAI
- **automation-processor**: Executes user-defined automation rules
- **cadence-scheduler**: Triggers scheduled follow-up sequences

### Integrations
- **[platform]-oauth**: Secure OAuth 2.0 flows with token encryption
- **[platform]-data-sync**: Bidirectional data synchronization
- **realtime-token**: Manages OpenAI Realtime API sessions

### Communication
- **send-message**: Handles email/SMS/notification delivery
- **brandvx-webhook**: Processes external webhooks
- **log-event**: Tracks analytics and user behavior

## CRITICAL IMPLEMENTATION DETAILS

### Voice Interface (`src/utils/RealtimeAudio.ts`)
```typescript
// Real-time audio processing for AI conversations
class AudioRecorder {
  // 24kHz PCM audio capture
  // Noise suppression and echo cancellation
  // Real-time streaming to OpenAI
}

class RealtimeChat {
  // WebRTC peer connection
  // Session management with ephemeral tokens
  // Audio queue for sequential playback
}
```

### Security (`supabase/functions/_shared/token-encryption.ts`)
```typescript
// AES-GCM 256-bit encryption for OAuth tokens
export async function encryptToken(token: string): Promise<string>
export async function decryptToken(encryptedToken: string): Promise<string>
// Backward compatibility with plaintext tokens
// Random IV generation for each encryption
```

### Agent Orchestration (`useBrandVXAgent.tsx`)
```typescript
// Intelligent routing to specialist agents
interface AgentIntent {
  type: string;           // appointment, content, inventory, etc.
  hierarchyLevel: string; // H, L, User level access
  payload: any;           // Context data
}
```

## USER EXPERIENCE FLOW

1. **Landing Page** → Value proposition and signup call-to-action
2. **Authentication** → Email/password with business information
3. **Onboarding** → 6-step guided setup (business, goals, metrics)
4. **Dashboard** → Analytics overview with key metrics
5. **AI Agent** → Voice/text conversations for task automation
6. **Integrations** → Connect HubSpot, Square, Acuity with OAuth
7. **Automation** → Set up cadence sequences and rules
8. **Analytics** → Monitor time savings and business growth

## DEVELOPMENT PATTERNS

### State Management
- React Context for authentication
- Custom hooks for business logic
- Supabase real-time subscriptions

### Error Handling
- Comprehensive try/catch blocks
- Toast notifications for user feedback
- Console logging for debugging
- Graceful fallbacks for API failures

### Performance
- Lazy loading for components
- Audio processing optimization
- Database query optimization
- Edge function caching

## ENVIRONMENT REQUIREMENTS

### Required Secrets (Supabase)
- `OPENAI_API_KEY`: OpenAI API access
- `TOKEN_ENCRYPTION_KEY`: AES encryption key
- `HUBSPOT_CLIENT_ID/SECRET`: HubSpot OAuth
- `SQUARE_CLIENT_ID/SECRET`: Square OAuth
- `ACUITY_CLIENT_ID/SECRET`: Acuity OAuth

### Optional Integrations
- SendGrid for email delivery
- Twilio for SMS communication
- Google Calendar for booking sync

## TESTING & DEBUGGING

### Console Logging
- Comprehensive logging in all functions
- Error tracking with context
- Performance monitoring

### Edge Function Monitoring
- Supabase function logs
- OpenAI API usage tracking
- OAuth flow debugging

## FUTURE EXTENSIBILITY

### Plugin Architecture
- Specialist agent system allows new AI capabilities
- OAuth framework supports additional platforms
- Automation engine supports custom triggers

### Scaling Considerations
- Edge functions auto-scale with usage
- Database optimized for multi-tenant architecture
- Real-time subscriptions handle concurrent users

## CRITICAL NOTES FOR CURSOR GPT-5

1. **Never modify encryption keys** - They break existing OAuth tokens
2. **Preserve RLS policies** - Critical for data security
3. **Maintain audio format** - 24kHz PCM required for OpenAI
4. **Follow OAuth flows** - Encrypted token storage is mandatory
5. **Respect hierarchy levels** - H/L/User access patterns are security critical

This platform represents a complete beauty business automation solution with enterprise-grade security, real-time AI capabilities, and comprehensive integration support.