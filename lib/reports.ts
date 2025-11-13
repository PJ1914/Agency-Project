import { firestoreService, firestoreHelpers } from './firestore';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface ReportFilters {
  period: ReportPeriod;
  startDate?: Date;
  endDate?: Date;
}

export interface ReportData {
  orders: any[];
  transactions: any[];
  shipments: any[];
  inventory: any[];
  summary: {
    totalOrders: number;
    totalRevenue: number;
    totalShipments: number;
    pendingOrders: number;
    deliveredOrders: number;
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
  };
}

// Get date range based on period
function getDateRange(period: ReportPeriod, customStart?: Date, customEnd?: Date): [Date, Date] {
  const now = new Date();
  
  switch (period) {
    case 'daily':
      return [startOfDay(now), endOfDay(now)];
    case 'weekly':
      return [startOfWeek(now), endOfWeek(now)];
    case 'monthly':
      return [startOfMonth(now), endOfMonth(now)];
    case 'yearly':
      return [startOfYear(now), endOfYear(now)];
    case 'custom':
      if (!customStart || !customEnd) {
        throw new Error('Custom period requires start and end dates');
      }
      return [customStart, customEnd];
    default:
      return [startOfDay(now), endOfDay(now)];
  }
}

// Generate report data
export async function generateReport(filters: ReportFilters): Promise<ReportData> {
  try {
    const [startDate, endDate] = getDateRange(filters.period, filters.startDate, filters.endDate);
    
    // Convert dates to Firestore timestamps
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    // Fetch filtered data from Firestore
    const orders = await firestoreService.query('orders', [
      firestoreHelpers.where('createdAt', '>=', startTimestamp),
      firestoreHelpers.where('createdAt', '<=', endTimestamp),
      firestoreHelpers.orderBy('createdAt', 'desc'),
    ]);

    const transactions = await firestoreService.query('transactions', [
      firestoreHelpers.where('createdAt', '>=', startTimestamp),
      firestoreHelpers.where('createdAt', '<=', endTimestamp),
      firestoreHelpers.orderBy('createdAt', 'desc'),
    ]);

    const shipments = await firestoreService.query('shipments', [
      firestoreHelpers.where('createdAt', '>=', startTimestamp),
      firestoreHelpers.where('createdAt', '<=', endTimestamp),
      firestoreHelpers.orderBy('createdAt', 'desc'),
    ]);

    const inventory = await firestoreService.getAll('inventory');

    // Calculate summary statistics
    const summary = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum: number, order: any) => sum + (order.amount || 0), 0),
      totalShipments: shipments.length,
      pendingOrders: orders.filter((order: any) => order.status === 'pending').length,
      deliveredOrders: orders.filter((order: any) => order.status === 'delivered').length,
      totalTransactions: transactions.length,
      successfulTransactions: transactions.filter(
        (tx: any) => tx.status === 'captured' || tx.status === 'authorized'
      ).length,
      failedTransactions: transactions.filter((tx: any) => tx.status === 'failed').length,
    };

    return {
      orders,
      transactions,
      shipments,
      inventory,
      summary,
    };
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
}
