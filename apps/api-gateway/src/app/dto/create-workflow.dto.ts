import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class NodeDto {
  @ApiProperty({
    description: 'Node ID',
    example: 'node-1'
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Node type',
    example: 'trigger'
  })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Node parameters',
    example: { webhook: { method: 'POST' } }
  })
  parameters: any;

  @ApiProperty({
    description: 'Node position',
    example: { x: 100, y: 200 }
  })
  position: { x: number; y: number };
}

export class ConnectionDto {
  @ApiProperty({
    description: 'Connection ID',
    example: 'connection-1'
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Source node ID',
    example: 'node-1'
  })
  @IsString()
  sourceNodeId: string;

  @ApiProperty({
    description: 'Target node ID',
    example: 'node-2'
  })
  @IsString()
  targetNodeId: string;

  @ApiProperty({
    description: 'Source output port',
    example: 'main'
  })
  @IsString()
  sourceOutput: string;

  @ApiProperty({
    description: 'Target input port',
    example: 'main'
  })
  @IsString()
  targetInput: string;
}

export class CreateWorkflowDto {
  @ApiProperty({
    description: 'Workflow name',
    example: 'My Automation Workflow'
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Workflow description (optional)',
    example: 'This workflow automates customer onboarding',
    required: false
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Workflow nodes (optional)',
    type: [NodeDto],
    required: false
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NodeDto)
  nodes?: NodeDto[];

  @ApiProperty({
    description: 'Workflow connections (optional)',
    type: [ConnectionDto],
    required: false
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConnectionDto)
  connections?: ConnectionDto[];
}
