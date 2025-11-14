// AI-Powered Features Types

// Demand Forecasting
export interface DemandForecast {
  id: string;
  organizationId: string;
  productId: string;
  productName: string;
  currentStock: number;
  forecastPeriod: 'week' | 'month' | 'quarter' | 'year';
  predictions: ForecastPrediction[];
  confidence: number; // 0-100
  recommendedReorderQuantity: number;
  recommendedReorderDate: Date | string;
  insights: string[];
  factors: {
    seasonality: number;
    trend: number;
    historicalSales: number;
    externalFactors?: string[];
  };
  generatedAt: Date | string;
}

export interface ForecastPrediction {
  date: Date | string;
  predictedDemand: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

// Chatbot
export interface ChatMessage {
  id: string;
  sessionId: string;
  userId?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    intent?: string;
    entities?: Record<string, any>;
    confidence?: number;
  };
  timestamp: Date | string;
}

export interface ChatSession {
  id: string;
  organizationId: string;
  userId?: string;
  customerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  status: 'active' | 'resolved' | 'escalated';
  messages: ChatMessage[];
  context: Record<string, any>;
  startedAt: Date | string;
  endedAt?: Date | string;
}

export interface ChatbotIntent {
  name: string;
  description: string;
  examples: string[];
  requiredEntities: string[];
  action: string;
}

// Smart Pricing
export interface PricingRecommendation {
  id: string;
  organizationId: string;
  productId: string;
  productName: string;
  currentPrice: number;
  recommendedPrice: number;
  priceChange: number;
  priceChangePercent: number;
  confidence: number; // 0-100
  reasoning: string[];
  factors: {
    demandLevel: 'low' | 'medium' | 'high';
    competitorPricing?: number[];
    costPrice: number;
    profitMargin: number;
    stockLevel: number;
    salesVelocity: number;
    seasonalFactor: number;
  };
  expectedImpact: {
    salesIncrease?: number;
    revenueIncrease?: number;
    profitIncrease?: number;
  };
  validUntil: Date | string;
  generatedAt: Date | string;
}

// Anomaly Detection
export interface Anomaly {
  id: string;
  organizationId: string;
  type: 'fraud' | 'unusual_pattern' | 'inventory' | 'payment' | 'behavior';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  entityType: 'order' | 'transaction' | 'customer' | 'inventory' | 'user';
  entityId: string;
  dataPoints: Array<{
    metric: string;
    expected: number;
    actual: number;
    deviation: number;
  }>;
  insights: string[];
  recommendations: string[];
  status: 'new' | 'investigating' | 'resolved' | 'false_positive';
  assignedTo?: string;
  detectedAt: Date | string;
  resolvedAt?: Date | string;
}

export interface AnomalyRule {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  ruleType: 'threshold' | 'pattern' | 'ml_model';
  conditions: Array<{
    metric: string;
    operator: '>' | '<' | '=' | '!=' | 'between' | 'pattern';
    value: any;
    threshold?: number;
  }>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actions: Array<{
    type: 'notify' | 'block' | 'flag' | 'webhook';
    config: Record<string, any>;
  }>;
  enabled: boolean;
  createdAt: Date | string;
}

// Auto-Categorization
export interface CategorySuggestion {
  id: string;
  organizationId: string;
  entityType: 'product' | 'expense' | 'customer' | 'transaction';
  entityId: string;
  entityName: string;
  currentCategory?: string;
  suggestedCategories: Array<{
    category: string;
    confidence: number;
    reasoning: string[];
  }>;
  tags: Array<{
    tag: string;
    confidence: number;
  }>;
  metadata: Record<string, any>;
  status: 'pending' | 'accepted' | 'rejected';
  generatedAt: Date | string;
  appliedAt?: Date | string;
}

// AI Model Configuration
export interface AIModelConfig {
  id: string;
  organizationId: string;
  modelType: 'forecasting' | 'pricing' | 'anomaly' | 'categorization' | 'chatbot';
  provider: 'gemini' | 'openai' | 'custom';
  modelName: string;
  apiKey: string;
  config: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    [key: string]: any;
  };
  status: 'active' | 'inactive' | 'error';
  lastUsed?: Date | string;
  usageStats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalTokens: number;
    totalCost: number;
  };
  createdAt: Date | string;
  updatedAt: Date | string;
}

// AI Insights
export interface AIInsight {
  id: string;
  organizationId: string;
  category: 'inventory' | 'sales' | 'customer' | 'financial' | 'operational';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  impact: {
    metric: string;
    value: number;
    unit: string;
  };
  recommendations: Array<{
    action: string;
    expectedOutcome: string;
    effort: 'low' | 'medium' | 'high';
  }>;
  dataSource: string[];
  confidence: number;
  status: 'new' | 'viewed' | 'acted_upon' | 'dismissed';
  generatedAt: Date | string;
  expiresAt?: Date | string;
}

// Training Data
export interface AITrainingData {
  id: string;
  organizationId: string;
  modelType: 'forecasting' | 'pricing' | 'anomaly' | 'categorization';
  dataType: string;
  data: any;
  label?: any;
  metadata: Record<string, any>;
  createdAt: Date | string;
}
