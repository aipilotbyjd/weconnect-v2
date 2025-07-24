import { Module } from '@nestjs/common';
import { NodeRegistryController } from './node-registry.controller';
import { NodeRegistryService } from './node-registry.service';
import { NodeExecutorService } from './node-executor.service';

@Module({
  controllers: [NodeRegistryController],
  providers: [NodeRegistryService, NodeExecutorService],
  exports: [NodeRegistryService, NodeExecutorService],
})
export class NodeRegistryModule { }
