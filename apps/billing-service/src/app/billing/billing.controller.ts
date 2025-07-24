import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpException,
  UseGuards,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

export interface CreatePlanDto {
  name: string;
  displayName: string;
  description?: string;
  price: number;
  yearlyPrice?: number;
  currency: string;
  interval: string;
  features: Record<string, any>;
  limits: Record<string, any>;
  stripePriceId?: string;
  stripeProductId?: string;
}

export interface CreateSubscriptionDto {
  organizationId: string;
  planId: string;
  trialEnd?: Date;
}

export interface UpdateSubscriptionDto {
  planId?: string;
  status?: string;
}

@ApiTags('billing')
@Controller('api/billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ==================== BILLING PLANS ====================

  @Get('plans')
  @ApiOperation({ summary: 'Get all billing plans' })
  @ApiResponse({ status: 200, description: 'Plans retrieved successfully' })
  async getPlans() {
    try {
      return await this.billingService.getPlans();
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve plans',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('plans')
  @ApiOperation({ summary: 'Create a new billing plan' })
  @ApiBody({ type: CreatePlanDto })
  @ApiResponse({ status: 201, description: 'Plan created successfully' })
  async createPlan(@Body() createPlanDto: CreatePlanDto) {
    try {
      return await this.billingService.createPlan(createPlanDto);
    } catch (error) {
      throw new HttpException(
        'Failed to create plan',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('plans/:id')
  @ApiOperation({ summary: 'Update a billing plan' })
  @ApiResponse({ status: 200, description: 'Plan updated successfully' })
  async updatePlan(
    @Param('id') id: string,
    @Body() updatePlanDto: Partial<CreatePlanDto>,
  ) {
    try {
      return await this.billingService.updatePlan(id, updatePlanDto);
    } catch (error) {
      throw new HttpException(
        'Failed to update plan',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('plans/:id')
  @ApiOperation({ summary: 'Delete a billing plan' })
  @ApiResponse({ status: 200, description: 'Plan deleted successfully' })
  async deletePlan(@Param('id') id: string) {
    try {
      return await this.billingService.deletePlan(id);
    } catch (error) {
      throw new HttpException(
        'Failed to delete plan',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==================== SUBSCRIPTIONS ====================

  @Get('subscriptions')
  @ApiOperation({ summary: 'Get all subscriptions' })
  @ApiResponse({ status: 200, description: 'Subscriptions retrieved successfully' })
  async getSubscriptions(
    @Query('organizationId') organizationId?: string,
    @Query('status') status?: string,
  ) {
    try {
      return await this.billingService.getSubscriptions({ organizationId, status });
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve subscriptions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('subscriptions/:id')
  @ApiOperation({ summary: 'Get subscription by ID' })
  @ApiResponse({ status: 200, description: 'Subscription retrieved successfully' })
  async getSubscription(@Param('id') id: string) {
    try {
      return await this.billingService.getSubscription(id);
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve subscription',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('subscriptions')
  @ApiOperation({ summary: 'Create a new subscription' })
  @ApiBody({ type: CreateSubscriptionDto })
  @ApiResponse({ status: 201, description: 'Subscription created successfully' })
  async createSubscription(@Body() createSubscriptionDto: CreateSubscriptionDto) {
    try {
      return await this.billingService.createSubscription(createSubscriptionDto);
    } catch (error) {
      throw new HttpException(
        'Failed to create subscription',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('subscriptions/:id')
  @ApiOperation({ summary: 'Update a subscription' })
  @ApiResponse({ status: 200, description: 'Subscription updated successfully' })
  async updateSubscription(
    @Param('id') id: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    try {
      return await this.billingService.updateSubscription(id, updateSubscriptionDto);
    } catch (error) {
      throw new HttpException(
        'Failed to update subscription',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('subscriptions/:id')
  @ApiOperation({ summary: 'Cancel a subscription' })
  @ApiResponse({ status: 200, description: 'Subscription canceled successfully' })
  async cancelSubscription(@Param('id') id: string) {
    try {
      return await this.billingService.cancelSubscription(id);
    } catch (error) {
      throw new HttpException(
        'Failed to cancel subscription',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==================== INVOICES ====================

  @Get('invoices')
  @ApiOperation({ summary: 'Get all invoices' })
  @ApiResponse({ status: 200, description: 'Invoices retrieved successfully' })
  async getInvoices(
    @Query('organizationId') organizationId?: string,
    @Query('status') status?: string,
  ) {
    try {
      return await this.billingService.getInvoices({ organizationId, status });
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve invoices',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiResponse({ status: 200, description: 'Invoice retrieved successfully' })
  async getInvoice(@Param('id') id: string) {
    try {
      return await this.billingService.getInvoice(id);
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve invoice',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('invoices/:id/pay')
  @ApiOperation({ summary: 'Process payment for an invoice' })
  @ApiResponse({ status: 200, description: 'Payment processed successfully' })
  async payInvoice(@Param('id') id: string) {
    try {
      return await this.billingService.payInvoice(id);
    } catch (error) {
      throw new HttpException(
        'Failed to process payment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==================== USAGE TRACKING ====================

  @Post('usage')
  @ApiOperation({ summary: 'Record usage for billing' })
  @ApiResponse({ status: 201, description: 'Usage recorded successfully' })
  async recordUsage(
    @Body()
    usageData: {
      organizationId: string;
      metricName: string;
      quantity: number;
      timestamp?: Date;
    },
  ) {
    try {
      return await this.billingService.recordUsage(usageData);
    } catch (error) {
      throw new HttpException(
        'Failed to record usage',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('usage/:organizationId')
  @ApiOperation({ summary: 'Get usage records for an organization' })
  @ApiResponse({ status: 200, description: 'Usage records retrieved successfully' })
  async getUsage(
    @Param('organizationId') organizationId: string,
    @Query('period') period?: string,
  ) {
    try {
      return await this.billingService.getUsage(organizationId, period);
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve usage',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==================== STRIPE WEBHOOKS ====================

  @Post('webhooks/stripe')
  @ApiOperation({ summary: 'Handle Stripe webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleStripeWebhook(@Body() payload: any) {
    try {
      return await this.billingService.handleStripeWebhook(payload);
    } catch (error) {
      throw new HttpException(
        'Failed to process webhook',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==================== ANALYTICS ====================

  @Get('analytics/revenue')
  @ApiOperation({ summary: 'Get revenue analytics' })
  @ApiResponse({ status: 200, description: 'Revenue analytics retrieved successfully' })
  async getRevenueAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      return await this.billingService.getRevenueAnalytics(startDate, endDate);
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve revenue analytics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('analytics/churn')
  @ApiOperation({ summary: 'Get churn analytics' })
  @ApiResponse({ status: 200, description: 'Churn analytics retrieved successfully' })
  async getChurnAnalytics() {
    try {
      return await this.billingService.getChurnAnalytics();
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve churn analytics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
