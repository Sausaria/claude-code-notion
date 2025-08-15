/**
 * Utility functions for Claude Code Notion
 */

import * as crypto from 'crypto';

/**
 * Generate a correlation ID for request tracking
 */
export function generateCorrelationId(): string {
  return `ccn-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Redact sensitive information from strings
 */
export function redactSecrets(value: string): string {
  // Redact Notion API keys
  if (value.startsWith('secret_') || value.startsWith('ntn_')) {
    return value.substring(0, 10) + '***';
  }
  
  // Redact other potential secrets
  if (value.length > 20 && /^[a-zA-Z0-9_-]+$/.test(value)) {
    return value.substring(0, 8) + '***';
  }
  
  return value;
}

/**
 * Check if a value looks like a placeholder
 */
export function isPlaceholder(value: string): boolean {
  const placeholders = [
    'your_api_key_here',
    'your_token_here',
    'placeholder',
    'example',
    'demo',
    'test_token',
    'xxx',
    'todo',
    'change_me'
  ];
  
  const lower = value.toLowerCase();
  return placeholders.some(p => lower.includes(p));
}

/**
 * Create an abort signal with timeout
 */
export function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse environment variable as boolean
 */
export function parseEnvBoolean(value: string | undefined, defaultValue = false): boolean {
  if (!value) return defaultValue;
  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
}

/**
 * Parse environment variable as number
 */
export function parseEnvNumber(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get kill switch status
 */
export function getKillSwitches() {
  return {
    writeDisabled: parseEnvBoolean(process.env.CCN_WRITE_DISABLED),
    networkDisabled: parseEnvBoolean(process.env.CCN_NETWORK_DISABLED)
  };
}

/**
 * Format error for JSON output
 */
export function formatJsonError(error: any, correlationId?: string) {
  return {
    success: false,
    error: true,
    message: error.message,
    type: error.type || 'Unknown',
    code: error.code,
    correlationId: correlationId || error.correlationId,
    timestamp: new Date().toISOString()
  };
}

/**
 * Format success for JSON output
 */
export function formatJsonSuccess(result: any, correlationId?: string) {
  return {
    success: true,
    error: false,
    result,
    correlationId,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get Notion API version from environment or default
 */
export function getNotionVersion(): string {
  return process.env.NOTION_VERSION || '2022-06-28';  // Latest stable version
}

/**
 * Generate User-Agent string
 */
export function getUserAgent(): string {
  const pkg = require('../package.json');
  const app = process.env.APP_NAME || 'unknown';
  const env = process.env.NODE_ENV || 'development';
  return `claude-code-notion/${pkg.version} (app=${app}; env=${env})`;
}

/**
 * Async generator for paginated results
 */
export async function* paginate<T>(
  fetchPage: (cursor?: string) => Promise<{
    results: T[];
    has_more: boolean;
    next_cursor: string | null;
  }>,
  pageSize = 100
): AsyncGenerator<T, void, unknown> {
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await fetchPage(cursor);
    
    for (const item of response.results) {
      yield item;
    }
    
    hasMore = response.has_more;
    cursor = response.next_cursor || undefined;
  }
}

/**
 * Collect all pages into array
 */
export async function collectPages<T>(
  fetchPage: (cursor?: string) => Promise<{
    results: T[];
    has_more: boolean;
    next_cursor: string | null;
  }>
): Promise<T[]> {
  const allResults: T[] = [];
  
  for await (const item of paginate(fetchPage)) {
    allResults.push(item);
  }
  
  return allResults;
}