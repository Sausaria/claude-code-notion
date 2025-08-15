/**
 * Typed error taxonomy for Claude Code Notion
 * Provides discriminated unions for reliable error handling
 */

export type ErrorType = 
  | "Auth" 
  | "Timeout" 
  | "RateLimit" 
  | "CircuitOpen" 
  | "Validation" 
  | "Network" 
  | "NotFound"
  | "Unknown";

export interface CcnErrorDetails {
  type: ErrorType;
  message: string;
  code?: string;
  statusCode?: number;
  retryable: boolean;
  correlationId?: string;
  metadata?: Record<string, any>;
}

export class CcnError extends Error {
  public readonly type: ErrorType;
  public readonly code?: string;
  public readonly statusCode?: number;
  public readonly retryable: boolean;
  public readonly correlationId?: string;
  public readonly metadata?: Record<string, any>;

  constructor(details: CcnErrorDetails) {
    super(details.message);
    this.name = 'CcnError';
    this.type = details.type;
    this.code = details.code;
    this.statusCode = details.statusCode;
    this.retryable = details.retryable;
    this.correlationId = details.correlationId;
    this.metadata = details.metadata;
  }

  toJSON() {
    return {
      error: true,
      type: this.type,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      retryable: this.retryable,
      correlationId: this.correlationId,
      metadata: this.metadata
    };
  }

  static fromNotionError(error: any, correlationId?: string): CcnError {
    // Map Notion API errors to our taxonomy
    if (error.code === 'unauthorized' || error.status === 401) {
      return new CcnError({
        type: 'Auth',
        message: 'Authentication failed. Check your API key.',
        code: error.code,
        statusCode: 401,
        retryable: false,
        correlationId
      });
    }

    if (error.code === 'rate_limited' || error.status === 429) {
      return new CcnError({
        type: 'RateLimit',
        message: 'Rate limit exceeded. Please retry later.',
        code: error.code,
        statusCode: 429,
        retryable: true,
        correlationId,
        metadata: { retryAfter: error.headers?.['retry-after'] }
      });
    }

    if (error.code === 'object_not_found' || error.status === 404) {
      return new CcnError({
        type: 'NotFound',
        message: error.message || 'Resource not found',
        code: error.code,
        statusCode: 404,
        retryable: false,
        correlationId
      });
    }

    if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
      return new CcnError({
        type: 'Timeout',
        message: 'Request timed out',
        code: error.code,
        retryable: true,
        correlationId
      });
    }

    if (error.code?.startsWith('E') || error.status >= 500) {
      return new CcnError({
        type: 'Network',
        message: error.message || 'Network error occurred',
        code: error.code,
        statusCode: error.status,
        retryable: true,
        correlationId
      });
    }

    return new CcnError({
      type: 'Unknown',
      message: error.message || 'An unknown error occurred',
      code: error.code,
      statusCode: error.status,
      retryable: false,
      correlationId
    });
  }
}

// CLI exit codes mapping
export const EXIT_CODES = {
  SUCCESS: 0,
  GENERIC: 1,
  VALIDATION: 2,
  AUTH: 3,
  RATE_LIMIT: 4,
  NETWORK: 5,
  TIMEOUT: 6,
  CIRCUIT_OPEN: 7,
  NOT_FOUND: 8
} as const;

export function getExitCode(error: CcnError): number {
  switch (error.type) {
    case 'Validation': return EXIT_CODES.VALIDATION;
    case 'Auth': return EXIT_CODES.AUTH;
    case 'RateLimit': return EXIT_CODES.RATE_LIMIT;
    case 'Network': return EXIT_CODES.NETWORK;
    case 'Timeout': return EXIT_CODES.TIMEOUT;
    case 'CircuitOpen': return EXIT_CODES.CIRCUIT_OPEN;
    case 'NotFound': return EXIT_CODES.NOT_FOUND;
    default: return EXIT_CODES.GENERIC;
  }
}