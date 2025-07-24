import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@weconnect-v2/shared/prisma';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private prisma: PrismaService) {}

  // ==================== BILLING PLANS ====================

  async getPlans() {
    this.logger.log('Fetching all billing plans');
    return await this.prisma.billingPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createPlan(data: {
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
  }) {
    this.logger.log(`Creating billing plan: ${data.name}`);
    return await this.prisma.billingPlan.create({
      data: {
        ...data,
        price: new Decimal(data.price),
        yearlyPrice: data.yearlyPrice ? new Decimal(data.yearlyPrice) : null,
      },
    });
  }

  async updatePlan(id: string, data: any) {
    this.logger.log(`Updating billing plan: ${id}`);
    return await this.prisma.billingPlan.update({
      where: { id },
      data: {
        ...data,
        price: data.price ? new Decimal(data.price) : undefined,
        yearlyPrice: data.yearlyPrice ? new Decimal(data.yearlyPrice) : undefined,
      },
    });
  }

  async deletePlan(id: string) {
    this.logger.log(`Deleting billing plan: ${id}`);
    return await this.prisma.billingPlan.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ==================== SUBSCRIPTIONS ====================

  async getSubscriptions(filters: { organizationId?: string; status?: string }) {
    this.logger.log('Fetching subscriptions with filters:', filters);
    return await this.prisma.subscription.findMany({
      where: {
        ...(filters.organizationId && { organizationId: filters.organizationId }),
        ...(filters.status && { status: filters.status as any }),
      },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
        plan: {
          select: { id: true, name: true, displayName: true, price: true },
        },
      },
    });
  }

  async getSubscription(id: string) {
    this.logger.log(`Fetching subscription: ${id}`);
    return await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        organization: true,
        plan: true,
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        usageRecords: {
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
      },
    });
  }

  async createSubscription(data: {
    organizationId: string;
    planId: string;
    trialEnd?: Date;
  }) {
    this.logger.log(`Creating subscription for organization: ${data.organizationId}`);
    
    const plan = await this.prisma.billingPlan.findUnique({
      where: { id: data.planId },
    });

    if (!plan) {
      throw new Error('Billing plan not found');
    }

    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

    return await this.prisma.subscription.create({
      data: {
        organizationId: data.organizationId,
        planId: data.planId,
        currentPeriodStart,
        currentPeriodEnd,
        trialEnd: data.trialEnd,
        status: data.trialEnd ? 'TRIALING' : 'ACTIVE',
      },
      include: {
        organization: true,
        plan: true,
      },
    });
  }

  async updateSubscription(id: string, data: { planId?: string; status?: string }) {
    this.logger.log(`Updating subscription: ${id}`);
    return await this.prisma.subscription.update({
      where: { id },
      data,
      include: {
        organization: true,
        plan: true,
      },
    });
  }

  async cancelSubscription(id: string) {
    this.logger.log(`Canceling subscription: ${id}`);
    return await this.prisma.subscription.update({
      where: { id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
      },
    });
  }

  // ==================== INVOICES ====================

  async getInvoices(filters: { organizationId?: string; status?: string }) {
    this.logger.log('Fetching invoices with filters:', filters);
    return await this.prisma.invoice.findMany({
      where: {
        ...(filters.organizationId && { organizationId: filters.organizationId }),
        ...(filters.status && { status: filters.status as any }),
      },
      include: {
        subscription: {
          include: {
            organization: { select: { id: true, name: true } },
            plan: { select: { id: true, name: true, displayName: true } },
          },
        },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInvoice(id: string) {
    this.logger.log(`Fetching invoice: ${id}`);
    return await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        subscription: {
          include: {
            organization: true,
            plan: true,
          },
        },
        items: true,
      },
    });
  }

  async createInvoice(subscriptionId: string, items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>) {
    this.logger.log(`Creating invoice for subscription: ${subscriptionId}`);
    
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { organization: true },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const tax = subtotal * 0.1; // 10% tax
    const amount = subtotal + tax;

    const invoiceNumber = `INV-${Date.now()}`;

    return await this.prisma.invoice.create({
      data: {
        subscriptionId,
        organizationId: subscription.organizationId,
        number: invoiceNumber,
        amount: new Decimal(amount),
        subtotal: new Decimal(subtotal),
        tax: new Decimal(tax),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        billingPeriodStart: subscription.currentPeriodStart,
        billingPeriodEnd: subscription.currentPeriodEnd,
        items: {
          create: items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: new Decimal(item.unitPrice),
            amount: new Decimal(item.quantity * item.unitPrice),
          })),
        },
      },
      include: {
        items: true,
      },
    });
  }

  async payInvoice(id: string) {
    this.logger.log(`Processing payment for invoice: ${id}`);
    return await this.prisma.invoice.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    });
  }

  // ==================== USAGE TRACKING ====================

  async recordUsage(data: {
    organizationId: string;
    metricName: string;
    quantity: number;
    timestamp?: Date;
  }) {
    this.logger.log(`Recording usage for organization: ${data.organizationId}`);
    
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId: data.organizationId },
    });

    if (!subscription) {
      throw new Error('No active subscription found');
    }

    const timestamp = data.timestamp || new Date();
    const billingPeriod = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}`;

    return await this.prisma.usageRecord.create({
      data: {
        subscriptionId: subscription.id,
        organizationId: data.organizationId,
        metricName: data.metricName,
        quantity: new Decimal(data.quantity),
        timestamp,
        billingPeriod,
      },
    });
  }

  async getUsage(organizationId: string, period?: string) {
    this.logger.log(`Fetching usage for organization: ${organizationId}`);
    return await this.prisma.usageRecord.findMany({
      where: {
        organizationId,
        ...(period && { billingPeriod: period }),
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  // ==================== STRIPE WEBHOOKS ====================

  async handleStripeWebhook(payload: any) {
    this.logger.log(`Processing Stripe webhook: ${payload.type}`);
    
    switch (payload.type) {
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(payload.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(payload.data.object);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(payload.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(payload.data.object);
        break;
      default:
        this.logger.warn(`Unhandled webhook type: ${payload.type}`);
    }

    return { received: true };
  }

  private async handleInvoicePaymentSucceeded(stripeInvoice: any) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { stripeInvoiceId: stripeInvoice.id },
    });

    if (invoice) {
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'PAID',
          paidAt: new Date(stripeInvoice.status_transitions.paid_at * 1000),
        },
      });
    }
  }

  private async handleInvoicePaymentFailed(stripeInvoice: any) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { stripeInvoiceId: stripeInvoice.id },
    });

    if (invoice) {
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'UNCOLLECTIBLE' },
      });
    }
  }

  private async handleSubscriptionUpdated(stripeSubscription: any) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (subscription) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: stripeSubscription.status.toUpperCase(),
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        },
      });
    }
  }

  private async handleSubscriptionDeleted(stripeSubscription: any) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (subscription) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'CANCELED',
          canceledAt: new Date(),
        },
      });
    }
  }

  // ==================== ANALYTICS ====================

  async getRevenueAnalytics(startDate?: string, endDate?: string) {
    this.logger.log('Fetching revenue analytics');
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const invoices = await this.prisma.invoice.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
        status: 'PAID',
      },
      select: {
        amount: true,
        createdAt: true,
        currency: true,
      },
    });

    const totalRevenue = invoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0);
    const revenueByMonth = invoices.reduce((acc, invoice) => {
      const month = invoice.createdAt.toISOString().substring(0, 7);
      acc[month] = (acc[month] || 0) + Number(invoice.amount);
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRevenue: totalRevenue / 100, // Convert from cents
      revenueByMonth,
      invoiceCount: invoices.length,
      averageInvoiceValue: invoices.length > 0 ? totalRevenue / invoices.length / 100 : 0,
    };
  }

  async getChurnAnalytics() {
    this.logger.log('Fetching churn analytics');
    
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalSubscriptions, canceledThisMonth, canceledLastMonth] = await Promise.all([
      this.prisma.subscription.count({
        where: { status: { in: ['ACTIVE', 'TRIALING'] } },
      }),
      this.prisma.subscription.count({
        where: {
          status: 'CANCELED',
          canceledAt: {
            gte: thisMonth,
            lt: now,
          },
        },
      }),
      this.prisma.subscription.count({
        where: {
          status: 'CANCELED',
          canceledAt: {
            gte: lastMonth,
            lt: thisMonth,
          },
        },
      }),
    ]);

    const churnRateThisMonth = totalSubscriptions > 0 ? (canceledThisMonth / totalSubscriptions) * 100 : 0;
    const churnRateLastMonth = totalSubscriptions > 0 ? (canceledLastMonth / totalSubscriptions) * 100 : 0;

    return {
      totalActiveSubscriptions: totalSubscriptions,
      canceledThisMonth,
      canceledLastMonth,
      churnRateThisMonth: Math.round(churnRateThisMonth * 100) / 100,
      churnRateLastMonth: Math.round(churnRateLastMonth * 100) / 100,
      churnTrend: churnRateThisMonth - churnRateLastMonth,
    };
  }

  // ==================== PLAN LIMITS ENFORCEMENT ====================

  async checkPlanLimits(organizationId: string, resource: string): Promise<boolean> {
    this.logger.log(`Checking plan limits for organization: ${organizationId}`);
    
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });

    if (!subscription || !subscription.plan) {
      return false;
    }

    const limits = subscription.plan.limits as any;
    
    switch (resource) {
      case 'workflows':
        const workflowCount = await this.prisma.workflow.count({
          where: { organizationId },
        });
        return workflowCount < (limits.maxWorkflows || Infinity);
        
      case 'users':
        const userCount = await this.prisma.user.count({
          where: { organizationId },
        });
        return userCount < (limits.maxUsers || Infinity);
        
      case 'executions':
        const currentMonth = new Date().toISOString().substring(0, 7);
        const executionCount = await this.prisma.usageRecord.aggregate({
          where: {
            organizationId,
            metricName: 'workflow_executions',
            billingPeriod: currentMonth,
          },
          _sum: { quantity: true },
        });
        const totalExecutions = Number(executionCount._sum.quantity || 0);
        return totalExecutions < (limits.maxExecutionsPerMonth || Infinity);
        
      default:
        return true;
    }
  }
}
