import { Client } from '@notionhq/client';
import { CcnError, EXIT_CODES, getExitCode } from './errors';
import { CircuitBreaker, CircuitBreakerConfig } from './circuit-breaker';
import {
  generateCorrelationId,
  redactSecrets,
  isPlaceholder,
  createTimeoutSignal,
  sleep,
  getKillSwitches,
  parseEnvBoolean,
  parseEnvNumber,
  getNotionVersion,
  getUserAgent,
  collectPages
} from './utils';

// Enterprise logging interface
export interface Logger {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
  event?(type: string, meta?: Record<string, unknown>): void;
}

// Default console logger with redaction
export const defaultLogger: Logger = {
  info: (msg, meta) => console.log(`[INFO] ${msg}`, redactMeta(meta)),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, redactMeta(meta)),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, redactMeta(meta)),
  event: (type, meta) => console.log(`[EVENT:${type}]`, redactMeta(meta))
};

function redactMeta(meta?: Record<string, unknown>): Record<string, unknown> | string {
  if (!meta) return '';
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (typeof value === 'string' && (key.toLowerCase().includes('key') || key.toLowerCase().includes('token'))) {
      redacted[key] = redactSecrets(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

// Timeout configuration
export interface TimeoutConfig {
  requestTimeoutMs?: number;    // Per-request timeout
  globalTimeoutMs?: number;      // Global operation timeout
}

// Retry configuration
export interface RetryConfig {
  attempts?: number;
  minDelayMs?: number;
  maxDelayMs?: number;
  jitter?: boolean;
  respectRetryAfter?: boolean;
}

// Idempotency configuration
export interface IdempotencyConfig {
  enabled?: boolean;
  ttlMs?: number;  // How long to remember operations
}

// Schema validation configuration
export interface SchemaConfig {
  validateOnStartup?: boolean;
  requiredProperties?: string[];
  propertyMapping?: Record<string, string>;
}

// Enterprise options for the SDK
export interface EnterpriseOptions {
  retries?: RetryConfig;
  idempotency?: IdempotencyConfig;
  circuitBreaker?: Partial<CircuitBreakerConfig>;
  timeout?: TimeoutConfig;
  schema?: SchemaConfig;
  dryRun?: boolean;
  logger?: Logger;
  redactSecrets?: boolean;
  correlationId?: string;  // Allow passing in correlation ID
}

// Core configuration interface
export interface RoadmapConfig {
  apiKey: string;
  databaseId: string;
  titleProperty?: string;
  statusProperty?: string;
  dateProperty?: string;
  enterprise?: EnterpriseOptions;
}

export interface RoadmapTask {
  id: string;
  title: string;
  status: string;
  priority?: string;
  url: string;
  objective?: string;
  userFlow?: string;
  description?: string;
  effort?: string;
  dependencies?: string;
  dueDate?: string;
  properties: Record<string, any>;
}

// Track idempotent operations
interface IdempotencyKey {
  pageId: string;
  operation: string;
  payloadHash: string;
  timestamp: number;
}

export class NotionRoadmapManager {
  private client: Client;
  private config: Required<RoadmapConfig>;
  private enterprise: Required<EnterpriseOptions>;
  private logger: Logger;
  private circuitBreaker: CircuitBreaker;
  private idempotencyCache: Map<string, IdempotencyKey> = new Map();
  private correlationId: string;
  private propertyIds: Record<string, string> = {};

  constructor(config: RoadmapConfig) {
    // Generate or use provided correlation ID
    this.correlationId = config.enterprise?.correlationId || generateCorrelationId();
    
    // Validate API key
    if (isPlaceholder(config.apiKey)) {
      throw new CcnError({
        type: 'Validation',
        message: 'API key appears to be a placeholder. Please provide a valid Notion API key.',
        retryable: false,
        correlationId: this.correlationId
      });
    }

    // Check kill switches
    const killSwitches = getKillSwitches();
    if (killSwitches.networkDisabled) {
      throw new CcnError({
        type: 'Validation',
        message: 'Network disabled via CCN_NETWORK_DISABLED environment variable',
        retryable: false,
        correlationId: this.correlationId
      });
    }

    this.config = {
      titleProperty: "Project name",
      statusProperty: "Status",
      dateProperty: "Date",
      enterprise: {},
      ...config
    };

    // Setup enterprise defaults with environment overrides
    this.enterprise = {
      retries: {
        attempts: parseEnvNumber(process.env.CCN_RETRY_ATTEMPTS, 3),
        minDelayMs: parseEnvNumber(process.env.CCN_RETRY_MIN_DELAY, 1000),
        maxDelayMs: parseEnvNumber(process.env.CCN_RETRY_MAX_DELAY, 30000),
        jitter: parseEnvBoolean(process.env.CCN_RETRY_JITTER, true),
        respectRetryAfter: true,
        ...config.enterprise?.retries
      },
      idempotency: {
        enabled: parseEnvBoolean(process.env.CCN_IDEMPOTENCY, false),
        ttlMs: parseEnvNumber(process.env.CCN_IDEMPOTENCY_TTL, 60000),
        ...config.enterprise?.idempotency
      },
      timeout: {
        requestTimeoutMs: parseEnvNumber(process.env.CCN_REQUEST_TIMEOUT, 15000),
        globalTimeoutMs: parseEnvNumber(process.env.CCN_GLOBAL_TIMEOUT, 120000),
        ...config.enterprise?.timeout
      },
      circuitBreaker: {
        enabled: parseEnvBoolean(process.env.CCN_CIRCUIT_BREAKER, true),
        failureThreshold: parseEnvNumber(process.env.CCN_CIRCUIT_THRESHOLD, 5),
        resetTimeoutMs: parseEnvNumber(process.env.CCN_CIRCUIT_RESET, 60000),
        successThreshold: parseEnvNumber(process.env.CCN_CIRCUIT_SUCCESS, 2),
        ...config.enterprise?.circuitBreaker
      },
      schema: {
        validateOnStartup: parseEnvBoolean(process.env.CCN_SCHEMA_VALIDATE, true),
        ...config.enterprise?.schema
      },
      dryRun: parseEnvBoolean(process.env.CCN_WRITE_DISABLED) || config.enterprise?.dryRun || false,
      logger: config.enterprise?.logger || defaultLogger,
      redactSecrets: config.enterprise?.redactSecrets !== false,
      correlationId: this.correlationId
    };

    this.logger = this.enterprise.logger;
    
    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker(this.enterprise.circuitBreaker as CircuitBreakerConfig);

    this.client = new Client({
      auth: config.apiKey,
      timeoutMs: this.enterprise.timeout.requestTimeoutMs,
      notionVersion: getNotionVersion()
    });

    // Log initialization
    this.logger.info('NotionRoadmapManager initialized', {
      correlationId: this.correlationId,
      databaseId: config.databaseId,
      dryRun: this.enterprise.dryRun,
      circuitBreakerEnabled: this.enterprise.circuitBreaker.enabled,
      idempotencyEnabled: this.enterprise.idempotency.enabled
    });

    // Validate schema if configured
    if (this.enterprise.schema.validateOnStartup) {
      this.validateSchema().catch(err => {
        this.logger.error('Schema validation failed', { error: err.message, correlationId: this.correlationId });
      });
    }
  }

  /**
   * Validate database schema matches expected configuration
   */
  private async validateSchema(): Promise<void> {
    try {
      const database = await this.client.databases.retrieve({
        database_id: this.config.databaseId
      });

      const properties = (database as any).properties;
      const requiredProps = this.enterprise.schema.requiredProperties || [
        this.config.titleProperty,
        this.config.statusProperty
      ];

      // Store property IDs for resilience
      this.propertyIds = {};
      for (const [name, prop] of Object.entries(properties)) {
        this.propertyIds[name] = (prop as any).id;
      }

      const missing = requiredProps.filter(prop => !properties[prop]);
      if (missing.length > 0) {
        throw new CcnError({
          type: 'Validation',
          message: `Missing required database properties: ${missing.join(', ')}`,
          retryable: false,
          correlationId: this.correlationId,
          metadata: { missing, available: Object.keys(properties) }
        });
      }

      // Check if database is archived
      if ((database as any).archived) {
        throw new CcnError({
          type: 'Validation',
          message: 'Database is archived and cannot be modified',
          retryable: false,
          correlationId: this.correlationId
        });
      }

      this.logger.info('Schema validation successful', {
        correlationId: this.correlationId,
        properties: Object.keys(properties),
        propertyIds: this.propertyIds
      });
    } catch (error) {
      throw CcnError.fromNotionError(error, this.correlationId);
    }
  }

  /**
   * Check if operation was recently performed (idempotency)
   */
  private checkIdempotency(key: string): boolean {
    if (!this.enterprise.idempotency.enabled) return false;
    
    const cached = this.idempotencyCache.get(key);
    if (!cached) return false;
    
    const age = Date.now() - cached.timestamp;
    if (age > this.enterprise.idempotency.ttlMs!) {
      this.idempotencyCache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Record operation for idempotency
   */
  private recordIdempotency(pageId: string, operation: string, payload: any): void {
    if (!this.enterprise.idempotency.enabled) return;
    
    const payloadHash = JSON.stringify(payload);
    const key = `${pageId}-${operation}-${payloadHash}`;
    
    this.idempotencyCache.set(key, {
      pageId,
      operation,
      payloadHash,
      timestamp: Date.now()
    });
    
    // Clean old entries
    for (const [k, v] of this.idempotencyCache.entries()) {
      if (Date.now() - v.timestamp > this.enterprise.idempotency.ttlMs!) {
        this.idempotencyCache.delete(k);
      }
    }
  }

  /**
   * Execute operation with circuit breaker, retries, and timeout
   */
  private async executeWithResilience<T>(
    operation: () => Promise<T>,
    operationName: string,
    metadata: Record<string, any> = {}
  ): Promise<T> {
    const operationId = generateCorrelationId();
    
    // Check kill switches
    const killSwitches = getKillSwitches();
    if (killSwitches.networkDisabled) {
      throw new CcnError({
        type: 'Validation',
        message: 'Network operations disabled via CCN_NETWORK_DISABLED',
        retryable: false,
        correlationId: this.correlationId
      });
    }

    // Execute with circuit breaker
    return this.circuitBreaker.execute(
      () => this.executeWithRetry(operation, operationName, { ...metadata, operationId }),
      this.correlationId
    );
  }

  /**
   * Execute operation with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    metadata: Record<string, any> = {}
  ): Promise<T> {
    const { attempts, minDelayMs, maxDelayMs, jitter, respectRetryAfter } = this.enterprise.retries;
    let lastError: any;

    for (let attempt = 1; attempt <= attempts!; attempt++) {
      try {
        this.logger.info(`Attempting ${operationName}`, {
          attempt,
          maxAttempts: attempts,
          correlationId: this.correlationId,
          ...metadata
        });

        // Create timeout promise
        const timeoutMs = this.enterprise.timeout.requestTimeoutMs!;
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new CcnError({
              type: 'Timeout',
              message: `Operation timed out after ${timeoutMs}ms`,
              retryable: true,
              correlationId: this.correlationId
            }));
          }, timeoutMs);
        });

        // Race operation against timeout
        const result = await Promise.race([operation(), timeoutPromise]);
        
        this.logger.info(`${operationName} succeeded`, {
          attempt,
          correlationId: this.correlationId,
          ...metadata
        });
        
        return result;
      } catch (error: any) {
        lastError = error;
        
        // Convert to typed error
        const ccnError = error instanceof CcnError ? error : CcnError.fromNotionError(error, this.correlationId);
        
        this.logger.warn(`${operationName} failed`, {
          attempt,
          error: ccnError.message,
          type: ccnError.type,
          retryable: ccnError.retryable,
          correlationId: this.correlationId,
          ...metadata
        });

        // Don't retry if not retryable
        if (!ccnError.retryable || attempt === attempts) {
          throw ccnError;
        }

        // Calculate delay
        const baseDelay = Math.min(minDelayMs! * Math.pow(2, attempt - 1), maxDelayMs!);
        const finalDelay = jitter ? baseDelay + (baseDelay * 0.1 * Math.random()) : baseDelay;

        // Honor Retry-After header
        const retryAfter = respectRetryAfter && ccnError.metadata?.retryAfter;
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : finalDelay;

        this.logger.info(`Retrying in ${Math.round(delay)}ms`, {
          attempt,
          delay,
          correlationId: this.correlationId
        });

        await sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Get health status of the service
   */
  async health(): Promise<{
    healthy: boolean;
    correlationId: string;
    circuitBreaker: any;
    config: {
      databaseId: string;
      dryRun: boolean;
      idempotency: boolean;
    };
    validation?: any;
  }> {
    const status = {
      healthy: true,
      correlationId: this.correlationId,
      circuitBreaker: this.circuitBreaker.getStatus(),
      config: {
        databaseId: this.config.databaseId,
        dryRun: this.enterprise.dryRun,
        idempotency: this.enterprise.idempotency.enabled!
      },
      validation: null as any
    };

    try {
      await this.validateSchema();
      status.validation = { valid: true };
    } catch (error: any) {
      status.healthy = false;
      status.validation = { valid: false, error: error.message };
    }

    return status;
  }

  /**
   * Update a task's status by name or ID
   */
  async updateTask(taskIdentifier: string, status: string): Promise<RoadmapTask> {
    // Check for dry run or write disabled
    if (this.enterprise.dryRun || getKillSwitches().writeDisabled) {
      this.logger.info('DRY RUN: Would update task', {
        taskIdentifier,
        status,
        correlationId: this.correlationId
      });
      return { id: 'dry-run', title: taskIdentifier, status } as RoadmapTask;
    }

    return this.executeWithResilience(async () => {
      const today = new Date().toISOString().split('T')[0];
      let pageId: string;

      // Check if taskIdentifier is a page ID or task name
      if (taskIdentifier.includes('-') && taskIdentifier.length > 20) {
        pageId = taskIdentifier;
      } else {
        // Search for the task by name
        const results = await this.search(taskIdentifier);
        if (results.length === 0) {
          throw new CcnError({
            type: 'NotFound',
            message: `Task "${taskIdentifier}" not found in the roadmap`,
            retryable: false,
            correlationId: this.correlationId
          });
        }
        pageId = results[0].id;
      }

      // Check idempotency
      const idempotencyKey = `${pageId}-updateStatus-${status}`;
      if (this.checkIdempotency(idempotencyKey)) {
        this.logger.info('Skipping duplicate operation (idempotency)', {
          pageId,
          operation: 'updateStatus',
          correlationId: this.correlationId
        });
        return this.getTaskById(pageId);
      }

      // Preflight check: verify page exists and is not archived
      const currentPage = await this.client.pages.retrieve({ page_id: pageId });
      if ((currentPage as any).archived) {
        throw new CcnError({
          type: 'Validation',
          message: 'Cannot update archived page',
          retryable: false,
          correlationId: this.correlationId
        });
      }

      // Use property IDs if available for resilience
      const statusPropId = this.propertyIds[this.config.statusProperty] || this.config.statusProperty;
      const datePropId = this.propertyIds[this.config.dateProperty] || this.config.dateProperty;

      // Update the task
      const response = await this.client.pages.update({
        page_id: pageId,
        properties: {
          [statusPropId]: {
            select: { name: status }
          },
          [datePropId]: {
            date: { start: today }
          }
        }
      });

      // Record idempotency
      this.recordIdempotency(pageId, 'updateStatus', { status });

      return this.parseTask(response);
    }, 'updateTask', { taskIdentifier, status });
  }

  /**
   * Get task by ID
   */
  private async getTaskById(pageId: string): Promise<RoadmapTask> {
    const page = await this.client.pages.retrieve({ page_id: pageId });
    return this.parseTask(page);
  }

  /**
   * Parse Notion page to RoadmapTask
   */
  private parseTask(page: any): RoadmapTask {
    const props = page.properties;
    
    return {
      id: page.id,
      title: this.getPropertyValue(props[this.config.titleProperty]),
      status: this.getPropertyValue(props[this.config.statusProperty]),
      priority: this.getPropertyValue(props.Priority),
      url: page.url,
      properties: props
    };
  }

  /**
   * Get property value from Notion property
   */
  private getPropertyValue(property: any): string {
    if (!property) return '';
    
    switch (property.type) {
      case 'title':
        return property.title[0]?.plain_text || '';
      case 'rich_text':
        return property.rich_text[0]?.plain_text || '';
      case 'select':
        return property.select?.name || '';
      case 'multi_select':
        return property.multi_select.map((s: any) => s.name).join(', ');
      case 'date':
        return property.date?.start || '';
      case 'number':
        return property.number?.toString() || '';
      case 'checkbox':
        return property.checkbox ? 'Yes' : 'No';
      case 'url':
        return property.url || '';
      case 'email':
        return property.email || '';
      case 'phone_number':
        return property.phone_number || '';
      default:
        return '';
    }
  }

  /**
   * Search for tasks with enhanced filters
   */
  async search(query: string, options?: {
    filter?: 'page' | 'database';
    sort?: 'last_edited' | 'created';
    includeArchived?: boolean;
  }): Promise<RoadmapTask[]> {
    return this.executeWithResilience(async () => {
      // Use property ID if available for resilience
      const titlePropId = this.propertyIds[this.config.titleProperty] || this.config.titleProperty;
      
      const queryOptions: any = {
        database_id: this.config.databaseId,
        filter: {
          and: [
            {
              property: titlePropId,
              title: { contains: query }
            }
          ]
        },
        page_size: 100
      };

      // Add archived filter
      if (!options?.includeArchived) {
        queryOptions.filter.and.push({
          property: 'archived',
          checkbox: { equals: false }
        });
      }

      // Add sort
      if (options?.sort) {
        queryOptions.sorts = [{
          timestamp: options.sort === 'last_edited' ? 'last_edited_time' : 'created_time',
          direction: 'descending'
        }];
      }

      // Collect all pages with pagination
      const allResults = await collectPages(async (cursor) => {
        const response = await this.client.databases.query({
          ...queryOptions,
          start_cursor: cursor
        });
        return {
          results: response.results,
          has_more: response.has_more,
          next_cursor: response.next_cursor
        };
      });

      return allResults.map(page => this.parseTask(page));
    }, 'search', { query, options });
  }

  /**
   * Mark task as completed
   */
  async complete(taskName: string): Promise<RoadmapTask> {
    return this.updateTask(taskName, "Completed");
  }

  /**
   * Mark task as in progress
   */
  async start(taskName: string): Promise<RoadmapTask> {
    return this.updateTask(taskName, "In progress");
  }

  /**
   * Mark task as planned
   */
  async plan(taskName: string): Promise<RoadmapTask> {
    return this.updateTask(taskName, "Planned");
  }

  /**
   * List all tasks with pagination
   */
  async list(options?: {
    pageSize?: number;
    includeArchived?: boolean;
  }): Promise<RoadmapTask[]> {
    return this.executeWithResilience(async () => {
      const queryOptions: any = {
        database_id: this.config.databaseId,
        page_size: options?.pageSize || 100
      };

      // Filter out archived by default
      if (!options?.includeArchived) {
        queryOptions.filter = {
          property: 'archived',
          checkbox: { equals: false }
        };
      }

      // Collect all pages with pagination
      const allResults = await collectPages(async (cursor) => {
        const response = await this.client.databases.query({
          ...queryOptions,
          start_cursor: cursor
        });
        return {
          results: response.results,
          has_more: response.has_more,
          next_cursor: response.next_cursor
        };
      });

      return allResults.map(page => this.parseTask(page));
    }, 'list', { options });
  }

  /**
   * Get tasks by status
   */
  async getByStatus(status: string): Promise<RoadmapTask[]> {
    return this.executeWithResilience(async () => {
      const response = await this.client.databases.query({
        database_id: this.config.databaseId,
        filter: {
          property: this.config.statusProperty,
          select: { equals: status }
        }
      });

      return response.results.map(page => this.parseTask(page));
    }, 'getByStatus', { status });
  }

  /**
   * Get circuit breaker status
   */
  getCircuitStatus() {
    return this.circuitBreaker.getStatus();
  }

  /**
   * Reset circuit breaker
   */
  resetCircuit() {
    this.circuitBreaker.reset();
    this.logger.info('Circuit breaker reset', { correlationId: this.correlationId });
  }

  /**
   * Batch update multiple tasks
   */
  async batchUpdate(updates: Array<{ taskIdentifier: string; status: string }>, options?: {
    concurrency?: number;
    continueOnError?: boolean;
  }): Promise<{
    succeeded: RoadmapTask[];
    failed: Array<{ taskIdentifier: string; error: string }>;
  }> {
    const concurrency = options?.concurrency || 3;
    const succeeded: RoadmapTask[] = [];
    const failed: Array<{ taskIdentifier: string; error: string }> = [];

    // Process in batches
    for (let i = 0; i < updates.length; i += concurrency) {
      const batch = updates.slice(i, i + concurrency);
      const promises = batch.map(async ({ taskIdentifier, status }) => {
        try {
          const result = await this.updateTask(taskIdentifier, status);
          succeeded.push(result);
        } catch (error: any) {
          const errorMessage = error instanceof CcnError ? error.message : String(error);
          failed.push({ taskIdentifier, error: errorMessage });
          
          if (!options?.continueOnError) {
            throw error;
          }
        }
      });

      await Promise.allSettled(promises);
    }

    this.logger.info('Batch update completed', {
      correlationId: this.correlationId,
      succeeded: succeeded.length,
      failed: failed.length
    });

    return { succeeded, failed };
  }

  /**
   * Get statistics about tasks
   */
  async getStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    recentlyUpdated: number;
    archived: number;
  }> {
    return this.executeWithResilience(async () => {
      const allTasks = await this.list({ includeArchived: true });
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;

      const stats = {
        total: allTasks.length,
        byStatus: {} as Record<string, number>,
        byPriority: {} as Record<string, number>,
        recentlyUpdated: 0,
        archived: 0
      };

      for (const task of allTasks) {
        // Count by status
        stats.byStatus[task.status] = (stats.byStatus[task.status] || 0) + 1;
        
        // Count by priority
        if (task.priority) {
          stats.byPriority[task.priority] = (stats.byPriority[task.priority] || 0) + 1;
        }
        
        // Count archived
        if ((task.properties as any).archived?.checkbox) {
          stats.archived++;
        }
      }

      return stats;
    }, 'getStats');
  }

  /**
   * Export tasks to CSV format
   */
  async exportCSV(options?: { includeArchived?: boolean }): Promise<string> {
    const tasks = await this.list(options);
    
    const headers = ['ID', 'Title', 'Status', 'Priority', 'URL'];
    const rows = tasks.map(task => [
      task.id,
      task.title,
      task.status,
      task.priority || '',
      task.url
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csv;
  }

  /**
   * Get all unique statuses in the database
   */
  async getUniqueStatuses(): Promise<string[]> {
    const tasks = await this.list();
    const statuses = new Set(tasks.map(t => t.status).filter(Boolean));
    return Array.from(statuses).sort();
  }
}

/**
 * Factory function with validation
 */
export function createRoadmapManager(config: RoadmapConfig): NotionRoadmapManager {
  if (!config.apiKey) {
    throw new CcnError({
      type: 'Validation',
      message: 'Notion API key is required',
      retryable: false,
      correlationId: generateCorrelationId()
    });
  }
  if (!config.databaseId) {
    throw new CcnError({
      type: 'Validation',
      message: 'Notion database ID is required',
      retryable: false,
      correlationId: generateCorrelationId()
    });
  }
  
  return new NotionRoadmapManager(config);
}

/**
 * Create from environment with validation
 */
export function createRoadmapFromEnv(
  databaseId: string,
  options?: EnterpriseOptions,
  apiKeyEnv = 'NOTION_API_KEY'
): NotionRoadmapManager {
  const apiKey = process.env[apiKeyEnv];
  if (!apiKey) {
    throw new CcnError({
      type: 'Validation',
      message: `Environment variable ${apiKeyEnv} is required`,
      retryable: false,
      correlationId: generateCorrelationId()
    });
  }
  
  return createRoadmapManager({
    apiKey,
    databaseId,
    enterprise: options
  });
}

// Export everything for backward compatibility
export * from './errors';
export * from './circuit-breaker';
export * from './utils';