// API Key Management
export interface ApiKey {
  id: string;
  organizationId: string;
  name: string;
  key: string;
  secret: string;
  permissions: ApiPermission[];
  status: 'active' | 'revoked' | 'expired';
  rateLimit: number; // requests per minute
  usageCount: number;
  lastUsed?: Date | string;
  expiresAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type ApiPermission = 
  | 'orders:read' 
  | 'orders:write' 
  | 'inventory:read' 
  | 'inventory:write'
  | 'customers:read' 
  | 'customers:write'
  | 'transactions:read'
  | 'analytics:read'
  | 'webhooks:manage';

// Webhook Configuration
export interface Webhook {
  id: string;
  organizationId: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  status: 'active' | 'inactive' | 'failed';
  retryConfig: {
    maxRetries: number;
    retryDelay: number; // milliseconds
  };
  lastTriggered?: Date | string;
  failureCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type WebhookEvent = 
  | 'order.created'
  | 'order.updated'
  | 'order.completed'
  | 'order.cancelled'
  | 'inventory.low_stock'
  | 'inventory.updated'
  | 'payment.success'
  | 'payment.failed'
  | 'customer.created'
  | 'customer.updated';

export interface WebhookLog {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: any;
  response?: {
    statusCode: number;
    body: string;
  };
  status: 'success' | 'failed' | 'pending' | 'retrying';
  attempts: number;
  error?: string;
  createdAt: Date | string;
}

// Zapier Integration
export interface ZapierTrigger {
  id: string;
  organizationId: string;
  zapId: string;
  event: WebhookEvent;
  filters?: Record<string, any>;
  status: 'active' | 'paused';
  createdAt: Date | string;
}

// External Integration
export interface ExternalIntegration {
  id: string;
  organizationId: string;
  provider: 'razorpay' | 'stripe' | 'tally' | 'quickbooks' | 'zoho' | 'custom';
  name: string;
  credentials: {
    apiKey?: string;
    apiSecret?: string;
    webhookSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    [key: string]: any;
  };
  config: {
    syncInventory?: boolean;
    syncOrders?: boolean;
    syncCustomers?: boolean;
    syncTransactions?: boolean;
    autoCreateInvoices?: boolean;
    [key: string]: any;
  };
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: Date | string;
  syncErrors?: string[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Sync Log
export interface SyncLog {
  id: string;
  integrationId: string;
  syncType: 'inventory' | 'orders' | 'customers' | 'transactions' | 'full';
  status: 'success' | 'partial' | 'failed';
  itemsSynced: number;
  itemsFailed: number;
  errors?: Array<{
    item: string;
    error: string;
  }>;
  startedAt: Date | string;
  completedAt?: Date | string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  body?: any;
}

// Rate Limiting
export interface RateLimit {
  apiKeyId: string;
  requests: number;
  windowStart: Date | string;
  windowEnd: Date | string;
}
