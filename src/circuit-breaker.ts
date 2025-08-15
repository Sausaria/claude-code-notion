/**
 * Circuit Breaker implementation for Notion API resilience
 */

import { CcnError } from './errors';

export interface CircuitBreakerConfig {
  failureThreshold: number;  // Number of failures to open circuit
  resetTimeoutMs: number;     // Time to wait before half-open
  successThreshold: number;   // Successes needed to close from half-open
  enabled: boolean;          // Feature flag
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private nextRetryTime?: Date;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(
    operation: () => Promise<T>,
    correlationId?: string
  ): Promise<T> {
    if (!this.config.enabled) {
      return operation();
    }

    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === 'OPEN' && this.shouldAttemptReset()) {
      this.state = 'HALF_OPEN';
      this.successCount = 0;
    }

    // Fail fast if circuit is OPEN
    if (this.state === 'OPEN') {
      throw new CcnError({
        type: 'CircuitOpen',
        message: `Circuit breaker is open. Service unavailable until ${this.nextRetryTime?.toISOString()}`,
        retryable: true,
        correlationId,
        metadata: {
          state: this.state,
          failureCount: this.failureCount,
          nextRetryTime: this.nextRetryTime
        }
      });
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.state === 'HALF_OPEN') {
      this.openCircuit();
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.openCircuit();
    }
  }

  private openCircuit(): void {
    this.state = 'OPEN';
    this.nextRetryTime = new Date(Date.now() + this.config.resetTimeoutMs);
  }

  private shouldAttemptReset(): boolean {
    return this.nextRetryTime ? Date.now() >= this.nextRetryTime.getTime() : false;
  }

  getStatus(): {
    state: CircuitState;
    failureCount: number;
    lastFailureTime?: Date;
    nextRetryTime?: Date;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextRetryTime: this.nextRetryTime
    };
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.nextRetryTime = undefined;
  }
}