import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedBillingPlans() {
  console.log('🌱 Seeding billing plans...');

  // Create billing plans
  const plans = [
    {
      name: 'free',
      displayName: 'Free',
      description: 'Perfect for individuals getting started with workflow automation',
      price: 0,
      yearlyPrice: 0,
      currency: 'USD',
      interval: 'month',
      features: {
        workflows: true,
        basicNodes: true,
        webhooks: true,
        scheduling: false,
        analytics: false,
        collaboration: false,
        priority_support: false,
        sla: false,
        custom_branding: false,
        sso: false,
      },
      limits: {
        maxUsers: 1,
        maxWorkflows: 3,
        maxExecutionsPerMonth: 100,
        maxStorageGB: 0.5,
        maxAPICallsPerMonth: 1000,
        maxWebhooks: 2,
        executionHistoryDays: 7,
      },
      sortOrder: 1,
    },
    {
      name: 'starter',
      displayName: 'Starter',
      description: 'Ideal for small teams and growing businesses',
      price: 2000, // $20.00 in cents
      yearlyPrice: 20000, // $200.00 yearly (2 months free)
      currency: 'USD',
      interval: 'month',
      features: {
        workflows: true,
        basicNodes: true,
        advancedNodes: true,
        webhooks: true,
        scheduling: true,
        analytics: true,
        collaboration: true,
        email_support: true,
        priority_support: false,
        sla: false,
        custom_branding: false,
        sso: false,
      },
      limits: {
        maxUsers: 5,
        maxWorkflows: 50,
        maxExecutionsPerMonth: 10000,
        maxStorageGB: 10,
        maxAPICallsPerMonth: 50000,
        maxWebhooks: 25,
        executionHistoryDays: 30,
      },
      sortOrder: 2,
    },
    {
      name: 'professional',
      displayName: 'Professional',
      description: 'Advanced features for scaling organizations',
      price: 5000, // $50.00 in cents
      yearlyPrice: 50000, // $500.00 yearly (2 months free)
      currency: 'USD',
      interval: 'month',
      features: {
        workflows: true,
        basicNodes: true,
        advancedNodes: true,
        premiumNodes: true,
        webhooks: true,
        scheduling: true,
        analytics: true,
        advanced_analytics: true,
        collaboration: true,
        advanced_collaboration: true,
        email_support: true,
        priority_support: true,
        sla: '99.5%',
        custom_branding: true,
        sso: false,
        api_access: true,
        custom_nodes: true,
      },
      limits: {
        maxUsers: 25,
        maxWorkflows: 500,
        maxExecutionsPerMonth: 100000,
        maxStorageGB: 100,
        maxAPICallsPerMonth: 500000,
        maxWebhooks: 100,
        executionHistoryDays: 90,
        maxRetentionDays: 365,
      },
      sortOrder: 3,
    },
    {
      name: 'enterprise',
      displayName: 'Enterprise',
      description: 'Complete solution for large enterprises with custom requirements',
      price: 15000, // $150.00 in cents
      yearlyPrice: 150000, // $1500.00 yearly (2 months free)
      currency: 'USD',
      interval: 'month',
      features: {
        workflows: true,
        basicNodes: true,
        advancedNodes: true,
        premiumNodes: true,
        enterpriseNodes: true,
        webhooks: true,
        scheduling: true,
        analytics: true,
        advanced_analytics: true,
        custom_analytics: true,
        collaboration: true,
        advanced_collaboration: true,
        enterprise_collaboration: true,
        email_support: true,
        priority_support: true,
        dedicated_support: true,
        sla: '99.9%',
        custom_branding: true,
        sso: true,
        saml: true,
        api_access: true,
        custom_nodes: true,
        on_premise: true,
        audit_logs: true,
        compliance: 'SOC2, GDPR, HIPAA',
      },
      limits: {
        maxUsers: -1, // unlimited
        maxWorkflows: -1, // unlimited
        maxExecutionsPerMonth: -1, // unlimited
        maxStorageGB: -1, // unlimited
        maxAPICallsPerMonth: -1, // unlimited
        maxWebhooks: -1, // unlimited
        executionHistoryDays: -1, // unlimited
        maxRetentionDays: -1, // unlimited
      },
      sortOrder: 4,
    },
  ];

  for (const plan of plans) {
    await prisma.billingPlan.upsert({
      where: { name: plan.name },
      create: plan,
      update: plan,
    });
    console.log(`✅ Created/Updated billing plan: ${plan.displayName}`);
  }

  console.log('🎉 Billing plans seeded successfully!');
}

export async function seedFeatures() {
  console.log('🌱 Seeding features...');

  const features = [
    {
      name: 'workflows',
      displayName: 'Visual Workflow Builder',
      description: 'Drag-and-drop workflow creation',
      category: 'core',
    },
    {
      name: 'basic_nodes',
      displayName: 'Basic Nodes',
      description: 'HTTP, Email, Database, and file operations',
      category: 'nodes',
    },
    {
      name: 'advanced_nodes',
      displayName: 'Advanced Nodes',
      description: 'API integrations, webhooks, and data transformations',
      category: 'nodes',
    },
    {
      name: 'premium_nodes',
      displayName: 'Premium Nodes',
      description: 'Enterprise integrations (Salesforce, HubSpot, etc.)',
      category: 'nodes',
    },
    {
      name: 'webhooks',
      displayName: 'Webhooks',
      description: 'Dynamic webhook endpoints',
      category: 'integrations',
    },
    {
      name: 'scheduling',
      displayName: 'Workflow Scheduling',
      description: 'Cron-based workflow automation',
      category: 'automation',
    },
    {
      name: 'analytics',
      displayName: 'Basic Analytics',
      description: 'Workflow execution tracking and basic metrics',
      category: 'analytics',
    },
    {
      name: 'advanced_analytics',
      displayName: 'Advanced Analytics',
      description: 'Detailed performance metrics and custom dashboards',
      category: 'analytics',
    },
    {
      name: 'collaboration',
      displayName: 'Team Collaboration',
      description: 'Share workflows and collaborate with team members',
      category: 'collaboration',
    },
    {
      name: 'sso',
      displayName: 'Single Sign-On',
      description: 'SAML and OAuth2 authentication',
      category: 'security',
    },
    {
      name: 'custom_branding',
      displayName: 'Custom Branding',
      description: 'White-label solution with custom branding',
      category: 'customization',
    },
    {
      name: 'priority_support',
      displayName: 'Priority Support',
      description: '24/7 priority customer support',
      category: 'support',
    },
  ];

  for (const feature of features) {
    await prisma.feature.upsert({
      where: { name: feature.name },
      create: feature,
      update: feature,
    });
    console.log(`✅ Created/Updated feature: ${feature.displayName}`);
  }

  console.log('🎉 Features seeded successfully!');
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedBillingPlans()
    .then(() => seedFeatures())
    .then(() => {
      console.log('🌟 All billing data seeded successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error seeding billing data:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
