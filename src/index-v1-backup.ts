import { Client } from '@notionhq/client';

// Enterprise logging interface
export interface Logger {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
  event?(type: string, meta?: Record<string, unknown>): void;
}

// Default console logger
export const defaultLogger: Logger = {
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta || ''),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta || ''),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta || ''),
  event: (type, meta) => console.log(`[EVENT:${type}]`, meta || '')
};

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
}

// Enterprise options for the SDK
export interface EnterpriseOptions {
  retries?: RetryConfig;
  idempotency?: IdempotencyConfig;
  dryRun?: boolean;
  logger?: Logger;
  redactSecrets?: boolean;
}

// Core configuration interface
export interface RoadmapConfig {
  apiKey: string;
  databaseId: string;
  titleProperty?: string;
  statusProperty?: string;
  dateProperty?: string;
  // Enterprise options (opt-in)
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

export class NotionRoadmapManager {
  private client: Client;
  private config: Required<RoadmapConfig>;
  private enterprise: Required<EnterpriseOptions>;
  private logger: Logger;

  constructor(config: RoadmapConfig) {
    this.config = {
      titleProperty: "Project name",
      statusProperty: "Status",
      dateProperty: "Date",
      enterprise: {},
      ...config
    };

    // Setup enterprise defaults
    this.enterprise = {
      retries: {
        attempts: 3,
        minDelayMs: 1000,
        maxDelayMs: 30000,
        jitter: true,
        respectRetryAfter: true,
        ...config.enterprise?.retries
      },
      idempotency: {
        enabled: false,
        ...config.enterprise?.idempotency
      },
      dryRun: config.enterprise?.dryRun || false,
      logger: config.enterprise?.logger || defaultLogger,
      redactSecrets: config.enterprise?.redactSecrets !== false
    };

    this.logger = this.enterprise.logger;
    
    this.client = new Client({
      auth: this.config.apiKey,
    });
  }

  /**
   * Execute operation with retry/backoff logic
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    metadata: Record<string, unknown> = {}
  ): Promise<T> {
    const { attempts, minDelayMs, maxDelayMs, jitter, respectRetryAfter } = this.enterprise.retries;
    let lastError: any;

    for (let attempt = 1; attempt <= attempts!; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 1) {
          this.logger.info(`Operation succeeded on attempt ${attempt}`, {
            operation: operationName,
            attempt,
            ...metadata
          });
        }
        
        return result;
      } catch (error: any) {
        lastError = error;
        
        this.logger.warn(`Attempt ${attempt} failed`, {
          operation: operationName,
          attempt,
          error: error.message,
          code: error.code,
          status: error.status,
          ...metadata
        });
        
        // Don't retry on authentication or client errors (4xx except 429)
        if (error.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
          break;
        }
        
        // Don't retry on final attempt
        if (attempt === attempts!) {
          break;
        }
        
        // Calculate delay with jitter
        const baseDelay = Math.min(
          minDelayMs! * Math.pow(2, attempt - 1),
          maxDelayMs!
        );
        const finalDelay = jitter 
          ? baseDelay + (baseDelay * 0.1 * Math.random())
          : baseDelay;
        
        // Honor Retry-After header if present and configured
        const retryAfter = respectRetryAfter && error.headers?.['retry-after'];
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : finalDelay;
        
        this.logger.info(`Retrying in ${Math.round(delay)}ms`, {
          operation: operationName,
          attempt,
          delay,
          retryAfter: !!retryAfter
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    this.logger.error(`Operation failed after ${attempts!} attempts`, {
      operation: operationName,
      attempts: attempts!,
      error: lastError.message,
      ...metadata
    });
    
    throw lastError;
  }

  /**
   * Check if values have changed for idempotency
   */
  private hasChanged(current: string | undefined, incoming: string | undefined): boolean {
    if (!current && !incoming) return false;
    if (!current || !incoming) return true;
    
    const normalize = (str: string) => str.trim().toLowerCase();
    return normalize(current) !== normalize(incoming);
  }

