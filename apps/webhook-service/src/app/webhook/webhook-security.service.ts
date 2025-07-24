import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class WebhookSecurityService {
  private readonly logger = new Logger(WebhookSecurityService.name);

  async validateAuthentication(
    authConfig: any, 
    headers: Record<string, string>,
    payload?: any
  ): Promise<{ valid: boolean; error?: string }> {
    if (!authConfig || authConfig.type === 'none') {
      return { valid: true };
    }

    try {
      switch (authConfig.type) {
        case 'api_key':
          return await this.validateApiKey(authConfig.config, headers);
        
        case 'bearer':
          return await this.validateBearerToken(authConfig.config, headers);
        
        case 'basic':
          return await this.validateBasicAuth(authConfig.config, headers);
        
        case 'signature':
          return await this.validateSignature(authConfig.config, headers, payload);
        
        case 'jwt':
          return await this.validateJWT(authConfig.config, headers);
        
        case 'oauth':
          return await this.validateOAuth(authConfig.config, headers);
        
        default:
          return { valid: false, error: `Unsupported authentication type: ${authConfig.type}` };
      }
    } catch (error) {
      this.logger.error(`Authentication validation error: ${error.message}`);
      return { valid: false, error: `Authentication error: ${error.message}` };
    }
  }

  private async validateApiKey(
    config: any, 
    headers: Record<string, string>
  ): Promise<{ valid: boolean; error?: string }> {
    const headerName = (config.header || 'x-api-key').toLowerCase();
    const expectedKey = config.key;
    const providedKey = headers[headerName];

    if (!providedKey) {
      return { valid: false, error: `API key header '${config.header || 'x-api-key'}' is required` };
    }

    if (providedKey !== expectedKey) {
      return { valid: false, error: 'Invalid API key' };
    }

    return { valid: true };
  }

  private async validateBearerToken(
    config: any, 
    headers: Record<string, string>
  ): Promise<{ valid: boolean; error?: string }> {
    const authHeader = headers['authorization'];
    const expectedToken = config.token;

    if (!authHeader) {
      return { valid: false, error: 'Authorization header is required' };
    }

    if (!authHeader.startsWith('Bearer ')) {
      return { valid: false, error: 'Bearer token format is required' };
    }

    const token = authHeader.substring(7);
    
    if (token !== expectedToken) {
      return { valid: false, error: 'Invalid bearer token' };
    }

    return { valid: true };
  }

  private async validateBasicAuth(
    config: any, 
    headers: Record<string, string>
  ): Promise<{ valid: boolean; error?: string }> {
    const authHeader = headers['authorization'];
    const expectedUsername = config.username;
    const expectedPassword = config.password;

    if (!authHeader) {
      return { valid: false, error: 'Authorization header is required' };
    }

    if (!authHeader.startsWith('Basic ')) {
      return { valid: false, error: 'Basic authentication format is required' };
    }

    try {
      const credentials = Buffer.from(authHeader.substring(6), 'base64').toString();
      const [username, password] = credentials.split(':');

      if (username !== expectedUsername || password !== expectedPassword) {
        return { valid: false, error: 'Invalid credentials' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Invalid basic authentication format' };
    }
  }

  private async validateSignature(
    config: any, 
    headers: Record<string, string>, 
    payload: any
  ): Promise<{ valid: boolean; error?: string }> {
    const signatureHeader = (config.header || 'x-signature').toLowerCase();
    const secret = config.secret;
    const algorithm = config.algorithm || 'sha256';
    const prefix = config.prefix || '';

    const providedSignature = headers[signatureHeader];
    
    if (!providedSignature) {
      return { valid: false, error: `Signature header '${config.header || 'x-signature'}' is required` };
    }

    if (!secret) {
      return { valid: false, error: 'Signature secret is not configured' };
    }

    try {
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
      
      let expectedSignature;
      
      if (algorithm.startsWith('sha')) {
        expectedSignature = crypto
          .createHmac(algorithm, secret)
          .update(payloadString)
          .digest('hex');
      } else {
        return { valid: false, error: `Unsupported signature algorithm: ${algorithm}` };
      }

      const fullExpectedSignature = prefix ? `${prefix}${expectedSignature}` : expectedSignature;
      
      // Use timing-safe comparison
      if (!this.timingSafeEqual(providedSignature, fullExpectedSignature)) {
        return { valid: false, error: 'Invalid signature' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: `Signature validation error: ${error.message}` };
    }
  }

  private async validateJWT(
    config: any, 
    headers: Record<string, string>
  ): Promise<{ valid: boolean; error?: string }> {
    const authHeader = headers['authorization'];
    
    if (!authHeader) {
      return { valid: false, error: 'Authorization header is required' };
    }

    if (!authHeader.startsWith('Bearer ')) {
      return { valid: false, error: 'Bearer token format is required for JWT' };
    }

    const token = authHeader.substring(7);
    
    try {
      // Basic JWT validation - in production, use a proper library like jsonwebtoken
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false, error: 'Invalid JWT format' };
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      
      // Check expiration
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return { valid: false, error: 'JWT token has expired' };
      }

      // Check issuer if configured
      if (config.issuer && payload.iss !== config.issuer) {
        return { valid: false, error: 'Invalid JWT issuer' };
      }

      // Check audience if configured
      if (config.audience && payload.aud !== config.audience) {
        return { valid: false, error: 'Invalid JWT audience' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Invalid JWT token' };
    }
  }

  private async validateOAuth(
    config: any, 
    headers: Record<string, string>
  ): Promise<{ valid: boolean; error?: string }> {
    const authHeader = headers['authorization'];
    
    if (!authHeader) {
      return { valid: false, error: 'Authorization header is required' };
    }

    if (!authHeader.startsWith('Bearer ')) {
      return { valid: false, error: 'Bearer token format is required for OAuth' };
    }

    const token = authHeader.substring(7);
    
    // In a real implementation, you would validate the token with the OAuth provider
    // For now, just check if it's not empty
    if (!token) {
      return { valid: false, error: 'OAuth token is required' };
    }

    return { valid: true };
  }

  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  generateSignature(payload: string, secret: string, algorithm = 'sha256'): string {
    return crypto
      .createHmac(algorithm, secret)
      .update(payload)
      .digest('hex');
  }

  generateApiKey(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  generateSecret(length = 64): string {
    return crypto.randomBytes(length).toString('base64');
  }

  hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const saltToUse = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, saltToUse, 10000, 64, 'sha512').toString('hex');
    
    return { hash, salt: saltToUse };
  }

  verifyPassword(password: string, hash: string, salt: string): boolean {
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return this.timingSafeEqual(hash, verifyHash);
  }
}
