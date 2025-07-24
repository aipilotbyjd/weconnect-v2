import { Module } from '@nestjs/common';
import { LoadBalancerService } from './load-balancer.service';
import { LoadBalancerController } from './load-balancer.controller';
import { ServiceRegistryModule } from '../service-registry/service-registry.module';

@Module({
  imports: [ServiceRegistryModule],
  controllers: [LoadBalancerController],
  providers: [LoadBalancerService],
  exports: [LoadBalancerService],
})
export class LoadBalancerModule {}
