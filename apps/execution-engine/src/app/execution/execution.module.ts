import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { OrchestratorService } from './orchestrator.service';
import { TaskProcessor } from './task.processor';
import { WorkflowProcessor } from './workflow.processor';
import { NodeExecutorService } from './node-executor.service';
import { WorkflowExecutorService } from './workflow-executor.service';
import { ExecutionController } from './execution.controller';
import { DatabaseModule } from '../../../../../libs/src/lib/database.module';

@Module({
  imports: [
    DatabaseModule,
    HttpModule,
    EventEmitterModule.forRoot(),
    BullModule.registerQueue({
      name: 'task-queue',
    }),
    BullModule.registerQueue({
      name: 'workflow-queue',
    }),
  ],
  controllers: [ExecutionController],
  providers: [
    OrchestratorService, 
    TaskProcessor, 
    WorkflowProcessor, 
    NodeExecutorService,
    WorkflowExecutorService
  ],
  exports: [
    OrchestratorService, 
    WorkflowExecutorService
  ],
})
export class ExecutionModule {}

