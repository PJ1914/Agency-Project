'use client';

import { useState, useEffect, useMemo } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order } from '@/types/order.d';
import { Transaction } from '@/types/transaction.d';
import { InventoryItem } from '@/types/inventory.d';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Package, 
  Download,
  Calendar,
  ChevronDown,
  Activity,
  Target,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  subDays,
  subMonths,
  format,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  parseISO,
  isWithinInterval,
} from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type DateRange = 'today' | 'week' | 'month' | 'last30' | 'last90' | 'custom';

interface AnalyticsData {
  orders: Order[];
  transactions: Transaction[];
  inventory: InventoryItem[];
}

interface SalesData {
  date: string;
  revenue: number;
  orders: number;
  profit?: number;
}

interface CustomerInsight {
  name: string;
  totalOrders: number;
  totalRevenue: number;
  lastOrderDate: Date;
  frequency: number;
}

interface ProductInsight {
  name: string;
  quantitySold: number;
  revenue: number;
  profit: number;
  margin: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function AnalyticsPage() {
  const { currentOrganization } = useOrganization();
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    orders: [],
    transactions: [],
    inventory: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      if (!currentOrganization?.id) return;

      setIsLoading(true);
      try {
        // Fetch orders
        const ordersQuery = query(
          collection(db, 'orders'),
          where('organizationId', '==', currentOrganization.id),
          orderBy('orderDate', 'desc')
        );
        const ordersSnap = await getDocs(ordersQuery);
        const orders = ordersSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          orderDate: doc.data().orderDate?.toDate?.() || new Date(doc.data().orderDate),
        })) as Order[];

        // Fetch transactions
        const transactionsQuery = query(
          collection(db, 'transactions'),
          where('organizationId', '==', currentOrganization.id)
        );
        const transactionsSnap = await getDocs(transactionsQuery);
        const transactions = transactionsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate?.() || new Date(doc.data().date),
        })) as Transaction[];

        // Fetch inventory
        const inventoryQuery = query(
          collection(db, 'inventory'),
          where('organizationId', '==', currentOrganization.id)
        );
        const inventorySnap = await getDocs(inventoryQuery);
        const inventory = inventorySnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as InventoryItem[];

        setAnalyticsData({ orders, transactions, inventory });
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentOrganization]);

  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return { startDate: startOfDay(now), endDate: endOfDay(now) };
      case 'week':
        return { startDate: startOfWeek(now), endDate: endOfWeek(now) };
      case 'month':
        return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
      case 'last30':
        return { startDate: subDays(now, 30), endDate: now };
      case 'last90':
        return { startDate: subDays(now, 90), endDate: now };
      case 'custom':
        return {
          startDate: customStartDate ? parseISO(customStartDate) : subMonths(now, 1),
          endDate: customEndDate ? parseISO(customEndDate) : now,
        };
      default:
        return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
    }
  }, [dateRange, customStartDate, customEndDate]);

  // Filter data by date range
  const filteredOrders = useMemo(() => {
    return analyticsData.orders.filter(order => 
      isWithinInterval(order.orderDate, { start: startDate, end: endDate })
    );
  }, [analyticsData.orders, startDate, endDate]);

  const filteredTransactions = useMemo(() => {
    return analyticsData.transactions.filter(tx => 
      isWithinInterval(tx.date, { start: startDate, end: endDate })
    );
  }, [analyticsData.transactions, startDate, endDate]);

  // Sales trend data
  const salesTrendData = useMemo(() => {
    const interval = dateRange === 'today' || dateRange === 'week' 
      ? eachDayOfInterval({ start: startDate, end: endDate })
      : dateRange === 'month' || dateRange === 'last30'
      ? eachDayOfInterval({ start: startDate, end: endDate })
      : eachMonthOfInterval({ start: startDate, end: endDate });

    return interval.map(date => {
      const dayOrders = filteredOrders.filter(order => {
        const orderDate = new Date(order.orderDate);
        if (dateRange === 'last90') {
          return format(orderDate, 'yyyy-MM') === format(date, 'yyyy-MM');
        }
        return format(orderDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
      });

      const revenue = dayOrders.reduce((sum, order) => sum + order.amount, 0);
      // Note: Cost calculation would need costPrice field in Order type
      const cost = dayOrders.reduce((sum, order) => sum + ((order.amount * 0.7) || 0), 0); // Assuming 30% margin

      return {
        date: dateRange === 'last90' ? format(date, 'MMM yyyy') : format(date, 'MMM dd'),
        revenue,
        orders: dayOrders.length,
        profit: revenue - cost,
      };
    });
  }, [filteredOrders, startDate, endDate, dateRange]);

  // Customer insights
  const customerInsights = useMemo(() => {
    const customerMap = new Map<string, CustomerInsight>();

    filteredOrders.forEach(order => {
      const existing = customerMap.get(order.clientName);
      if (existing) {
        existing.totalOrders++;
        existing.totalRevenue += order.amount;
        const orderDate = order.orderDate instanceof Date ? order.orderDate : new Date(order.orderDate);
        if (orderDate > existing.lastOrderDate) {
          existing.lastOrderDate = orderDate;
        }
      } else {
        customerMap.set(order.clientName, {
          name: order.clientName,
          totalOrders: 1,
          totalRevenue: order.amount,
          lastOrderDate: order.orderDate instanceof Date ? order.orderDate : new Date(order.orderDate),
          frequency: 0,
        });
      }
    });

    // Calculate frequency (orders per month)
    const monthsInRange = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    customerMap.forEach(customer => {
      customer.frequency = customer.totalOrders / monthsInRange;
    });

    return Array.from(customerMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);
  }, [filteredOrders, startDate, endDate]);

  // Product insights
  const productInsights = useMemo(() => {
    const productMap = new Map<string, ProductInsight>();

    filteredOrders.forEach(order => {
      const existing = productMap.get(order.productName);
      const revenue = order.amount;
      const cost = order.amount * 0.7; // Assuming 30% margin
      const profit = revenue - cost;

      if (existing) {
        existing.quantitySold += order.quantity;
        existing.revenue += revenue;
        existing.profit += profit;
        existing.margin = (existing.profit / existing.revenue) * 100;
      } else {
        productMap.set(order.productName, {
          name: order.productName,
          quantitySold: order.quantity,
          revenue,
          profit,
          margin: revenue > 0 ? (profit / revenue) * 100 : 0,
        });
      }
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filteredOrders]);

  // Key metrics
  const metrics = useMemo(() => {
    const totalRevenue = filteredTransactions
      .filter(tx => tx.status === 'Success')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalOrders = filteredOrders.length;
    
    const totalCost = filteredOrders.reduce((sum, order) => 
      sum + (order.amount * 0.7), 0
    ); // Assuming 30% margin

    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    const uniqueCustomers = new Set(filteredOrders.map(o => o.clientName)).size;

    // Previous period comparison
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const prevStartDate = subDays(startDate, periodDays);
    const prevEndDate = startDate;
    
    const prevOrders = analyticsData.orders.filter(order => 
      isWithinInterval(order.orderDate, { start: prevStartDate, end: prevEndDate })
    );
    const prevRevenue = prevOrders.reduce((sum, order) => sum + order.amount, 0);
    
    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalOrders,
      totalProfit,
      profitMargin,
      avgOrderValue,
      uniqueCustomers,
      revenueGrowth,
    };
  }, [filteredOrders, filteredTransactions, analyticsData.orders, startDate, endDate]);

  // Payment mode breakdown
  const paymentModeData = useMemo(() => {
    const modeMap = new Map<string, number>();
    
    filteredTransactions
      .filter(tx => tx.status === 'Success')
      .forEach(tx => {
        modeMap.set(tx.paymentMode, (modeMap.get(tx.paymentMode) || 0) + tx.amount);
      });

    return Array.from(modeMap.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Analytics Report', 14, 22);
    doc.setFontSize(11);
    doc.text(`${currentOrganization?.name || 'Organization'}`, 14, 30);
    doc.text(`Period: ${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`, 14, 36);
    doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, 42);

    let yPos = 52;

    // Key Metrics
    doc.setFontSize(14);
    doc.text('Key Metrics', 14, yPos);
    yPos += 10;

    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value']],
      body: [
        ['Total Revenue', formatCurrency(metrics.totalRevenue)],
        ['Total Orders', metrics.totalOrders.toString()],
        ['Total Profit', formatCurrency(metrics.totalProfit)],
        ['Profit Margin', `${metrics.profitMargin.toFixed(2)}%`],
        ['Avg Order Value', formatCurrency(metrics.avgOrderValue)],
        ['Unique Customers', metrics.uniqueCustomers.toString()],
        ['Revenue Growth', `${metrics.revenueGrowth >= 0 ? '+' : ''}${metrics.revenueGrowth.toFixed(2)}%`],
      ],
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Top Customers
    doc.setFontSize(14);
    doc.text('Top 10 Customers', 14, yPos);
    yPos += 10;

    autoTable(doc, {
      startY: yPos,
      head: [['Customer', 'Orders', 'Revenue', 'Avg Order']],
      body: customerInsights.map(c => [
        c.name,
        c.totalOrders.toString(),
        formatCurrency(c.totalRevenue),
        formatCurrency(c.totalRevenue / c.totalOrders),
      ]),
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // New page for products
    doc.addPage();
    yPos = 20;

    // Top Products
    doc.setFontSize(14);
    doc.text('Top 10 Products', 14, yPos);
    yPos += 10;

    autoTable(doc, {
      startY: yPos,
      head: [['Product', 'Qty Sold', 'Revenue', 'Profit', 'Margin %']],
      body: productInsights.map(p => [
        p.name,
        p.quantitySold.toString(),
        formatCurrency(p.revenue),
        formatCurrency(p.profit),
        `${p.margin.toFixed(2)}%`,
      ]),
    });

    doc.save(`analytics-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  if (!currentOrganization) {
    return (
      <div className="p-3 sm:p-4 md:p-6">
        <div className="text-center py-8 sm:py-12">
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
            Please select an organization to view analytics
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-3 sm:p-4 md:p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-6 h-6 sm:w-8 sm:h-8" />
            Advanced Analytics
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-500 dark:text-gray-400 mt-1">
            Deep insights into your business performance
          </p>
        </div>
        <Button onClick={exportToPDF} className="flex items-center gap-2 w-full sm:w-auto">
          <Download className="w-4 h-4" />
          Export PDF
        </Button>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4">
        <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="last30">Last 30 Days</option>
              <option value="last90">Last 90 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {dateRange === 'custom' && (
            <>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Showing data from {format(startDate, 'MMM dd, yyyy')} to {format(endDate, 'MMM dd, yyyy')}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-3 sm:p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm opacity-90">Total Revenue</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{formatCurrency(metrics.totalRevenue)}</p>
              <div className="flex items-center gap-1 mt-2">
                {metrics.revenueGrowth >= 0 ? (
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                ) : (
                  <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />
                )}
                <span className="text-xs sm:text-sm">
                  {metrics.revenueGrowth >= 0 ? '+' : ''}{metrics.revenueGrowth.toFixed(1)}% vs previous period
                </span>
              </div>
            </div>
            <DollarSign className="w-10 h-10 sm:w-12 sm:h-12 opacity-50" />
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-3 sm:p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm opacity-90">Total Orders</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{metrics.totalOrders}</p>
              <p className="text-xs sm:text-sm mt-2 opacity-75">
                Avg: {formatCurrency(metrics.avgOrderValue)}
              </p>
            </div>
            <Package className="w-10 h-10 sm:w-12 sm:h-12 opacity-50" />
          </div>
        </div>

        {/* Profit */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-3 sm:p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm opacity-90">Total Profit</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{formatCurrency(metrics.totalProfit)}</p>
              <p className="text-xs sm:text-sm mt-2 opacity-75">
                Margin: {metrics.profitMargin.toFixed(1)}%
              </p>
            </div>
            <Target className="w-10 h-10 sm:w-12 sm:h-12 opacity-50" />
          </div>
        </div>

        {/* Customers */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-3 sm:p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm opacity-90">Unique Customers</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{metrics.uniqueCustomers}</p>
              <p className="text-xs sm:text-sm mt-2 opacity-75">
                Active in period
              </p>
            </div>
            <Users className="w-10 h-10 sm:w-12 sm:h-12 opacity-50" />
          </div>
        </div>
      </div>

      {/* Sales Trend Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 md:p-6">
        <h2 className="text-base sm:text-lg font-semibold mb-4 dark:text-white">Sales Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={salesTrendData}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis 
              dataKey="date" 
              className="text-xs dark:fill-gray-400" 
              tick={{ fontSize: 12 }}
            />
            <YAxis className="text-xs dark:fill-gray-400" tick={{ fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
              }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#3b82f6" 
              fillOpacity={1} 
              fill="url(#colorRevenue)" 
              name="Revenue"
            />
            <Area 
              type="monotone" 
              dataKey="profit" 
              stroke="#10b981" 
              fillOpacity={1} 
              fill="url(#colorProfit)" 
              name="Profit"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Payment Mode Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 md:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-4 dark:text-white">Payment Mode Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={paymentModeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {paymentModeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Orders vs Revenue */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 md:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-4 dark:text-white">Orders Over Time</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={salesTrendData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis 
                dataKey="date" 
                className="text-xs dark:fill-gray-400" 
                tick={{ fontSize: 12 }}
              />
              <YAxis className="text-xs dark:fill-gray-400" tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="orders" fill="#3b82f6" name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Customer Insights */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 md:p-6">
        <h2 className="text-base sm:text-lg font-semibold mb-4 dark:text-white">Top 10 Customers</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-2 px-2 sm:px-4 dark:text-gray-300">Customer</th>
                <th className="text-right py-2 px-2 sm:px-4 dark:text-gray-300">Orders</th>
                <th className="text-right py-2 px-2 sm:px-4 dark:text-gray-300">Revenue</th>
                <th className="text-right py-2 px-2 sm:px-4 dark:text-gray-300">Avg Order</th>
                <th className="text-right py-2 px-2 sm:px-4 dark:text-gray-300">Frequency</th>
              </tr>
            </thead>
            <tbody>
              {customerInsights.map((customer, index) => (
                <tr key={index} className="border-b dark:border-gray-700/50">
                  <td className="py-2 px-2 sm:px-4 dark:text-gray-300">{customer.name}</td>
                  <td className="text-right py-2 px-2 sm:px-4 dark:text-gray-300">{customer.totalOrders}</td>
                  <td className="text-right py-2 px-2 sm:px-4 dark:text-gray-300">{formatCurrency(customer.totalRevenue)}</td>
                  <td className="text-right py-2 px-2 sm:px-4 dark:text-gray-300">
                    {formatCurrency(customer.totalRevenue / customer.totalOrders)}
                  </td>
                  <td className="text-right py-2 px-2 sm:px-4 dark:text-gray-300">
                    {customer.frequency.toFixed(1)}/month
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Insights */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 md:p-6">
        <h2 className="text-base sm:text-lg font-semibold mb-4 dark:text-white">Top 10 Products by Revenue</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-2 px-2 sm:px-4 dark:text-gray-300">Product</th>
                <th className="text-right py-2 px-2 sm:px-4 dark:text-gray-300">Qty Sold</th>
                <th className="text-right py-2 px-2 sm:px-4 dark:text-gray-300">Revenue</th>
                <th className="text-right py-2 px-2 sm:px-4 dark:text-gray-300">Profit</th>
                <th className="text-right py-2 px-2 sm:px-4 dark:text-gray-300">Margin</th>
              </tr>
            </thead>
            <tbody>
              {productInsights.map((product, index) => (
                <tr key={index} className="border-b dark:border-gray-700/50">
                  <td className="py-2 px-2 sm:px-4 dark:text-gray-300">{product.name}</td>
                  <td className="text-right py-2 px-2 sm:px-4 dark:text-gray-300">{product.quantitySold}</td>
                  <td className="text-right py-2 px-2 sm:px-4 dark:text-gray-300">{formatCurrency(product.revenue)}</td>
                  <td className="text-right py-2 px-2 sm:px-4 dark:text-gray-300">
                    <span className={product.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {formatCurrency(product.profit)}
                    </span>
                  </td>
                  <td className="text-right py-2 px-2 sm:px-4">
                    <span className={`${
                      product.margin >= 30 ? 'text-green-600 dark:text-green-400' : 
                      product.margin >= 15 ? 'text-yellow-600 dark:text-yellow-400' : 
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {product.margin.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Predictive Insights */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg p-4 sm:p-6 text-white">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Predictive Insights</h3>
            <ul className="space-y-2 text-sm opacity-90">
              {metrics.revenueGrowth > 10 && (
                <li>✨ Strong growth trend detected (+{metrics.revenueGrowth.toFixed(1)}%). Consider increasing inventory.</li>
              )}
              {metrics.profitMargin < 15 && (
                <li>⚠️ Profit margin is below 15%. Review pricing or reduce costs.</li>
              )}
              {customerInsights.length > 0 && customerInsights[0].totalOrders > 10 && (
                <li>🎯 {customerInsights[0].name} is a VIP customer. Consider offering loyalty rewards.</li>
              )}
              {productInsights.some(p => p.margin < 10) && (
                <li>💡 Some products have low margins (&lt;10%). Review pricing strategy.</li>
              )}
              {metrics.avgOrderValue > 0 && (
                <li>📈 Based on trends, projected revenue for next period: {formatCurrency(metrics.totalRevenue * (1 + metrics.revenueGrowth / 100))}</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
