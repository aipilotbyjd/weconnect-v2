import { IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { NodeDto, ConnectionDto } from './create-workflow.dto';

export class CreateVersionDto {
  @ApiProperty({
    description: 'Workflow nodes',
    type: [NodeDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NodeDto)
  nodes: NodeDto[];

  @ApiProperty({
    description: 'Workflow connections',
    type: [ConnectionDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConnectionDto)
  connections: ConnectionDto[];
}
