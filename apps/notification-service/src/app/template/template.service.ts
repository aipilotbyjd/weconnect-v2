import { Injectable, Logger } from '@nestjs/common';

export interface Template {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push';
  subject?: string;
  content: string;
  variables: string[];
}

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private templates = new Map<string, Template>();

  createTemplate(template: Template): Template {
    this.templates.set(template.id, template);
    this.logger.log(`Template created: ${template.name}`);
    return template;
  }

  getTemplate(id: string): Template | null {
    return this.templates.get(id) || null;
  }

  renderTemplate(templateId: string, variables: Record<string, any>): string {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    let content = template.content;
    
    // Simple variable replacement - could use Handlebars, Mustache, etc.
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, String(value));
    }

    return content;
  }

  getAllTemplates(): Template[] {
    return Array.from(this.templates.values());
  }
}
