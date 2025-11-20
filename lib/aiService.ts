import { GoogleGenerativeAI } from '@google/generative-ai';
import type { 
  DemandForecast, 
  PricingRecommendation, 
  Anomaly, 
  CategorySuggestion,
  AIInsight 
} from '@/types/ai';
import { db } from './firebase';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';

// Initialize Gemini AI
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  console.error('GEMINI API KEY IS MISSING! Please add NEXT_PUBLIC_GEMINI_API_KEY to your .env.local file');
}

const genAI = new GoogleGenerativeAI(apiKey || '');

/**
 * Demand Forecasting
 * Predict future inventory needs based on historical data
 */
export async function generateDemandForecast(
  organizationId: string,
  productId: string,
  forecastPeriod: 'week' | 'month' | 'quarter' | 'year'
): Promise<DemandForecast> {
  try {
    // Fetch historical sales data
    const historicalData = await getHistoricalSalesData(organizationId, productId);
    
    // Fetch product info
    const productInfo = await getProductInfo(productId);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const hasHistoricalData = historicalData.length > 0;
    const dataDescription = hasHistoricalData 
      ? `Historical Sales Data (last 90 days - ${historicalData.length} transactions):\n${JSON.stringify(historicalData, null, 2)}`
      : `Historical Sales Data: NO HISTORICAL DATA AVAILABLE. This is a new product or has no sales records yet. Base forecast on industry standards and current stock level.`;

    const prompt = `
You are an AI assistant specialized in demand forecasting for inventory management.

Product Information:
- Name: ${productInfo.name}
- Category: ${productInfo.category}
- Current Stock: ${productInfo.stock}
- Price: ₹${productInfo.price}

${dataDescription}

${hasHistoricalData ? '' : 'IMPORTANT: Since there is no historical sales data, provide conservative estimates based on typical product lifecycle and stock levels. Clearly mention in insights that this is based on no historical data.'}

Task: Generate a ${forecastPeriod}ly demand forecast including:
1. Daily/weekly predicted demand quantities
2. Confidence intervals (lower and upper bounds)
3. Recommended reorder quantity and date
4. Key insights about trends, seasonality, and patterns
5. Confidence score (0-100)${hasHistoricalData ? '' : ' (should be lower due to lack of historical data)'}

Respond in JSON format:
{
  "predictions": [
    {
      "date": "YYYY-MM-DD",
      "predictedDemand": number,
      "confidenceInterval": { "lower": number, "upper": number }
    }
  ],
  "recommendedReorderQuantity": number,
  "recommendedReorderDate": "YYYY-MM-DD",
  "insights": ["insight1", "insight2"],
  "confidence": number,
  "factors": {
    "seasonality": number,
    "trend": number,
    "historicalSales": number
  }
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }
    
    const aiResponse = JSON.parse(jsonMatch[0]);

    const forecast: DemandForecast = {
      id: `forecast_${Date.now()}`,
      organizationId,
      productId,
      productName: productInfo.name,
      currentStock: productInfo.stock,
      forecastPeriod,
      predictions: aiResponse.predictions,
      confidence: aiResponse.confidence,
      recommendedReorderQuantity: aiResponse.recommendedReorderQuantity,
      recommendedReorderDate: aiResponse.recommendedReorderDate,
      insights: aiResponse.insights,
      factors: aiResponse.factors,
      generatedAt: new Date().toISOString()
    };

    return forecast;
  } catch (error) {
    console.error('Error generating demand forecast:', error);
    throw error;
  }
}

/**
 * Smart Pricing Recommendation
 * Suggest optimal pricing based on demand, competition, and costs
 */
export async function generatePricingRecommendation(
  organizationId: string,
  productId: string
): Promise<PricingRecommendation> {
  try {
    const productInfo = await getProductInfo(productId);
    const salesData = await getHistoricalSalesData(organizationId, productId);
    const competitorData = await getCompetitorPricing(productInfo.name);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `
You are a pricing optimization expert for retail businesses.

Product Information:
- Name: ${productInfo.name}
- Current Price: ₹${productInfo.price}
- Cost Price: ₹${productInfo.costPrice || productInfo.price * 0.6}
- Current Stock: ${productInfo.stock}
- Category: ${productInfo.category}

Sales Data (last 30 days):
${JSON.stringify(salesData.slice(-30), null, 2)}

Competitor Pricing:
${JSON.stringify(competitorData, null, 2)}

Task: Recommend an optimal price considering:
1. Demand elasticity
2. Competitor pricing
3. Profit margins
4. Stock levels
5. Market trends

Respond in JSON format:
{
  "recommendedPrice": number,
  "confidence": number,
  "reasoning": ["reason1", "reason2"],
  "factors": {
    "demandLevel": "low" | "medium" | "high",
    "salesVelocity": number,
    "profitMargin": number,
    "seasonalFactor": number
  },
  "expectedImpact": {
    "salesIncrease": number,
    "revenueIncrease": number,
    "profitIncrease": number
  }
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }
    
    const aiResponse = JSON.parse(jsonMatch[0]);

    const recommendation: PricingRecommendation = {
      id: `pricing_${Date.now()}`,
      organizationId,
      productId,
      productName: productInfo.name,
      currentPrice: productInfo.price,
      recommendedPrice: aiResponse.recommendedPrice,
      priceChange: aiResponse.recommendedPrice - productInfo.price,
      priceChangePercent: ((aiResponse.recommendedPrice - productInfo.price) / productInfo.price) * 100,
      confidence: aiResponse.confidence,
      reasoning: aiResponse.reasoning,
      factors: {
        ...aiResponse.factors,
        competitorPricing: competitorData,
        costPrice: productInfo.costPrice || productInfo.price * 0.6,
        stockLevel: productInfo.stock
      },
      expectedImpact: aiResponse.expectedImpact,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      generatedAt: new Date().toISOString()
    };

    return recommendation;
  } catch (error) {
    console.error('Error generating pricing recommendation:', error);
    throw error;
  }
}