  /**
   * Update a task's status by name or ID
   */
  async updateTask(taskIdentifier: string, status: string): Promise<RoadmapTask> {
    return this.withRetry(async () => {
      const today = new Date().toISOString().split('T')[0];
      
      let pageId: string;
      let currentTask: any;
      
      // Check if taskIdentifier is a page ID (contains hyphens) or task name
      if (taskIdentifier.includes('-') && taskIdentifier.length > 20) {
        pageId = taskIdentifier;
        // Get current task for idempotency check
        if (this.enterprise.idempotency.enabled) {
          currentTask = await this.client.pages.retrieve({ page_id: pageId });
        }
      } else {
        // Search for the task by name
        const response = await this.client.databases.query({
          database_id: this.config.databaseId,
          filter: {
            property: this.config.titleProperty,
            title: {
              contains: taskIdentifier,
            },
          },
        });

        if (response.results.length === 0) {
          throw new Error(`Task "${taskIdentifier}" not found in database ${this.config.databaseId}`);
        }
        
        currentTask = response.results[0];
        pageId = currentTask.id;
      }
      
      // Idempotency check
      if (this.enterprise.idempotency.enabled && currentTask) {
        const currentStatus = this.extractStatus(currentTask);
        if (currentStatus === status) {
          this.logger.info('Status unchanged - skipping update', {
            operation: 'updateTask',
            taskIdentifier,
            pageId,
            status,
            idempotent: true
          });
          
          this.logger.event?.('audit', {
            operation: 'updateTask',
            pageId,
            status: 'idempotent',
            changes: { status: false }
          });
          
          return this.formatTask(currentTask);
        }
      }
      
      // Dry run check
      if (this.enterprise.dryRun) {
        this.logger.info('[DRY RUN] Would update task status', {
          operation: 'updateTask',
          taskIdentifier,
          pageId,
          statusFrom: currentTask ? this.extractStatus(currentTask) : 'unknown',
          statusTo: status,
          dryRun: true
        });
        
        this.logger.event?.('audit', {
          operation: 'updateTask',
          pageId,
          status: 'dry-run',
          changes: { status: true }
        });
        
        return this.formatTask(currentTask || { id: pageId, properties: {} });
      }
      
      // Prepare update data
      const updateData: any = {
        [this.config.statusProperty]: {
          status: { name: status },
        },
      };
      
      // Add date field for completed or in-progress status
      if (status.toLowerCase() === 'completed' || status.toLowerCase() === 'in progress') {
        updateData[this.config.dateProperty] = {
          date: {
            start: today,
          },
        };
      }
      
      this.logger.info('Updating task status', {
        operation: 'updateTask',
        taskIdentifier,
        pageId,
        statusFrom: currentTask ? this.extractStatus(currentTask) : 'unknown',
        statusTo: status
      });
      
      const response = await this.client.pages.update({
        page_id: pageId,
        properties: updateData,
      });
      
      this.logger.event?.('audit', {
        operation: 'updateTask',
        pageId,
        status: 'success',
        changes: { status: true }
      });
      
      return this.formatTask(response as any);
    }, 'updateTask', { taskIdentifier, status });
  }

  /**
   * Mark a task as completed
   */
  async complete(taskName: string): Promise<RoadmapTask> {
    return this.updateTask(taskName, "Completed");
  }

  /**
   * Mark a task as in progress
   */
  async start(taskName: string): Promise<RoadmapTask> {
    return this.updateTask(taskName, "In progress");
  }

  /**
   * Mark a task as planned
   */
  async plan(taskName: string): Promise<RoadmapTask> {
    return this.updateTask(taskName, "Planned");
  }

  /**
   * Search for tasks by name
   */
  async search(query: string): Promise<RoadmapTask[]> {
    const response = await this.client.databases.query({
      database_id: this.config.databaseId,
      filter: {
        property: this.config.titleProperty,
        title: {
          contains: query,
        },
      },
    });

    const tasksWithContent = await Promise.all(
      response.results.map(async (page: any) => {
        const pageContent = await this.getPageContent(page.id);
        return this.formatTask(page, pageContent);
      })
    );

    return tasksWithContent;
  }

  /**
   * List all tasks in the roadmap
   */
  async list(): Promise<RoadmapTask[]> {
    const response = await this.client.databases.query({
      database_id: this.config.databaseId,
    });

    // For list view, we don't need full page content (performance optimization)
    return response.results.map(page => this.formatTask(page as any, ''));
  }

