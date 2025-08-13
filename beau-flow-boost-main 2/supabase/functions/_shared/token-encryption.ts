/**
 * Secure token encryption utilities for protecting OAuth tokens
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

/**
 * Generate a derived key from the encryption secret
 */
async function getDerivedKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('TOKEN_ENCRYPTION_KEY');
  if (!secret) {
    throw new Error('TOKEN_ENCRYPTION_KEY environment variable is required');
  }
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  
  // Create a key from the secret
  const importedKey = await crypto.subtle.importKey(
    'raw',
    keyData.slice(0, 32), // Use first 32 bytes for AES-256
    { name: ALGORITHM },
    false,
    ['encrypt', 'decrypt']
  );
  
  return importedKey;
}

/**
 * Encrypt a token using AES-GCM
 */
export async function encryptToken(token: string): Promise<string> {
  if (!token) return token;
  
  try {
    const key = await getDerivedKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    
    // Generate a random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the token
    const encrypted = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    // Return base64 encoded result
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Token encryption failed:', error);
    // Fallback: return original token if encryption fails
    return token;
  }
}

/**
 * Decrypt a token using AES-GCM
 */
export async function decryptToken(encryptedToken: string): Promise<string> {
  if (!encryptedToken) return encryptedToken;
  
  try {
    // Check if token is already encrypted (base64 encoded)
    if (!isBase64(encryptedToken)) {
      // Token is not encrypted, return as-is (for backwards compatibility)
      return encryptedToken;
    }
    
    const key = await getDerivedKey();
    
    // Decode from base64
    const combined = new Uint8Array(
      atob(encryptedToken).split('').map(char => char.charCodeAt(0))
    );
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    // Decrypt the token
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Token decryption failed:', error);
    // Fallback: return original token if decryption fails
    return encryptedToken;
  }
}

/**
 * Check if a string is base64 encoded
 */
function isBase64(str: string): boolean {
  try {
    return btoa(atob(str)) === str;
  } catch (err) {
    return false;
  }
}

/**
 * Encrypt token data for storage
 */
export async function encryptTokenData(tokenData: {
  access_token?: string | null;
  refresh_token?: string | null;
  [key: string]: any;
}): Promise<typeof tokenData> {
  const encrypted = { ...tokenData };
  
  if (encrypted.access_token) {
    encrypted.access_token = await encryptToken(encrypted.access_token);
  }
  
  if (encrypted.refresh_token) {
    encrypted.refresh_token = await encryptToken(encrypted.refresh_token);
  }
  
  return encrypted;
}

/**
 * Decrypt token data from storage
 */
export async function decryptTokenData(tokenData: {
  access_token?: string | null;
  refresh_token?: string | null;
  [key: string]: any;
}): Promise<typeof tokenData> {
  const decrypted = { ...tokenData };
  
  if (decrypted.access_token) {
    decrypted.access_token = await decryptToken(decrypted.access_token);
  }
  
  if (decrypted.refresh_token) {
    decrypted.refresh_token = await decryptToken(decrypted.refresh_token);
  }
  
  return decrypted;
}