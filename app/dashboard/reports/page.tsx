'use client';

import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Transaction } from '@/types/transaction.d';
import { Order } from '@/types/order.d';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText, Calendar, PieChart as PieChartIcon } from 'lucide-react';
import { generateReport, ReportPeriod } from '@/lib/reports';
import { formatCurrency } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('monthly');
  const { transactions, orders, transactionsLoading } = useData();

  // Calculate payment mode breakdown
  const paymentModeBreakdown = transactions
    .filter(tx => tx.status === 'Success')
    .reduce((acc, tx) => {
      const mode = tx.paymentMode;
      acc[mode] = (acc[mode] || 0) + tx.amount;
      return acc;
    }, {} as Record<string, number>);

  // Format for pie chart
  const pieChartData = Object.entries(paymentModeBreakdown).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

  // Total calculations
  const totalRevenue = transactions
    .filter(tx => tx.status === 'Success')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalTransactions = transactions.length;
  const successfulTransactions = transactions.filter(tx => tx.status === 'Success').length;
  const pendingTransactions = transactions.filter(tx => tx.status === 'Pending').length;

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      const report = await generateReport({ period: selectedPeriod });
      console.log('Report generated:', report);
      // Here you would implement PDF/Excel export
      alert('Report generated successfully! Export functionality coming soon.');
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const periods: { value: ReportPeriod; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Reports</h1>
        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">Generate and export business reports with payment insights</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold dark:text-gray-100">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">From successful transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalTransactions}</p>
            <p className="text-xs text-gray-500 mt-1">All payment records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Successful</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{successfulTransactions}</p>
            <p className="text-xs text-gray-500 mt-1">Completed payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{pendingTransactions}</p>
            <p className="text-xs text-gray-500 mt-1">Awaiting confirmation</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Mode Breakdown Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <PieChartIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            Payment Mode Breakdown
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Revenue distribution by payment method</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-700 mb-4">Detailed Breakdown</h4>
              {Object.entries(paymentModeBreakdown).map(([mode, amount], index) => (
                <div key={mode} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium capitalize">{mode}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(amount)}</p>
                    <p className="text-xs text-gray-500">
                      {((amount / totalRevenue) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {periods.map((period) => (
          <Card
            key={period.value}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedPeriod === period.value ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedPeriod(period.value)}
          >
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center space-x-2 text-sm sm:text-base">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{period.label}</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Generate {period.label.toLowerCase()} report
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Export Options</CardTitle>
          <CardDescription>Choose your preferred export format</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button
            onClick={handleGenerateReport}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <span>{loading ? 'Generating...' : 'Export to PDF'}</span>
          </Button>
          <Button
            onClick={handleGenerateReport}
            disabled={loading}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>{loading ? 'Generating...' : 'Export to Excel'}</span>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Report Preview</CardTitle>
          <CardDescription>Summary of the {selectedPeriod} report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>Select a period and click export to generate your report</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
