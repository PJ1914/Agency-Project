'use client';

import { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { Transaction } from '@/types/transaction.d';
import { Order } from '@/types/order.d';
import { DataTable } from '@/components/Table';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import { addDocument } from '@/lib/firestore';
import { AddPaymentModal } from '@/components/AddPaymentModal';
import { Button } from '@/components/ui/button';
import { Plus, Download, Filter } from 'lucide-react';
import { createNotification, checkPendingPayments, checkFailedPayments } from '@/lib/notifications';

export default function PaymentsPage() {
  const { transactions, transactionsLoading, transactionsError, refetchTransactions, orders } = useData();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<string>('all');

  // Check for pending and failed payments on load
  useEffect(() => {
    if (transactions.length > 0) {
      checkPendingPayments();
      checkFailedPayments();
    }
  }, [transactions]);

  const handleAddPayment = async (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await addDocument('transactions', transaction);
      
      // Create notification based on payment status
      if (transaction.status === 'Pending') {
        await createNotification({
          type: 'payment-pending',
          title: 'Payment Pending',
          message: `Payment of ₹${transaction.amount.toLocaleString()} from ${transaction.clientName} is awaiting confirmation.`,
          severity: 'warning',
          transactionId: transaction.transactionId,
          orderId: transaction.orderId,
          actionRequired: true,
          actionUrl: '/dashboard/payments',
        });
      } else if (transaction.status === 'Failed') {
        await createNotification({
          type: 'payment-failed',
          title: 'Payment Failed',
          message: `Payment of ₹${transaction.amount.toLocaleString()} from ${transaction.clientName} has failed.`,
          severity: 'critical',
          transactionId: transaction.transactionId,
          orderId: transaction.orderId,
          actionRequired: true,
          actionUrl: '/dashboard/payments',
        });
      }
      
      await refetchTransactions();
    } catch (error) {
      console.error('Error adding payment:', error);
      throw error;
    }
  };

  // Calculate statistics
  const totalRevenue = transactions
    .filter(tx => tx.status === 'Success')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const pendingAmount = transactions
    .filter(tx => tx.status === 'Pending')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const paymentModeBreakdown = transactions
    .filter(tx => tx.status === 'Success')
    .reduce((acc, tx) => {
      acc[tx.paymentMode] = (acc[tx.paymentMode] || 0) + tx.amount;
      return acc;
    }, {} as Record<string, number>);

  // Filter transactions
  const filteredTransactions = filterMode === 'all' 
    ? transactions 
    : transactions.filter(tx => tx.paymentMode === filterMode);

  const columns = [
    { header: 'Transaction ID', accessor: 'transactionId' as keyof Transaction },
    { header: 'Order ID', accessor: 'orderId' as keyof Transaction },
    { header: 'Client', accessor: 'clientName' as keyof Transaction },
    { 
      header: 'Amount', 
      accessor: ((tx: Transaction) => formatCurrency(tx.amount)) as any 
    },
    { 
      header: 'Payment Mode', 
      accessor: ((tx: Transaction) => (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
          {tx.paymentMode}
        </span>
      )) as any 
    },
    { 
      header: 'Status', 
      accessor: ((tx: Transaction) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>
          {tx.status}
        </span>
      )) as any 
    },
    { 
      header: 'Date', 
      accessor: ((tx: Transaction) => formatDate(tx.date)) as any 
    },
    { header: 'Remarks', accessor: 'remarks' as keyof Transaction },
  ];

  if (transactionsError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-800 font-semibold mb-2">Error Loading Payments</h3>
          <p className="text-red-600 mb-4">{transactionsError.message || 'Unknown error occurred'}</p>
          <Button onClick={refetchTransactions}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Payments</h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">Track all payment transactions (online & offline)</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center justify-center gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Record Payment
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 sm:p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-xs sm:text-sm font-medium">Total Revenue</p>
              <p className="text-2xl sm:text-3xl font-bold mt-2">{formatCurrency(totalRevenue)}</p>
              <p className="text-green-100 text-xs mt-2">From successful transactions</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-4 sm:p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-xs sm:text-sm font-medium">Pending Amount</p>
              <p className="text-2xl sm:text-3xl font-bold mt-2">{formatCurrency(pendingAmount)}</p>
              <p className="text-yellow-100 text-xs mt-2">Awaiting confirmation</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 sm:p-6 text-white shadow-lg sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs sm:text-sm font-medium">Total Transactions</p>
              <p className="text-2xl sm:text-3xl font-bold mt-2">{transactions.length}</p>
              <p className="text-blue-100 text-xs mt-2">All payment records</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Mode Breakdown */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-4">Payment Mode Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {Object.entries(paymentModeBreakdown).map(([mode, amount]) => (
            <div key={mode} className="border rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-gray-600 capitalize">{mode}</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{formatCurrency(amount)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2 flex-1">
          <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            <option value="all">All Payment Modes</option>
            <option value="cash">Cash Only</option>
            <option value="razorpay">Razorpay Only</option>
            <option value="phonepe">PhonePe/UPI Only</option>
            <option value="gpay">Google Pay Only</option>
            <option value="bank-transfer">Bank Transfer Only</option>
            <option value="upi">Other UPI</option>
            <option value="other">Other</option>
          </select>
        </div>
        <Button variant="outline" className="flex items-center justify-center gap-2 w-full sm:w-auto">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {transactionsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading payments...</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <DataTable data={filteredTransactions} columns={columns} />
        </div>
      )}

      <AddPaymentModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddPayment}
        orders={orders}
      />
    </div>
  );
}