/**
 * Anomaly Detection
 * Detect unusual patterns, fraud, or anomalies
 */
export async function detectAnomalies(
  organizationId: string,
  entityType: 'order' | 'transaction' | 'customer' | 'inventory',
  recentData: any[]
): Promise<Anomaly[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `
You are an expert in fraud detection and anomaly identification for business operations.

Entity Type: ${entityType}
Recent Data:
${JSON.stringify(recentData, null, 2)}

Task: Analyze the data and identify any anomalies, unusual patterns, or potential fraud:
1. Unusual transaction amounts or patterns
2. Suspicious customer behavior
3. Inventory discrepancies
4. Payment anomalies
5. Order fraud indicators

For each anomaly found, provide:
- Severity (low, medium, high, critical)
- Description
- Data points showing expected vs actual values
- Insights and recommendations

Respond in JSON format:
{
  "anomalies": [
    {
      "type": "fraud" | "unusual_pattern" | "inventory" | "payment" | "behavior",
      "severity": "low" | "medium" | "high" | "critical",
      "title": "Short title",
      "description": "Detailed description",
      "entityId": "id",
      "dataPoints": [
        {
          "metric": "metric name",
          "expected": number,
          "actual": number,
          "deviation": number
        }
      ],
      "insights": ["insight1"],
      "recommendations": ["recommendation1"]
    }
  ]
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return []; // No anomalies found
    }
    
    const aiResponse = JSON.parse(jsonMatch[0]);

    const anomalies: Anomaly[] = aiResponse.anomalies.map((a: any) => ({
      id: `anomaly_${Date.now()}_${Math.random()}`,
      organizationId,
      ...a,
      entityType,
      status: 'new',
      detectedAt: new Date().toISOString()
    }));

    return anomalies;
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    return [];
  }
}

/**
 * Auto-Categorization
 * Automatically categorize products, expenses, etc.
 */
export async function generateCategorySuggestions(
  organizationId: string,
  entityType: 'product' | 'expense',
  entityData: any
): Promise<CategorySuggestion> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `
You are an expert in product and expense categorization for business operations.

Entity Type: ${entityType}
Entity Data:
${JSON.stringify(entityData, null, 2)}

Task: Suggest appropriate categories and tags for this ${entityType}.

For products: Consider name, description, brand, specifications
For expenses: Consider description, amount, vendor, purpose

Respond in JSON format:
{
  "suggestedCategories": [
    {
      "category": "category name",
      "confidence": number (0-100),
      "reasoning": ["reason1", "reason2"]
    }
  ],
  "tags": [
    {
      "tag": "tag name",
      "confidence": number (0-100)
    }
  ]
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }
    
    const aiResponse = JSON.parse(jsonMatch[0]);

    const suggestion: CategorySuggestion = {
      id: `category_${Date.now()}`,
      organizationId,
      entityType,
      entityId: entityData.id,
      entityName: entityData.name || entityData.description,
      currentCategory: entityData.category,
      suggestedCategories: aiResponse.suggestedCategories,
      tags: aiResponse.tags,
      metadata: entityData,
      status: 'pending',
      generatedAt: new Date().toISOString()
    };

    return suggestion;
  } catch (error) {
    console.error('Error generating category suggestions:', error);
    throw error;
  }
}

