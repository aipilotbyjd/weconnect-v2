import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Param, 
  Body, 
  UseGuards, 
  HttpCode, 
  HttpStatus,
  Patch
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowServiceClient } from '../services/workflow-service.client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/user.decorator';
import { CreateWorkflowDto } from '../dto/create-workflow.dto';
import { UpdateWorkflowDto } from '../dto/update-workflow.dto';
import { CreateVersionDto } from '../dto/create-version.dto';

@ApiTags('workflows')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('workflows')
export class WorkflowController {
  constructor(private readonly workflowServiceClient: WorkflowServiceClient) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workflow' })
  @ApiResponse({ 
    status: 201, 
    description: 'Workflow created successfully',
    schema: {
      example: {
        id: 'clxxxxxxxxxxxxxxx',
        name: 'My Automation Workflow',
        description: 'This workflow automates customer onboarding',
        userId: 'clxxxxxxxxxxxxxxx',
        isActive: false,
        version: 1,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  async createWorkflow(@Body() createWorkflowDto: CreateWorkflowDto, @CurrentUser() user: any) {
    return this.workflowServiceClient.createWorkflow(createWorkflowDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all workflows for current user' })
  @ApiResponse({ 
    status: 200, 
    description: 'User workflows retrieved',
    schema: {
      type: 'array',
      items: {
        example: {
          id: 'clxxxxxxxxxxxxxxx',
          name: 'My Automation Workflow',
          description: 'This workflow automates customer onboarding',
          userId: 'clxxxxxxxxxxxxxxx',
          isActive: false,
          version: 1,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      }
    }
  })
  async getUserWorkflows(@CurrentUser() user: any) {
    return this.workflowServiceClient.getUserWorkflows(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Workflow found',
    schema: {
      example: {
        id: 'clxxxxxxxxxxxxxxx',
        name: 'My Automation Workflow',
        description: 'This workflow automates customer onboarding',
        userId: 'clxxxxxxxxxxxxxxx',
        isActive: false,
        version: 1,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async getWorkflowById(@Param('id') id: string) {
    return this.workflowServiceClient.getWorkflowById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update workflow' })
  @ApiResponse({ 
    status: 200, 
    description: 'Workflow updated',
    schema: {
      example: {
        id: 'clxxxxxxxxxxxxxxx',
        name: 'Updated Workflow Name',
        description: 'Updated workflow description',
        userId: 'clxxxxxxxxxxxxxxx',
        isActive: true,
        version: 1,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async updateWorkflow(@Param('id') id: string, @Body() updateWorkflowDto: UpdateWorkflowDto) {
    return this.workflowServiceClient.updateWorkflow(id, updateWorkflowDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete workflow' })
  @ApiResponse({ status: 204, description: 'Workflow deleted' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async deleteWorkflow(@Param('id') id: string) {
    return this.workflowServiceClient.deleteWorkflow(id);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate workflow' })
  @ApiResponse({ status: 200, description: 'Workflow activated' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({ status: 400, description: 'Cannot activate workflow without nodes' })
  async activateWorkflow(@Param('id') id: string) {
    await this.workflowServiceClient.activateWorkflow(id);
    return { message: 'Workflow activated successfully' };
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate workflow' })
  @ApiResponse({ status: 200, description: 'Workflow deactivated' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async deactivateWorkflow(@Param('id') id: string) {
    await this.workflowServiceClient.deactivateWorkflow(id);
    return { message: 'Workflow deactivated successfully' };
  }

  @Post(':id/versions')
  @ApiOperation({ summary: 'Create a new version of the workflow' })
  @ApiResponse({ 
    status: 201, 
    description: 'Workflow version created',
    schema: {
      example: {
        id: 'clxxxxxxxxxxxxxxx',
        workflowId: 'clxxxxxxxxxxxxxxx',
        version: 2,
        data: {
          nodes: [],
          connections: []
        },
        createdAt: '2023-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async createVersion(@Param('id') workflowId: string, @Body() createVersionDto: CreateVersionDto) {
    return this.workflowServiceClient.createVersion(workflowId, createVersionDto);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get all versions of a workflow' })
  @ApiResponse({ 
    status: 200, 
    description: 'Workflow versions retrieved',
    schema: {
      type: 'array',
      items: {
        example: {
          id: 'clxxxxxxxxxxxxxxx',
          workflowId: 'clxxxxxxxxxxxxxxx',
          version: 1,
          data: {
            nodes: [],
            connections: []
          },
          createdAt: '2023-01-01T00:00:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async getWorkflowVersions(@Param('id') workflowId: string) {
    return this.workflowServiceClient.getWorkflowVersions(workflowId);
  }
}
