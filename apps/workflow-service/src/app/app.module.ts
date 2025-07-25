import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../../libs/src/lib/prisma/prisma.module';
import { WorkflowController } from './controllers/workflow.controller';
import { WorkflowService } from './services/workflow.service';
import { PrismaWorkflowRepository } from './repositories/prisma/workflow.repository';
import { PrismaVersionRepository } from './repositories/prisma/version.repository';

@Module({
  imports: [PrismaModule],
  controllers: [WorkflowController],
  providers: [
    WorkflowService,
    {
      provide: 'IWorkflowRepository',
      useClass: PrismaWorkflowRepository,
    },
    {
      provide: 'IVersionRepository', 
      useClass: PrismaVersionRepository,
    },
  ],
})
export class AppModule {}