  /**
   * Get tasks by status
   */
  async getByStatus(status: string): Promise<RoadmapTask[]> {
    const response = await this.client.databases.query({
      database_id: this.config.databaseId,
      filter: {
        property: this.config.statusProperty,
        status: {
          equals: status,
        },
      },
    });

    return response.results.map(page => this.formatTask(page as any, ''));
  }

  /**
   * Update page content (objective and user flow sections)
   */
  async updatePageContent(taskIdentifier: string, content: { objective?: string; userFlow?: string; notes?: string }): Promise<void> {
    let pageId: string;
    
    // Get page ID (same logic as updateTask)
    if (taskIdentifier.includes('-') && taskIdentifier.length > 20) {
      pageId = taskIdentifier;
    } else {
      const response = await this.client.databases.query({
        database_id: this.config.databaseId,
        filter: {
          property: this.config.titleProperty,
          title: {
            contains: taskIdentifier,
          },
        },
      });

      if (response.results.length === 0) {
        throw new Error(`Task "${taskIdentifier}" not found in database`);
      }
      
      pageId = response.results[0].id;
    }

    // Get existing blocks
    const existingBlocks = await this.client.blocks.children.list({
      block_id: pageId,
    });

    // Parse existing content to find objective and user flow sections
    const updatedBlocks = this.updateContentBlocks(existingBlocks.results, content);

    // Replace all page content
    await this.replacePageContent(pageId, updatedBlocks);
  }

  /**
   * Get ALL project data including properties and content
   */
  async getFullProjectData(taskIdentifier: string): Promise<{
    id: string;
    title: string;
    url: string;
    properties: {
      status?: string;
      priority?: string;
      effort?: string;
      team?: string[];
      owner?: string[];
      category?: string[];
      role?: string[];
      quarter?: string[];
      date?: string;
      docs?: string;
    };
    content: {
      objective?: string;
      userFlow?: string;
      fullText: string;
    };
  }> {
    let pageId: string;
    let page: any;
    
    if (taskIdentifier.includes('-') && taskIdentifier.length > 20) {
      pageId = taskIdentifier;
      // Fetch the page to get properties
      page = await this.client.pages.retrieve({ page_id: pageId });
    } else {
      const response = await this.client.databases.query({
        database_id: this.config.databaseId,
        filter: {
          property: this.config.titleProperty,
          title: {
            contains: taskIdentifier,
          },
        },
      });

      if (response.results.length === 0) {
        throw new Error(`Task "${taskIdentifier}" not found in database`);
      }
      
      page = response.results[0];
      pageId = page.id;
    }

    // Get page content
    const pageContent = await this.getPageContent(pageId);
    const { objective, userFlow } = this.extractObjectiveAndUserFlow({}, pageContent);
    
    // Extract all properties
    const props = page.properties || {};
    
    return {
      id: pageId,
      title: this.extractTitle(page),
      url: page.url,
      properties: {
        status: this.extractStatus(page),
        priority: this.extractPriority(page),
        effort: this.extractSelect(page, 'Effort'),
        team: this.extractMultiSelect(page, 'Team'),
        owner: this.extractPeople(page, 'Owner'),
        category: this.extractMultiSelect(page, 'Category'),
        role: this.extractMultiSelect(page, 'Role'),
        quarter: this.extractMultiSelect(page, 'Quarter'),
        date: this.extractDate(page, 'Date'),
        docs: this.extractRichText(page, 'Docs'),
      },
      content: {
        objective,
        userFlow,
        fullText: pageContent
      }
    };
  }

  /**
   * Get detailed page content for a specific task
   */
  async getTaskDetails(taskIdentifier: string): Promise<{ objective?: string; userFlow?: string; fullContent: string }> {
    let pageId: string;
    
    if (taskIdentifier.includes('-') && taskIdentifier.length > 20) {
      pageId = taskIdentifier;
    } else {
      const response = await this.client.databases.query({
        database_id: this.config.databaseId,
        filter: {
          property: this.config.titleProperty,
          title: {
            contains: taskIdentifier,
          },
        },
      });

      if (response.results.length === 0) {
        throw new Error(`Task "${taskIdentifier}" not found in database`);
      }
      
      pageId = response.results[0].id;
    }

    const pageContent = await this.getPageContent(pageId);
    const { objective, userFlow } = this.extractObjectiveAndUserFlow({}, pageContent);
    
    return {
      objective,
      userFlow,
      fullContent: pageContent
    };
  }

