import { Injectable, Logger } from '@nestjs/common';
import { ServiceRegistryService, ServiceInstance } from '../service-registry/service-registry.service';

export type LoadBalancingAlgorithm = 'round-robin' | 'weighted-round-robin' | 'least-connections' | 'random' | 'ip-hash';

export interface LoadBalancedService {
  instance: ServiceInstance;
  connections: number;
  lastUsed: Date;
}

@Injectable()
export class LoadBalancerService {
  private readonly logger = new Logger(LoadBalancerService.name);
  private readonly serviceConnections = new Map<string, Map<string, LoadBalancedService>>();
  private readonly roundRobinCounters = new Map<string, number>();

  constructor(private readonly serviceRegistry: ServiceRegistryService) {}

  /**
   * Get next service instance using specified load balancing algorithm
   */
  getNextInstance(
    serviceName: string, 
    algorithm: LoadBalancingAlgorithm = 'round-robin',
    clientIp?: string
  ): ServiceInstance | null {
    const instances = this.serviceRegistry.getHealthyInstances(serviceName);
    
    if (instances.length === 0) {
      this.logger.warn(`No healthy instances available for service: ${serviceName}`);
      return null;
    }

    if (instances.length === 1) {
      this.incrementConnections(serviceName, instances[0].id);
      return instances[0];
    }

    switch (algorithm) {
      case 'round-robin':
        return this.roundRobin(serviceName, instances);
      case 'weighted-round-robin':
        return this.weightedRoundRobin(serviceName, instances);
      case 'least-connections':
        return this.leastConnections(serviceName, instances);
      case 'random':
        return this.random(instances);
      case 'ip-hash':
        return this.ipHash(instances, clientIp || '');
      default:
        return this.roundRobin(serviceName, instances);
    }
  }

  /**
   * Round Robin load balancing
   */
  private roundRobin(serviceName: string, instances: ServiceInstance[]): ServiceInstance {
    const counter = this.roundRobinCounters.get(serviceName) || 0;
    const nextIndex = counter % instances.length;
    const selectedInstance = instances[nextIndex];
    
    this.roundRobinCounters.set(serviceName, counter + 1);
    this.incrementConnections(serviceName, selectedInstance.id);
    
    return selectedInstance;
  }

  /**
   * Weighted Round Robin load balancing
   */
  private weightedRoundRobin(serviceName: string, instances: ServiceInstance[]): ServiceInstance {
    const totalWeight = instances.reduce((sum, instance) => sum + instance.weight, 0);
    let randomWeight = Math.random() * totalWeight;
    
    for (const instance of instances) {
      randomWeight -= instance.weight;
      if (randomWeight <= 0) {
        this.incrementConnections(serviceName, instance.id);
        return instance;
      }
    }
    
    // Fallback to first instance
    this.incrementConnections(serviceName, instances[0].id);
    return instances[0];
  }

  /**
   * Least Connections load balancing
   */
  private leastConnections(serviceName: string, instances: ServiceInstance[]): ServiceInstance {
    if (!this.serviceConnections.has(serviceName)) {
      this.serviceConnections.set(serviceName, new Map());
    }
    
    const connections = this.serviceConnections.get(serviceName)!;
    let minConnections = Infinity;
    let selectedInstance = instances[0];
    
    for (const instance of instances) {
      const connectionCount = connections.get(instance.id)?.connections || 0;
      if (connectionCount < minConnections) {
        minConnections = connectionCount;
        selectedInstance = instance;
      }
    }
    
    this.incrementConnections(serviceName, selectedInstance.id);
    return selectedInstance;
  }

  /**
   * Random load balancing
   */
  private random(instances: ServiceInstance[]): ServiceInstance {
    const randomIndex = Math.floor(Math.random() * instances.length);
    const selectedInstance = instances[randomIndex];
    this.incrementConnections('random', selectedInstance.id);
    return selectedInstance;
  }

  /**
   * IP Hash load balancing (sticky sessions)
   */
  private ipHash(instances: ServiceInstance[], clientIp: string): ServiceInstance {
    if (!clientIp) {
      return this.random(instances);
    }
    
    let hash = 0;
    for (let i = 0; i < clientIp.length; i++) {
      hash = ((hash << 5) - hash + clientIp.charCodeAt(i)) & 0xffffffff;
    }
    
    const index = Math.abs(hash) % instances.length;
    const selectedInstance = instances[index];
    this.incrementConnections('ip-hash', selectedInstance.id);
    return selectedInstance;
  }

  /**
   * Increment connection count for an instance
   */
  private incrementConnections(serviceName: string, instanceId: string): void {
    if (!this.serviceConnections.has(serviceName)) {
      this.serviceConnections.set(serviceName, new Map());
    }
    
    const connections = this.serviceConnections.get(serviceName)!;
    const current = connections.get(instanceId);
    
    if (current) {
      current.connections++;
      current.lastUsed = new Date();
    } else {
      const instance = this.serviceRegistry.getServiceById(instanceId);
      if (instance) {
        connections.set(instanceId, {
          instance,
          connections: 1,
          lastUsed: new Date(),
        });
      }
    }
  }

  /**
   * Decrement connection count when request completes
   */
  releaseConnection(serviceName: string, instanceId: string): void {
    const connections = this.serviceConnections.get(serviceName);
    if (connections) {
      const current = connections.get(instanceId);
      if (current && current.connections > 0) {
        current.connections--;
      }
    }
  }

  /**
   * Get load balancing statistics
   */
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [serviceName, connections] of this.serviceConnections.entries()) {
      const serviceStats = {
        totalInstances: connections.size,
        connections: Array.from(connections.values()).map(conn => ({
          instanceId: conn.instance.id,
          host: conn.instance.host,
          port: conn.instance.port,
          activeConnections: conn.connections,
          lastUsed: conn.lastUsed,
        })),
      };
      
      stats[serviceName] = serviceStats;
    }
    
    return stats;
  }

  /**
   * Reset connection counts (useful for testing)
   */
  resetStats(): void {
    this.serviceConnections.clear();
    this.roundRobinCounters.clear();
    this.logger.log('Load balancer stats reset');
  }
}