/**
 * Chatbot Response
 * Generate intelligent responses to customer queries
 */
export async function generateChatbotResponse(
  message: string,
  context: any,
  organizationId: string
): Promise<string> {
  try {
    // Fetch business context automatically
    const salesData = await getOrganizationSalesData(organizationId);
    const inventoryData = await getOrganizationInventoryData(organizationId);
    const customerData = await getOrganizationCustomerData(organizationId);

    const businessContext = {
      totalOrders: salesData.length,
      recentOrders: salesData.slice(0, 5),
      totalInventoryItems: inventoryData.length,
      lowStockItems: inventoryData.filter(item => item.stock <= item.minStock),
      totalCustomers: customerData.totalCustomers,
      activeCustomers: customerData.activeCustomers,
      ...context
    };

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `
You are an AI assistant for a business inventory management and billing system. You have access to real-time business data.

User Question: ${message}

Business Context:
- Total Orders: ${businessContext.totalOrders}
- Total Inventory Items: ${businessContext.totalInventoryItems}
- Low Stock Items: ${businessContext.lowStockItems.length}
- Total Customers: ${businessContext.totalCustomers}
- Active Customers: ${businessContext.activeCustomers}

Recent Orders (last 5):
${JSON.stringify(businessContext.recentOrders, null, 2)}

Low Stock Items:
${JSON.stringify(businessContext.lowStockItems.slice(0, 5), null, 2)}

Task: Provide a helpful, professional, and accurate response based on the real business data. 
- Answer questions about orders, inventory, customers, sales
- Provide insights and recommendations
- Use actual numbers from the context
- Be concise and actionable
- If asked about specific items not in the data, say so clearly

Response:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating chatbot response:', error);
    return 'I apologize, but I\'m having trouble processing your request. Please try again or contact support.';
  }
}

/**
 * Generate Business Insights
 * Analyze data and provide actionable insights
 */
export async function generateBusinessInsights(
  organizationId: string
): Promise<AIInsight[]> {
  try {
    // Fetch comprehensive business data
    const salesData = await getOrganizationSalesData(organizationId);
    const inventoryData = await getOrganizationInventoryData(organizationId);
    const customerData = await getOrganizationCustomerData(organizationId);

    if (salesData.length === 0 && inventoryData.length === 0) {
      return [];
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `
You are a business intelligence analyst providing actionable insights.

Sales Data (last 30 days):
${JSON.stringify(salesData.slice(0, 10), null, 2)}

Inventory Status:
${JSON.stringify(inventoryData.slice(0, 10), null, 2)}

Customer Metrics:
${JSON.stringify(customerData, null, 2)}

Task: Generate 3-5 actionable business insights covering:
1. Sales trends and opportunities
2. Inventory optimization
3. Customer behavior patterns
4. Revenue optimization
5. Operational improvements

For each insight:
- Category (inventory/sales/customer/financial/operational)
- Priority (low/medium/high)
- Impact metrics
- Actionable recommendations

Respond in JSON format:
{
  "insights": [
    {
      "category": "inventory",
      "title": "Short title",
      "description": "Detailed description",
      "priority": "high",
      "impact": {
        "metric": "Revenue",
        "value": 50000,
        "unit": "₹"
      },
      "recommendations": [
        {
          "action": "Specific action",
          "expectedOutcome": "Expected result",
          "effort": "low"
        }
      ],
      "confidence": 85
    }
  ]
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }
    
    const aiResponse = JSON.parse(jsonMatch[0]);

    const insights: AIInsight[] = aiResponse.insights.map((insight: any) => ({
      id: `insight_${Date.now()}_${Math.random()}`,
      organizationId,
      ...insight,
      dataSource: ['sales', 'inventory', 'customers'],
      status: 'new',
      generatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }));

    return insights;
  } catch (error: any) {
    return [];
  }
}