  /**
   * Create a new task
   */
  async createTask(title: string, status = "Planned", properties: Record<string, any> = {}): Promise<RoadmapTask> {
    const today = new Date().toISOString().split('T')[0];
    
    const taskProperties: any = {
      [this.config.titleProperty]: {
        title: [
          {
            text: {
              content: title,
            },
          },
        ],
      },
      [this.config.statusProperty]: {
        status: { name: status },
      },
      ...properties,
    };

    // Add date for completed or in-progress tasks
    if (status.toLowerCase() === 'completed' || status.toLowerCase() === 'in progress') {
      taskProperties[this.config.dateProperty] = {
        date: {
          start: today,
        },
      };
    }

    const response = await this.client.pages.create({
      parent: {
        type: 'database_id',
        database_id: this.config.databaseId,
      },
      properties: taskProperties,
    });

    return this.formatTask(response as any, '');
  }

  /**
   * Get page content (blocks) from a Notion page
   */
  private async getPageContent(pageId: string): Promise<string> {
    try {
      const response = await this.client.blocks.children.list({
        block_id: pageId,
      });
      
      return this.extractTextFromBlocks(response.results);
    } catch (error) {
      console.warn(`Could not fetch page content for ${pageId}:`, error);
      return '';
    }
  }

  /**
   * Extract text content from Notion blocks
   */
  private extractTextFromBlocks(blocks: any[]): string {
    const textContent: string[] = [];
    
    blocks.forEach(block => {
      if (block.type === 'paragraph' && block.paragraph?.rich_text) {
        const text = block.paragraph.rich_text.map((t: any) => t.plain_text).join('');
        if (text.trim()) textContent.push(text.trim());
      }
      if (block.type === 'heading_1' && block.heading_1?.rich_text) {
        const text = block.heading_1.rich_text.map((t: any) => t.plain_text).join('');
        if (text.trim()) textContent.push(`# ${text.trim()}`);
      }
      if (block.type === 'heading_2' && block.heading_2?.rich_text) {
        const text = block.heading_2.rich_text.map((t: any) => t.plain_text).join('');
        if (text.trim()) textContent.push(`## ${text.trim()}`);
      }
      if (block.type === 'heading_3' && block.heading_3?.rich_text) {
        const text = block.heading_3.rich_text.map((t: any) => t.plain_text).join('');
        if (text.trim()) textContent.push(`### ${text.trim()}`);
      }
      if (block.type === 'bulleted_list_item' && block.bulleted_list_item?.rich_text) {
        const text = block.bulleted_list_item.rich_text.map((t: any) => t.plain_text).join('');
        if (text.trim()) textContent.push(`• ${text.trim()}`);
      }
      if (block.type === 'numbered_list_item' && block.numbered_list_item?.rich_text) {
        const text = block.numbered_list_item.rich_text.map((t: any) => t.plain_text).join('');
        if (text.trim()) textContent.push(`1. ${text.trim()}`);
      }
    });
    
    return textContent.join('\n');
  }

  /**
   * Format a Notion page into a RoadmapTask
   */
  private formatTask(page: any, pageContent: string = ''): RoadmapTask {
    return {
      id: page.id,
      title: this.extractTitle(page),
      status: this.extractStatus(page),
      priority: this.extractPriority(page),
      url: page.url,
      objective: this.extractObjectiveAndUserFlow(page, pageContent).objective,
      userFlow: this.extractObjectiveAndUserFlow(page, pageContent).userFlow,
      description: this.extractRichText(page, 'Description'),
      effort: this.extractSelect(page, 'Effort'),
      dependencies: this.extractRichText(page, 'Dependencies'),
      dueDate: this.extractDate(page, 'Due Date'),
      properties: page.properties,
    };
  }

