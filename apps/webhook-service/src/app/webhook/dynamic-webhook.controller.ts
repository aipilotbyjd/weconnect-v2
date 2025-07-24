import { Controller, All, Param, Req, Res, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';
import { WebhookSecurityService } from './webhook-security.service';
import { WebhookValidationService } from './webhook-validation.service';

@ApiTags('Dynamic Webhooks')
@Controller('webhook')
export class DynamicWebhookController {
  private readonly logger = new Logger(DynamicWebhookController.name);
  private readonly activeConnections = new Map<string, number>();

  constructor(
    private readonly webhookService: WebhookService,
    private readonly securityService: WebhookSecurityService,
    private readonly validationService: WebhookValidationService,
  ) {}

  @All('*')
  @ApiOperation({ 
    summary: 'Handle dynamic webhook requests',
    description: 'Processes webhook requests for any configured path with any HTTP method'
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @ApiResponse({ status: 401, description: 'Authentication failed' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async handleWebhook(@Param() params: any, @Req() req: Request, @Res() res: Response) {
    const startTime = Date.now();
    const path = req.params[0] || req.url.replace('/webhook/', '').replace(/^\//,'');
    const method = req.method.toUpperCase();
    const ip = this.getClientIp(req);
    const userAgent = req.get('User-Agent') || 'unknown';
    const connectionId = `${ip}:${Date.now()}`;

    try {
      // Track active connections
      this.trackConnection(connectionId);

      this.logger.log(`Webhook request: ${method} /${path} from ${ip}`);
      this.logger.debug(`Headers: ${JSON.stringify(req.headers)}`);
      this.logger.debug(`Query: ${JSON.stringify(req.query)}`);

      // Security validation
      await this.securityService.validateRequest(req, ip);

      // Extract and process payload
      let payload = await this.extractPayload(req);
      
      // Process headers
      const headers = this.normalizeHeaders(req.headers);
      headers['x-original-payload'] = JSON.stringify(payload);

      // Execute webhook
      const result = await this.webhookService.executeWebhook(
        method,
        path,
        payload,
        headers,
        req.query as Record<string, string>,
        ip,
        userAgent
      );

      // Add execution metrics
      const duration = Date.now() - startTime;
      const responseData = {
        ...result,
        _meta: {
          executionTime: duration,
          timestamp: new Date().toISOString(),
          webhook: { method, path }
        }
      };

      this.logger.log(`Webhook completed: ${method} /${path} in ${duration}ms`);

      // Set response headers
      res.setHeader('X-Webhook-Execution-Time', duration.toString());
      res.setHeader('X-Webhook-ID', result.executionId || 'unknown');
      res.setHeader('Content-Type', 'application/json');

      // Handle custom webhook response format
      if (result.webhook_response) {
        const webhookResponse = result.webhook_response;
        res.status(webhookResponse.statusCode || 200);
        
        if (webhookResponse.headers) {
          Object.entries(webhookResponse.headers).forEach(([key, value]) => {
            res.set(key, value as string);
          });
        }

        if (typeof webhookResponse.body === 'string') {
          return res.send(webhookResponse.body);
        } else {
          return res.json(webhookResponse.body);
        }
      }

      return res.status(HttpStatus.OK).json(responseData);

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error(`Webhook failed: ${method} /${path} - ${error.message}`, {
        error: error.stack,
        ip,
        userAgent,
        duration,
      });

      const errorResponse = this.mapErrorToResponse(error, { method, path, ip, duration });
      
      res.setHeader('X-Webhook-Execution-Time', duration.toString());
      res.setHeader('Content-Type', 'application/json');
      
      return res.status(errorResponse.status).json(errorResponse.body);
      
    } finally {
      this.untrackConnection(connectionId);
    }
  }

  @All('_health')
  @ApiOperation({ summary: 'Webhook service health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck(@Res() res: Response) {
    const stats = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      activeConnections: this.activeConnections.size,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
    };

    return res.status(HttpStatus.OK).json(stats);
  }

  private async extractPayload(req: Request): Promise<any> {
    let payload = {};
    
    if (req.is('application/json')) {
      payload = req.body || {};
    } else if (req.is('application/x-www-form-urlencoded')) {
      payload = req.body || {};
    } else if (req.is('multipart/form-data')) {
      payload = { 
        body: req.body || {},
        files: (req as any).files || []
      };
    } else if (req.is('text/*')) {
      payload = { text: req.body };
    } else if (req.is('application/xml') || req.is('text/xml')) {
      payload = { xml: req.body };
    } else {
      payload = { raw: req.body };
    }

    return payload;
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'] as string;
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    return (
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection as any)?.socket?.remoteAddress ||
      'unknown'
    );
  }

  private normalizeHeaders(headers: any): Record<string, string> {
    const normalized: Record<string, string> = {};
    
    Object.keys(headers).forEach(key => {
      const normalizedKey = key.toLowerCase();
      const value = headers[key];
      
      if (Array.isArray(value)) {
        normalized[normalizedKey] = value.join(', ');
      } else if (typeof value === 'string') {
        normalized[normalizedKey] = value;
      } else {
        normalized[normalizedKey] = String(value);
      }
    });
    
    return normalized;
  }

  private trackConnection(connectionId: string): void {
    const count = this.activeConnections.get(connectionId) || 0;
    this.activeConnections.set(connectionId, count + 1);
    
    // Cleanup old connections
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    for (const [id, _] of this.activeConnections.entries()) {
      const timestamp = parseInt(id.split(':')[1] || '0');
      if (timestamp < fiveMinutesAgo) {
        this.activeConnections.delete(id);
      }
    }
  }

  private untrackConnection(connectionId: string): void {
    const count = this.activeConnections.get(connectionId) || 0;
    if (count <= 1) {
      this.activeConnections.delete(connectionId);
    } else {
      this.activeConnections.set(connectionId, count - 1);
    }
  }

  private mapErrorToResponse(error: any, context: any) {
    const baseResponse = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      path: `${context.method} /${context.path}`,
      executionTime: context.duration,
    };

    if (error instanceof HttpException) {
      return {
        status: error.getStatus(),
        body: { ...baseResponse, ...error.getResponse() }
      };
    }

    // Map specific errors to HTTP status codes
    if (error.message.includes('not found') || error.message.includes('Webhook not found')) {
      return {
        status: HttpStatus.NOT_FOUND,
        body: { ...baseResponse, code: 'WEBHOOK_NOT_FOUND' }
      };
    }

    if (error.message.includes('Rate limit')) {
      return {
        status: HttpStatus.TOO_MANY_REQUESTS,
        body: { ...baseResponse, code: 'RATE_LIMIT_EXCEEDED' }
      };
    }

    if (error.message.includes('Authentication')) {
      return {
        status: HttpStatus.UNAUTHORIZED,
        body: { ...baseResponse, code: 'AUTHENTICATION_FAILED' }
      };
    }

    if (error.message.includes('validation') || error.message.includes('Invalid')) {
      return {
        status: HttpStatus.BAD_REQUEST,
        body: { ...baseResponse, code: 'VALIDATION_FAILED' }
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { ...baseResponse, code: 'INTERNAL_ERROR' }
    };
  }
}
