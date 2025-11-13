'use client';

import { StatCard } from '@/components/StatCard';
import { ChartCard } from '@/components/ChartCard';
import { useData } from '@/contexts/DataContext';
import { Package, DollarSign, Truck, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function DashboardPage() {
  const { orders, transactions, shipments, inventory } = useData();

  // Calculate statistics
  const totalOrders = orders.length;
  
  // Use transaction data for revenue (all successful payments)
  const totalRevenue = transactions
    .filter(tx => tx.status === 'Success')
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const pendingShipments = shipments.filter(s => s.status === 'pending' || s.status === 'in-transit').length;
  const lowStockItems = inventory.filter(item => 
    item.lowStockThreshold && item.quantity <= item.lowStockThreshold
  ).length;

  // Calculate revenue trend by month from transactions
  const getRevenueByMonth = () => {
    const monthlyRevenue: { [key: string]: number } = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    transactions
      .filter(tx => tx.status === 'Success')
      .forEach(tx => {
        const date = tx.date instanceof Date ? tx.date : 
                     (tx.date && typeof tx.date === 'object' && 'seconds' in tx.date) ? 
                     new Date((tx.date as any).seconds * 1000) : new Date(tx.date);
        const monthKey = `${monthNames[date.getMonth()]}`;
        monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + tx.amount;
      });

    // Get last 6 months
    const currentMonth = new Date().getMonth();
    const revenueData = [];
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const monthName = monthNames[monthIndex];
      revenueData.push({
        name: monthName,
        revenue: monthlyRevenue[monthName] || 0
      });
    }
    
    return revenueData;
  };

  // Calculate orders by day of week
  const getOrdersByWeekday = () => {
    const weekdayOrders: { [key: string]: number } = {
      'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0
    };
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Get orders from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    orders.forEach(order => {
      const orderDate = order.orderDate instanceof Date ? order.orderDate :
                       (order.orderDate && typeof order.orderDate === 'object' && 'seconds' in order.orderDate) ?
                       new Date((order.orderDate as any).seconds * 1000) : new Date(order.orderDate);
      
      if (orderDate >= sevenDaysAgo) {
        const dayName = dayNames[orderDate.getDay()];
        weekdayOrders[dayName]++;
      }
    });
    
    return Object.entries(weekdayOrders).map(([name, orders]) => ({ name, orders }));
  };

  // Calculate trends (comparison with previous period)
  const calculateTrend = (type: 'orders' | 'revenue') => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    if (type === 'orders') {
      const lastMonthOrders = orders.filter(order => {
        const orderDate = order.orderDate instanceof Date ? order.orderDate :
                         (order.orderDate && typeof order.orderDate === 'object' && 'seconds' in order.orderDate) ?
                         new Date((order.orderDate as any).seconds * 1000) : new Date(order.orderDate);
        return orderDate >= thirtyDaysAgo && orderDate <= now;
      }).length;
      
      const previousMonthOrders = orders.filter(order => {
        const orderDate = order.orderDate instanceof Date ? order.orderDate :
                         (order.orderDate && typeof order.orderDate === 'object' && 'seconds' in order.orderDate) ?
                         new Date((order.orderDate as any).seconds * 1000) : new Date(order.orderDate);
        return orderDate >= sixtyDaysAgo && orderDate < thirtyDaysAgo;
      }).length;
      
      if (previousMonthOrders === 0) return { value: 0, isPositive: true };
      const change = ((lastMonthOrders - previousMonthOrders) / previousMonthOrders) * 100;
      return { value: Math.abs(Math.round(change)), isPositive: change >= 0 };
    } else {
      const lastMonthRevenue = transactions
        .filter(tx => {
          const txDate = tx.date instanceof Date ? tx.date :
                        (tx.date && typeof tx.date === 'object' && 'seconds' in tx.date) ?
                        new Date((tx.date as any).seconds * 1000) : new Date(tx.date);
          return tx.status === 'Success' && txDate >= thirtyDaysAgo && txDate <= now;
        })
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      const previousMonthRevenue = transactions
        .filter(tx => {
          const txDate = tx.date instanceof Date ? tx.date :
                        (tx.date && typeof tx.date === 'object' && 'seconds' in tx.date) ?
                        new Date((tx.date as any).seconds * 1000) : new Date(tx.date);
          return tx.status === 'Success' && txDate >= sixtyDaysAgo && txDate < thirtyDaysAgo;
        })
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      if (previousMonthRevenue === 0) return { value: 0, isPositive: true };
      const change = ((lastMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100;
      return { value: Math.abs(Math.round(change)), isPositive: change >= 0 };
    }
  };

  const revenueData = getRevenueByMonth();
  const ordersData = getOrdersByWeekday();
  const ordersTrend = calculateTrend('orders');
  const revenueTrend = calculateTrend('revenue');

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard Overview</h1>
        <p className="text-xs sm:text-sm md:text-base text-gray-500 dark:text-gray-400 mt-1">Track your business metrics in real-time</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <StatCard
          title="Total Orders"
          value={totalOrders}
          description="All time orders"
          icon={Package}
          trend={{ value: ordersTrend.value, label: 'from last month', isPositive: ordersTrend.isPositive }}
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          description="Total earnings"
          icon={DollarSign}
          trend={{ value: revenueTrend.value, label: 'from last month', isPositive: revenueTrend.isPositive }}
        />
        <StatCard
          title="Active Shipments"
          value={pendingShipments}
          description="In transit orders"
          icon={Truck}
        />
        <StatCard
          title="Low Stock Alerts"
          value={lowStockItems}
          description="Items need restocking"
          icon={AlertCircle}
          className="border-orange-200 bg-orange-50"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        <ChartCard title="Revenue Trend" description="Monthly revenue over time">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Weekly Orders" description="Orders received this week">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={ordersData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="orders" fill="#22C55E" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-3 sm:p-4 md:p-6">
          <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-3 sm:mb-4 dark:text-gray-100">Recent Orders</h3>
          <div className="space-y-2 sm:space-y-3">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b dark:border-gray-700 last:border-0 gap-2 sm:gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-xs sm:text-sm md:text-base truncate dark:text-gray-100">{order.clientName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{order.orderId}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-xs sm:text-sm md:text-base dark:text-gray-100">{formatCurrency(order.amount)}</p>
                  <span className="text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 inline-block">
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4 text-xs sm:text-sm">No orders yet</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-3 sm:p-4 md:p-6">
          <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-3 sm:mb-4 dark:text-gray-100">Recent Transactions</h3>
          <div className="space-y-2 sm:space-y-3">
            {transactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b dark:border-gray-700 last:border-0 gap-2 sm:gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-xs sm:text-sm md:text-base truncate dark:text-gray-100">{tx.transactionId}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{tx.paymentMode}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-xs sm:text-sm md:text-base dark:text-gray-100">{formatCurrency(tx.amount)}</p>
                  <span className={`text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full inline-block ${
                    tx.status === 'Success' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 
                    tx.status === 'Pending' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' : 
                    'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                  }`}>
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4 text-xs sm:text-sm">No transactions yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