  private extractTitle(page: any): string {
    const prop = page.properties[this.config.titleProperty];
    if (prop?.type === 'title' && prop.title?.length > 0) {
      return prop.title[0].plain_text;
    }
    return 'Untitled';
  }

  private extractStatus(page: any): string {
    const prop = page.properties[this.config.statusProperty];
    return prop?.status?.name || 'Unknown';
  }

  private extractPriority(page: any): string | undefined {
    const prop = page.properties['Priority'];
    return prop?.select?.name;
  }

  private extractRichText(page: any, propertyName: string): string | undefined {
    const prop = page.properties[propertyName];
    if (prop?.type === 'rich_text' && prop.rich_text?.length > 0) {
      // Concatenate all rich text blocks for complete content
      return prop.rich_text.map((block: any) => block.plain_text).join('');
    }
    return undefined;
  }

  private extractSelect(page: any, propertyName: string): string | undefined {
    const prop = page.properties[propertyName];
    return prop?.select?.name;
  }

  private extractDate(page: any, propertyName: string): string | undefined {
    const prop = page.properties[propertyName];
    return prop?.date?.start;
  }

  private extractMultiSelect(page: any, propertyName: string): string[] | undefined {
    const prop = page.properties[propertyName];
    if (prop?.type === 'multi_select' && prop.multi_select?.length > 0) {
      return prop.multi_select.map((item: any) => item.name);
    }
    return undefined;
  }

  private extractPeople(page: any, propertyName: string): string[] | undefined {
    const prop = page.properties[propertyName];
    if (prop?.type === 'people' && prop.people?.length > 0) {
      return prop.people.map((person: any) => person.name || person.id);
    }
    return undefined;
  }

  private extractObjectiveAndUserFlow(page: any, pageContent: string): { objective?: string; userFlow?: string } {
    // Parse the page content to extract objective and user flow
    const lines = pageContent.split('\n').map(line => line.trim()).filter(line => line);
    
    let objective: string | undefined;
    let userFlow: string | undefined;
    let currentSection = '';
    let collectingObjective = false;
    let collectingUserFlow = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();
      
      // Check for section headers
      if (lowerLine.includes('objective') && (lowerLine.includes('#') || lowerLine.includes(':'))) {
        currentSection = 'objective';
        collectingObjective = true;
        collectingUserFlow = false;
        
        // Extract content from same line if it has content after ":"
        if (line.includes(':')) {
          const content = line.split(':').slice(1).join(':').trim();
          if (content && !content.startsWith('#')) {
            objective = content;
            collectingObjective = false;
          }
        }
        continue;
      }
      
      if ((lowerLine.includes('user flow') || lowerLine.includes('flow')) && 
          (lowerLine.includes('#') || lowerLine.includes(':'))) {
        currentSection = 'userflow';
        collectingUserFlow = true;
        collectingObjective = false;
        
        // Extract content from same line if it has content after ":"
        if (line.includes(':')) {
          const content = line.split(':').slice(1).join(':').trim();
          if (content && !content.startsWith('#')) {
            userFlow = content;
            collectingUserFlow = false;
          }
        }
        continue;
      }
      
      // Stop collecting if we hit another section header
      if (line.startsWith('#') || (line.includes(':') && line.split(':')[0].length < 50)) {
        collectingObjective = false;
        collectingUserFlow = false;
        currentSection = '';
      }
      
      // Collect content for current section
      if (collectingObjective && line && !line.startsWith('#')) {
        objective = objective ? `${objective} ${line}` : line;
      }
      
      if (collectingUserFlow && line && !line.startsWith('#')) {
        userFlow = userFlow ? `${userFlow} ${line}` : line;
      }
    }
    
    // Fallback: check properties if no content found
    if (!objective && !userFlow) {
      const docsContent = this.extractRichText(page, 'Docs');
      if (docsContent) {
        const docLines = docsContent.split('\n').map(line => line.trim()).filter(line => line);
        for (const line of docLines) {
          const lowerLine = line.toLowerCase();
          if (lowerLine.includes('objective') && line.includes(':')) {
            objective = line.split(':').slice(1).join(':').trim();
          }
          if (lowerLine.includes('user flow') && line.includes(':')) {
            userFlow = line.split(':').slice(1).join(':').trim();
          }
        }
      }
      
      // Final fallback: separate properties
      if (!objective) {
        objective = this.extractRichText(page, 'Objective');
      }
      if (!userFlow) {
        userFlow = this.extractRichText(page, 'User Flow');
      }
    }
    
