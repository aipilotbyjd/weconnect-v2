import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WebhookValidationService {
  private readonly logger = new Logger(WebhookValidationService.name);

  async validatePayload(payload: any, schema: any): Promise<{ valid: boolean; error?: string }> {
    try {
      if (!schema) {
        return { valid: true };
      }

      // Required fields validation
      if (schema.required) {
        for (const field of schema.required) {
          if (!(field in payload)) {
            return { valid: false, error: `Required field '${field}' is missing` };
          }
        }
      }

      // Properties validation
      if (schema.properties) {
        for (const [field, rules] of Object.entries(schema.properties as any)) {
          if (field in payload) {
            const value = payload[field];
            const fieldRules = rules as any;

            // Type validation
            if (fieldRules.type && typeof value !== fieldRules.type) {
              return { valid: false, error: `Field '${field}' must be of type ${fieldRules.type}` };
            }

            // String length validation
            if (fieldRules.minLength && typeof value === 'string' && value.length < fieldRules.minLength) {
              return { valid: false, error: `Field '${field}' must be at least ${fieldRules.minLength} characters` };
            }

            if (fieldRules.maxLength && typeof value === 'string' && value.length > fieldRules.maxLength) {
              return { valid: false, error: `Field '${field}' must be at most ${fieldRules.maxLength} characters` };
            }

            // Number range validation
            if (fieldRules.minimum && typeof value === 'number' && value < fieldRules.minimum) {
              return { valid: false, error: `Field '${field}' must be at least ${fieldRules.minimum}` };
            }

            if (fieldRules.maximum && typeof value === 'number' && value > fieldRules.maximum) {
              return { valid: false, error: `Field '${field}' must be at most ${fieldRules.maximum}` };
            }

            // Pattern validation
            if (fieldRules.pattern && typeof value === 'string') {
              const regex = new RegExp(fieldRules.pattern);
              if (!regex.test(value)) {
                return { valid: false, error: `Field '${field}' does not match required pattern` };
              }
            }

            // Enum validation
            if (fieldRules.enum && !fieldRules.enum.includes(value)) {
              return { valid: false, error: `Field '${field}' must be one of: ${fieldRules.enum.join(', ')}` };
            }

            // Array validation
            if (fieldRules.type === 'array' && Array.isArray(value)) {
              if (fieldRules.minItems && value.length < fieldRules.minItems) {
                return { valid: false, error: `Field '${field}' must have at least ${fieldRules.minItems} items` };
              }

              if (fieldRules.maxItems && value.length > fieldRules.maxItems) {
                return { valid: false, error: `Field '${field}' must have at most ${fieldRules.maxItems} items` };
              }

              // Validate array items
              if (fieldRules.items) {
                for (let i = 0; i < value.length; i++) {
                  const itemValidation = await this.validatePayload(value[i], fieldRules.items);
                  if (!itemValidation.valid) {
                    return { valid: false, error: `Array item ${i} in field '${field}': ${itemValidation.error}` };
                  }
                }
              }
            }

            // Object validation
            if (fieldRules.type === 'object' && typeof value === 'object' && value !== null) {
              if (fieldRules.properties) {
                const objectValidation = await this.validatePayload(value, fieldRules);
                if (!objectValidation.valid) {
                  return { valid: false, error: `Object field '${field}': ${objectValidation.error}` };
                }
              }
            }
          }
        }
      }

      // Additional properties validation
      if (schema.additionalProperties === false) {
        const allowedKeys = schema.properties ? Object.keys(schema.properties) : [];
        const extraKeys = Object.keys(payload).filter(key => !allowedKeys.includes(key));
        
        if (extraKeys.length > 0) {
          return { valid: false, error: `Additional properties not allowed: ${extraKeys.join(', ')}` };
        }
      }

      return { valid: true };
    } catch (error) {
      this.logger.error(`Payload validation error: ${error.message}`);
      return { valid: false, error: `Validation error: ${error.message}` };
    }
  }

  async validateHeaders(headers: Record<string, string>, requiredHeaders: string[]): Promise<{ valid: boolean; error?: string }> {
    const missingHeaders = requiredHeaders.filter(
      header => !headers[header.toLowerCase()]
    );

    if (missingHeaders.length > 0) {
      return { valid: false, error: `Missing required headers: ${missingHeaders.join(', ')}` };
    }

    return { valid: true };
  }

  async validateIPAddress(ip: string, allowedIPs: string[]): Promise<{ valid: boolean; error?: string }> {
    if (allowedIPs.length === 0) {
      return { valid: true };
    }

    // Support for CIDR notation and wildcards can be added here
    if (allowedIPs.includes(ip)) {
      return { valid: true };
    }

    // Check for wildcard patterns
    for (const allowedIP of allowedIPs) {
      if (allowedIP.includes('*')) {
        const pattern = allowedIP.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        if (regex.test(ip)) {
          return { valid: true };
        }
      }
    }

    return { valid: false, error: `IP address ${ip} not allowed` };
  }

  async validateContentType(contentType: string, allowedTypes: string[]): Promise<{ valid: boolean; error?: string }> {
    if (allowedTypes.length === 0) {
      return { valid: true };
    }

    const normalizedContentType = contentType.toLowerCase().split(';')[0].trim();
    
    if (allowedTypes.some(type => type.toLowerCase() === normalizedContentType)) {
      return { valid: true };
    }

    return { valid: false, error: `Content type ${contentType} not allowed` };
  }
}