// Helper functions to fetch data

async function getHistoricalSalesData(organizationId: string, productId: string) {
  try {
    const q = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc'),
      limit(90)
    );
    const snapshot = await getDocs(q);
    
    const salesData = snapshot.docs
      .flatMap(doc => {
        const order = doc.data();
        // Check if products array exists
        if (!order.products || !Array.isArray(order.products)) {
          return [];
        }
        // Try multiple possible field names: id, productId, itemId, sku
        return order.products
          .filter((p: any) => 
            p.id === productId || 
            p.productId === productId || 
            p.itemId === productId ||
            p.sku === productId ||
            p.name === productId
          )
          .map((p: any) => ({
            date: order.createdAt,
            quantity: p.quantity || p.qty || 1,
            price: p.price || p.unitPrice || 0,
            total: p.total || p.amount || (p.quantity * p.price) || 0
          }));
      });
    
    console.log(`Historical sales data for product ${productId}:`, salesData.length, 'records found');
    return salesData;
  } catch (error) {
    console.error('Error fetching historical sales data:', error);
    return [];
  }
}


async function getProductInfo(productId: string) {
  // Fetch from your inventory collection
  return {
    name: 'Product Name',
    category: 'Category',
    stock: 100,
    price: 500,
    costPrice: 300
  };
}

async function getCompetitorPricing(productName: string) {
  // Mock competitor data - in production, integrate with price comparison APIs
  return [450, 520, 480];
}

async function getOrganizationSalesData(organizationId: string) {
  try {
    // Get orders from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const q = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        orderId: data.orderId,
        amount: data.amount || data.totalAmount || 0,
        products: data.products || [],
        status: data.status,
        date: data.createdAt,
        customerId: data.customerId
      };
    });
  } catch (error) {
    console.error('Error fetching sales data:', error);
    return [];
  }
}

async function getOrganizationInventoryData(organizationId: string) {
  try {
    const inventoryQuery = query(
      collection(db, 'inventory'),
      where('organizationId', '==', organizationId)
    );
    const snapshot = await getDocs(inventoryQuery);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        sku: data.sku,
        stock: data.stock || data.quantity || 0,
        minStock: data.minStock || data.lowStockThreshold || 10,
        price: data.price || 0,
        category: data.category
      };
    });
  } catch (error) {
    console.error('Error fetching inventory data:', error);
    return [];
  }
}

async function getOrganizationCustomerData(organizationId: string) {
  try {
    const customersQuery = query(
      collection(db, 'customers'),
      where('organizationId', '==', organizationId)
    );
    const snapshot = await getDocs(customersQuery);
    
    return {
      totalCustomers: snapshot.size,
      activeCustomers: snapshot.docs.filter(doc => {
        const data = doc.data();
        return data.totalOrders > 0;
      }).length,
      averageOrderValue: snapshot.docs.reduce((sum, doc) => {
        const data = doc.data();
        const totalOrders = data.totalOrders || 0;
        const totalSpent = data.totalPurchases || 0;
        return sum + (totalOrders > 0 ? totalSpent / totalOrders : 0);
      }, 0) / Math.max(snapshot.size, 1)
    };
  } catch (error) {
    console.error('Error fetching customer data:', error);
    return {
      totalCustomers: 0,
      activeCustomers: 0,
      averageOrderValue: 0
    };
  }
}