    return { objective, userFlow };
  }

  /**
   * Update content blocks with new objective, user flow, and notes
   */
  private updateContentBlocks(existingBlocks: any[], newContent: { objective?: string; userFlow?: string; notes?: string }): any[] {
    const blocks: any[] = [];
    
    // Add objective section
    if (newContent.objective) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{
            type: 'text',
            text: { content: '1. Objective' }
          }]
        }
      });
      
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: newContent.objective }
          }]
        }
      });
    }
    
    // Add user flow section
    if (newContent.userFlow) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{
            type: 'text',
            text: { content: '2. User Flow from Start to Renewal' }
          }]
        }
      });
      
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: newContent.userFlow }
          }]
        }
      });
    }
    
    // Add notes section
    if (newContent.notes) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{
            type: 'text',
            text: { content: '3. Implementation Notes' }
          }]
        }
      });
      
      // Split notes by newlines and create paragraphs
      const noteLines = newContent.notes.split('\n').filter(line => line.trim());
      for (const line of noteLines) {
        if (line.startsWith('- ') || line.startsWith('• ')) {
          // Create bullet point
          blocks.push({
            object: 'block',
            type: 'bulleted_list_item',
            bulleted_list_item: {
              rich_text: [{
                type: 'text',
                text: { content: line.replace(/^[•-]\s*/, '') }
              }]
            }
          });
        } else if (line.match(/^\d+\.\s/)) {
          // Create numbered list item
          blocks.push({
            object: 'block',
            type: 'numbered_list_item',
            numbered_list_item: {
              rich_text: [{
                type: 'text',
                text: { content: line.replace(/^\d+\.\s*/, '') }
              }]
            }
          });
        } else if (line.startsWith('#')) {
          // Create heading
          const level = line.match(/^#+/)?.[0].length || 1;
          const headingType = level === 1 ? 'heading_1' : level === 2 ? 'heading_2' : 'heading_3';
          blocks.push({
            object: 'block',
            type: headingType,
            [headingType]: {
              rich_text: [{
                type: 'text',
                text: { content: line.replace(/^#+\s*/, '') }
              }]
            }
          });
        } else {
          // Create regular paragraph
          blocks.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{
                type: 'text',
                text: { content: line }
              }]
            }
          });
        }
      }
    }
    
    return blocks;
  }

  /**
   * Replace all content in a page
   */
  private async replacePageContent(pageId: string, newBlocks: any[]): Promise<void> {
    // First, get all existing blocks
    const existingBlocks = await this.client.blocks.children.list({
      block_id: pageId,
    });

    // Delete existing blocks
    for (const block of existingBlocks.results) {
      try {
        await this.client.blocks.delete({
          block_id: (block as any).id,
        });
      } catch (error) {
        console.warn(`Could not delete block ${(block as any).id}:`, error);
      }
    }

    // Add new blocks
    if (newBlocks.length > 0) {
      await this.client.blocks.children.append({
        block_id: pageId,
        children: newBlocks,
      });
    }
  }
}

/**
 * Factory function for easy setup
 */
export function createRoadmapManager(config: RoadmapConfig): NotionRoadmapManager {
  if (!config.apiKey) {
    throw new Error('Notion API key is required');
  }
  if (!config.databaseId) {
    throw new Error('Notion database ID is required');
  }
  
  return new NotionRoadmapManager(config);
}

/**
 * Create a roadmap manager from environment variables
 */
export function createRoadmapFromEnv(databaseId: string, apiKeyEnv = 'NOTION_API_KEY'): NotionRoadmapManager {
  const apiKey = process.env[apiKeyEnv];
  if (!apiKey) {
    throw new Error(`Environment variable ${apiKeyEnv} is required`);
  }
  
  return createRoadmapManager({
    apiKey,
    databaseId,
  });
}

// Types are already exported above as interfaces