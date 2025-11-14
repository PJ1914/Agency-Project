'use client';

import { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Transaction } from '@/types/transaction.d';
import { Order } from '@/types/order.d';
import { DataTable } from '@/components/Table';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import { addDocument } from '@/lib/firestore';
import { AddPaymentModal } from '@/components/AddPaymentModal';
import { Button } from '@/components/ui/button';
import { Plus, Download, Filter } from 'lucide-react';
import { createNotification, checkPendingPayments, checkFailedPayments } from '@/lib/notifications';
import { usePaginatedData } from '@/hooks/usePaginatedData';
import { Pagination } from '@/components/Pagination';

export default function PaymentsPage() {
  const { orders } = useData();
  const { currentOrganization } = useOrganization();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<string>('all');

  // Use paginated data hook - only when organization is loaded
  const {
    data: transactions,
    isLoading: transactionsLoading,
    error: transactionsError,
    page,
    hasMore,
    nextPage,
    prevPage,
    invalidate,
    pageSize,
  } = usePaginatedData<Transaction>({
    collectionName: 'transactions',
    organizationId: currentOrganization?.id,
    pageSize: 50,
    orderByField: 'date',
    orderDirection: 'desc',
    queryKey: ['transactions', currentOrganization?.id || ''],
  });

  // Debug logging
  useEffect(() => {
    console.log('Payments Debug:', {
      organizationId: currentOrganization?.id,
      transactionsCount: transactions.length,
      isLoading: transactionsLoading,
      error: transactionsError,
      transactions: transactions.slice(0, 2), // Log first 2 transactions
    });
  }, [transactions, transactionsLoading, transactionsError, currentOrganization]);

  // One-time migration: Add organizationId to transactions that don't have it
  useEffect(() => {
    const migrateTransactions = async () => {
      if (!currentOrganization?.id) return;

      try {
        const { collection, query, where, getDocs, doc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');

        // Find transactions without organizationId
        const transactionsRef = collection(db, 'transactions');
        const snapshot = await getDocs(transactionsRef);
        
        let migratedCount = 0;
        const updates: Promise<void>[] = [];

        snapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          if (!data.organizationId) {
            // Add organizationId to transaction
            const docRef = doc(db, 'transactions', docSnapshot.id);
            updates.push(
              updateDoc(docRef, {
                organizationId: currentOrganization.id
              })
            );
            migratedCount++;
          }
        });

        if (updates.length > 0) {
          await Promise.all(updates);
          console.log(`✅ Migrated ${migratedCount} transactions with organizationId`);
          // Refresh data after migration
          invalidate();
        }
      } catch (error) {
        console.error('Migration error:', error);
      }
    };

    // Run migration once when component mounts with organization
    migrateTransactions();
  }, [currentOrganization?.id]); // Only run when org ID changes

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
      
      invalidate();
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
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 capitalize">
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
      <div className="p-3 sm:p-4 md:p-6 space-y-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Payments</h1>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-red-800 dark:text-red-400 font-semibold mb-2">Error Loading Payments</h3>
          <p className="text-red-600 dark:text-red-400 mb-4">{(transactionsError as any)?.message || 'Unknown error occurred'}</p>
          <Button onClick={invalidate}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="p-3 sm:p-4 md:p-6 space-y-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Payments</h1>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <div className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Loading organization...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Payments</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-500 dark:text-gray-400 mt-1">Track all payment transactions (online & offline)</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center justify-center gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Record Payment
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-3 sm:p-4 md:p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-xs sm:text-sm font-medium">Total Revenue</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-2">{formatCurrency(totalRevenue)}</p>
              <p className="text-green-100 text-xs mt-2">From successful transactions</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-3 sm:p-4 md:p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-xs sm:text-sm font-medium">Pending Amount</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-2">{formatCurrency(pendingAmount)}</p>
              <p className="text-yellow-100 text-xs mt-2">Awaiting confirmation</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 sm:p-4 md:p-6 text-white shadow-lg sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs sm:text-sm font-medium">Total Transactions</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-2">{transactions.length}</p>
              <p className="text-blue-100 text-xs mt-2">All payment records</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Mode Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-3 sm:p-4 md:p-6">
        <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-3 sm:mb-4 dark:text-gray-100">Payment Mode Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {Object.entries(paymentModeBreakdown).map(([mode, amount]) => (
            <div key={mode} className="border dark:border-gray-700 rounded-lg p-2 sm:p-3 md:p-4">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 capitalize">{mode}</p>
              <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(amount)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2 flex-1">
          <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-xs sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
        <Button variant="outline" className="flex items-center justify-center gap-2 w-full sm:w-auto text-xs sm:text-sm">
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Export CSV
        </Button>
      </div>

      {transactionsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <div className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Loading payments...</div>
          </div>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No transactions found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
            {transactions.length === 0 
              ? "Start by recording your first payment transaction"
              : "No transactions match the selected filter"}
          </p>
          <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center justify-center gap-2 mx-auto">
            <Plus className="w-4 h-4" />
            Record Payment
          </Button>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50">
            <DataTable data={filteredTransactions} columns={columns} />
          </div>
          <Pagination
            currentPage={page}
            onPageChange={(p) => p}
            onNext={nextPage}
            onPrev={prevPage}
            hasMore={hasMore}
            pageSize={pageSize}
          />
        </>
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

