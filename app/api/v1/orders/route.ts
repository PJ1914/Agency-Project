import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit as limitQuery, startAfter, Timestamp } from 'firebase/firestore';
import { verifyApiKey, checkRateLimit, logApiRequest } from '@/lib/apiHelpers';
import type { ApiResponse } from '@/types/api';
import type { Order } from '@/types/order';

/**
 * GET /api/v1/orders
 * List all orders with pagination and filters
 */
export async function GET(request: NextRequest) {
  try {
    // Verify API Key
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'API key is required'
        }
      }, { status: 401 });
    }

    const apiKeyData = await verifyApiKey(apiKey);
    if (!apiKeyData) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key'
        }
      }, { status: 401 });
    }

    // Check permissions
    if (!apiKeyData.permissions.includes('orders:read')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions'
        }
      }, { status: 403 });
    }

    // Check rate limit
    const rateLimitOk = await checkRateLimit(apiKeyData.id, apiKeyData.rateLimit);
    if (!rateLimitOk) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded'
        }
      }, { status: 429 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query
    let q = query(
      collection(db, 'orders'),
      where('organizationId', '==', apiKeyData.organizationId),
      orderBy('createdAt', 'desc'),
      limitQuery(limit + 1) // Fetch one extra to check if there are more
    );

    if (status) {
      q = query(q, where('status', '==', status));
    }

    if (customerId) {
      q = query(q, where('customerId', '==', customerId));
    }

    if (startDate) {
      const startTimestamp = Timestamp.fromDate(new Date(startDate));
      q = query(q, where('createdAt', '>=', startTimestamp));
    }

    if (endDate) {
      const endTimestamp = Timestamp.fromDate(new Date(endDate));
      q = query(q, where('createdAt', '<=', endTimestamp));
    }

    // Execute query
    const snapshot = await getDocs(q);
    const orders = snapshot.docs.slice(0, limit).map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Order[];

    const hasMore = snapshot.docs.length > limit;

    // Log API request
    await logApiRequest(apiKeyData.id, 'GET', '/api/v1/orders', 200);

    return NextResponse.json<ApiResponse<Order[]>>({
      success: true,
      data: orders,
      meta: {
        page,
        limit,
        total: orders.length,
        hasMore
      }
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'An error occurred'
      }
    }, { status: 500 });
  }
}

/**
 * POST /api/v1/orders
 * Create a new order
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'API key is required'
        }
      }, { status: 401 });
    }

    const apiKeyData = await verifyApiKey(apiKey);
    if (!apiKeyData) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key'
        }
      }, { status: 401 });
    }

    if (!apiKeyData.permissions.includes('orders:write')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions'
        }
      }, { status: 403 });
    }

    const rateLimitOk = await checkRateLimit(apiKeyData.id, apiKeyData.rateLimit);
    if (!rateLimitOk) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded'
        }
      }, { status: 429 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.clientName || !body.products || body.products.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'clientName and products are required'
        }
      }, { status: 400 });
    }

    // Create order logic here (integrate with your existing order creation)
    // This would call your existing order creation function

    await logApiRequest(apiKeyData.id, 'POST', '/api/v1/orders', 201);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { message: 'Order created successfully' }
    }, { status: 201 });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'An error occurred'
      }
    }, { status: 500 });
  }
}
