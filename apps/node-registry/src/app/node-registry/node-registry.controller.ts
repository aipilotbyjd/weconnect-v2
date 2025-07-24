import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NodeRegistryService } from './node-registry.service';

@ApiTags('node-registry')
@Controller('nodes')
export class NodeRegistryController {
  constructor(private readonly nodeRegistryService: NodeRegistryService) { }

  @Get()
  @ApiOperation({ summary: 'Get all available node definitions' })
  @ApiResponse({ status: 200, description: 'List of node definitions retrieved' })
  async getAllNodes() {
    return this.nodeRegistryService.getAllNodes();
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get node categories' })
  async getCategories() {
    return this.nodeRegistryService.getCategories();
  }

  @Get(':name')
  @ApiOperation({ summary: 'Get node definition by name' })
  @ApiResponse({ status: 200, description: 'Node definition found' })
  @ApiResponse({ status: 404, description: 'Node definition not found' })
  async getNodeByName(@Param('name') name: string) {
    return this.nodeRegistryService.getNodeDefinition(name);
  }

  @Post()
  @ApiOperation({ summary: 'Register a new node definition' })
  @ApiResponse({ status: 201, description: 'Node definition registered successfully' })
  async registerNode(@Body() nodeDefinition: any) {
    return this.nodeRegistryService.registerNode(nodeDefinition);
  }

  @Put(':name')
  @ApiOperation({ summary: 'Update node definition' })
  async updateNode(@Param('name') name: string, @Body() updates: any) {
    return this.nodeRegistryService.updateNode(name, updates);
  }

  @Delete(':name')
  @ApiOperation({ summary: 'Remove node definition' })
  async removeNode(@Param('name') name: string) {
    return this.nodeRegistryService.removeNode(name);
  }

  @Post(':name/validate')
  @ApiOperation({ summary: 'Validate node configuration' })
  async validateNode(@Param('name') name: string, @Body() config: any) {
    return this.nodeRegistryService.validateNodeConfig(name, config);
  }
}
