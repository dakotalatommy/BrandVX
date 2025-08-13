# Security Implementation: Token Encryption

## Overview
This document outlines the security implementation for encrypting OAuth tokens in the BrandVX platform to address the security finding about authentication tokens potentially being stolen.

## Security Issue Addressed
**Issue**: Authentication Tokens Could Be Stolen by Attackers  
**Level**: Error  
**Previous State**: Access tokens and refresh tokens were stored in plaintext in the `connected_accounts` table

## Solution Implemented

### 1. Token Encryption Utility
- **File**: `supabase/functions/_shared/token-encryption.ts`
- **Algorithm**: AES-GCM with 256-bit keys
- **Features**:
  - Secure encryption/decryption of OAuth tokens
  - Backward compatibility with existing plaintext tokens
  - Random IV generation for each encryption
  - Base64 encoding for storage

### 2. Updated OAuth Functions
**Files Modified**:
- `supabase/functions/acuity-oauth/index.ts`
- `supabase/functions/hubspot-oauth/index.ts` 
- `supabase/functions/square-oauth/index.ts`

**Changes**:
- All tokens are now encrypted before database storage
- Uses `encryptTokenData()` helper function
- Maintains existing OAuth flow without breaking changes

### 3. Updated Data Sync Functions
**Files Modified**:
- `supabase/functions/acuity-data-sync/index.ts`
- `supabase/functions/hubspot-data-sync/index.ts`
- `supabase/functions/square-data-sync/index.ts`

**Changes**:
- All functions now decrypt tokens before API calls
- Uses `decryptTokenData()` helper function
- Backward compatible with plaintext tokens

## Required Environment Variable

### TOKEN_ENCRYPTION_KEY
**Purpose**: Master encryption key for token encryption/decryption  
**Requirements**: 
- Minimum 32 characters (256-bit security)
- Cryptographically secure random string
- Must be stored as Supabase Secret

**Setup Instructions**:
1. Generate a secure 32+ character key:
   ```bash
   openssl rand -base64 32
   ```
2. Store in Supabase Secrets as `TOKEN_ENCRYPTION_KEY`

## Security Benefits

### Before
- OAuth tokens stored in plaintext
- Vulnerable to database breaches
- Direct token exposure if RLS bypassed

### After  
- All tokens encrypted with AES-GCM
- Database breach only exposes encrypted data
- Encryption key stored separately in Supabase Secrets
- Backward compatible with existing installations

## Implementation Notes

### Backward Compatibility
- Existing plaintext tokens continue to work
- Gradual migration as tokens are refreshed
- No downtime required for deployment

### Error Handling
- Graceful fallback to plaintext if decryption fails
- Logging for troubleshooting encryption issues
- No service interruption if key is temporarily unavailable

### Performance Impact
- Minimal overhead for encryption/decryption
- Async operations don't block OAuth flows
- Browser-native Web Crypto API used for efficiency

## Testing Recommendations

1. **Pre-deployment**: Test with sample tokens to verify encryption/decryption
2. **Post-deployment**: Monitor logs for encryption errors
3. **Token refresh**: Verify new tokens are properly encrypted
4. **API calls**: Confirm decrypted tokens work with external APIs

## Compliance & Auditing

This implementation addresses:
- **PCI DSS**: Requirement for encryption of stored authentication data
- **SOC 2**: Controls for data protection and access management  
- **GDPR**: Technical safeguards for personal data protection
- **ISO 27001**: Information security management requirements

## Next Steps

1. Deploy encryption utility and updated functions
2. Set up `TOKEN_ENCRYPTION_KEY` in Supabase Secrets
3. Monitor logs for any decryption issues
4. Plan migration timeline for existing plaintext tokens

## Monitoring & Maintenance

- Monitor encryption/decryption success rates
- Rotate `TOKEN_ENCRYPTION_KEY` annually
- Review and audit token access patterns
- Update encryption algorithm as needed for future security standards