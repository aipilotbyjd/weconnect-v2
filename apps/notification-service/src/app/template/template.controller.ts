import { Body, Controller, Get, Post, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TemplateService, Template } from './template.service';

@ApiTags('Templates')
@Controller('templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new template' })
  @ApiResponse({ status: 201, description: 'Template created successfully.' })
  createTemplate(@Body() template: Template) {
    const result = this.templateService.createTemplate(template);
    return {
      success: true,
      template: result,
      message: 'Template created successfully',
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully.' })
  getAllTemplates() {
    const templates = this.templateService.getAllTemplates();
    return {
      success: true,
      templates,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a template by ID' })
  @ApiResponse({ status: 200, description: 'Template retrieved successfully.' })
  getTemplate(@Param('id') id: string) {
    const template = this.templateService.getTemplate(id);
    return {
      success: !!template,
      template,
      message: template ? 'Template found' : 'Template not found',
    };
  }

  @Post(':id/render')
  @ApiOperation({ summary: 'Render a template with variables' })
  @ApiResponse({ status: 200, description: 'Template rendered successfully.' })
  renderTemplate(@Param('id') id: string, @Body() variables: Record<string, any>) {
    try {
      const content = this.templateService.renderTemplate(id, variables);
      return {
        success: true,
        content,
        message: 'Template rendered successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
