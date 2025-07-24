import { Injectable, Logger } from '@nestjs/common';

export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open',
}

export interface CircuitBreakerOptions {
  failureThreshold: number; // Number of failures before opening
  recoveryTimeout: number; // Time to wait before transitioning to half-open (ms)
  monitoringWindow: number; // Time window for monitoring failures (ms)
  expectedErrors?: string[]; // Errors that should not trigger circuit breaker
}

export interface CircuitBreakerStats {
  serviceName: string;
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  nextAttemptTime?: Date;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits = new Map<string, CircuitBreakerStats>();
  private readonly options = new Map<string, CircuitBreakerOptions>();

  /**
   * Configure circuit breaker for a service
   */
  configure(serviceName: string, options: CircuitBreakerOptions): void {
    this.options.set(serviceName, options);
    
    if (!this.circuits.has(serviceName)) {
      this.circuits.set(serviceName, {
        serviceName,
        state: CircuitBreakerState.CLOSED,
        failureCount: 0,
        successCount: 0,
      });
    }

    this.logger.log(`Circuit breaker configured for service: ${serviceName}`);
  }

  /**
   * Check if a request should be allowed through the circuit breaker
   */
  canExecute(serviceName: string): boolean {
    const circuit = this.getOrCreateCircuit(serviceName);
    const now = new Date();

    switch (circuit.state) {
      case CircuitBreakerState.CLOSED:
        return true;

      case CircuitBreakerState.OPEN:
        if (this.shouldTransitionToHalfOpen(serviceName, now)) {
          this.transitionToHalfOpen(serviceName);
          return true;
        }
        return false;

      case CircuitBreakerState.HALF_OPEN:
        return true;

      default:
        return true;
    }
  }

  /**
   * Record a successful execution
   */
  recordSuccess(serviceName: string): void {
    const circuit = this.getOrCreateCircuit(serviceName);
    
    circuit.successCount++;
    circuit.lastSuccessTime = new Date();

    if (circuit.state === CircuitBreakerState.HALF_OPEN) {
      this.transitionToClosed(serviceName);
    } else if (circuit.state === CircuitBreakerState.CLOSED) {
      // Reset failure count on success in closed state
      circuit.failureCount = 0;
    }

    this.logger.debug(`Success recorded for service: ${serviceName}`);
  }

  /**
   * Record a failed execution
   */
  recordFailure(serviceName: string, error?: Error): void {
    const circuit = this.getOrCreateCircuit(serviceName);
    const options = this.getOptions(serviceName);

    // Check if this is an expected error that shouldn't trigger circuit breaker
    if (error && options.expectedErrors?.includes(error.name)) {
      this.logger.debug(`Expected error ignored for circuit breaker: ${error.name}`);
      return;
    }

    circuit.failureCount++;
    circuit.lastFailureTime = new Date();

    if (circuit.state === CircuitBreakerState.HALF_OPEN) {
      this.transitionToOpen(serviceName);
    } else if (circuit.state === CircuitBreakerState.CLOSED) {
      if (circuit.failureCount >= options.failureThreshold) {
        this.transitionToOpen(serviceName);
      }
    }

    this.logger.warn(`Failure recorded for service: ${serviceName} (${circuit.failureCount}/${options.failureThreshold})`);
  }

  /**
   * Get circuit breaker statistics for a service
   */
  getStats(serviceName: string): CircuitBreakerStats {
    return this.getOrCreateCircuit(serviceName);
  }

  /**
   * Get statistics for all services
   */
  getAllStats(): CircuitBreakerStats[] {
    return Array.from(this.circuits.values());
  }

  /**
   * Reset circuit breaker for a service
   */
  reset(serviceName: string): void {
    const circuit = this.getOrCreateCircuit(serviceName);
    
    circuit.state = CircuitBreakerState.CLOSED;
    circuit.failureCount = 0;
    circuit.successCount = 0;
    circuit.lastFailureTime = undefined;
    circuit.lastSuccessTime = undefined;
    circuit.nextAttemptTime = undefined;

    this.logger.log(`Circuit breaker reset for service: ${serviceName}`);
  }

  /**
   * Force open a circuit breaker (for maintenance)
   */
  forceOpen(serviceName: string): void {
    const circuit = this.getOrCreateCircuit(serviceName);
    circuit.state = CircuitBreakerState.OPEN;
    circuit.nextAttemptTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    this.logger.log(`Circuit breaker forced open for service: ${serviceName}`);
  }

  /**
   * Force close a circuit breaker
   */
  forceClose(serviceName: string): void {
    const circuit = this.getOrCreateCircuit(serviceName);
    circuit.state = CircuitBreakerState.CLOSED;
    circuit.failureCount = 0;
    circuit.nextAttemptTime = undefined;
    
    this.logger.log(`Circuit breaker forced closed for service: ${serviceName}`);
  }

  private getOrCreateCircuit(serviceName: string): CircuitBreakerStats {
    if (!this.circuits.has(serviceName)) {
      this.circuits.set(serviceName, {
        serviceName,
        state: CircuitBreakerState.CLOSED,
        failureCount: 0,
        successCount: 0,
      });
    }
    return this.circuits.get(serviceName)!;
  }

  private getOptions(serviceName: string): CircuitBreakerOptions {
    return this.options.get(serviceName) || {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringWindow: 60000, // 1 minute
    };
  }

  private shouldTransitionToHalfOpen(serviceName: string, now: Date): boolean {
    const circuit = this.circuits.get(serviceName);
    if (!circuit || !circuit.nextAttemptTime) {
      return false;
    }
    return now.getTime() >= circuit.nextAttemptTime.getTime();
  }

  private transitionToOpen(serviceName: string): void {
    const circuit = this.circuits.get(serviceName)!;
    const options = this.getOptions(serviceName);
    
    circuit.state = CircuitBreakerState.OPEN;
    circuit.nextAttemptTime = new Date(Date.now() + options.recoveryTimeout);
    
    this.logger.warn(`Circuit breaker OPENED for service: ${serviceName}`);
  }

  private transitionToHalfOpen(serviceName: string): void {
    const circuit = this.circuits.get(serviceName)!;
    
    circuit.state = CircuitBreakerState.HALF_OPEN;
    circuit.nextAttemptTime = undefined;
    
    this.logger.log(`Circuit breaker transitioned to HALF-OPEN for service: ${serviceName}`);
  }

  private transitionToClosed(serviceName: string): void {
    const circuit = this.circuits.get(serviceName)!;
    
    circuit.state = CircuitBreakerState.CLOSED;
    circuit.failureCount = 0;
    circuit.nextAttemptTime = undefined;
    
    this.logger.log(`Circuit breaker CLOSED for service: ${serviceName}`);
  }
}
