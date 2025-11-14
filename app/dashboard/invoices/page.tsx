'use client';

import { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Invoice, InvoiceStatus } from '@/types/invoice.d';
import { DataTable } from '@/components/Table';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Mail, Download, Eye, Edit, Trash2, Check, X, AlertCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { updateDocument, deleteDocument } from '@/lib/firestore';
import { usePaginatedData } from '@/hooks/usePaginatedData';
import { Pagination } from '@/components/Pagination';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function InvoicesPage() {
  const { currentOrganization } = useOrganization();
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Use paginated data hook
  const {
    data: invoices,
    isLoading,
    error,
    page,
    hasMore,
    nextPage,
    prevPage,
    invalidate,
    pageSize,
  } = usePaginatedData<Invoice>({
    collectionName: 'invoices',
    organizationId: currentOrganization?.id,
    pageSize: 50,
    orderByField: 'invoiceDate',
    orderDirection: 'desc',
    queryKey: ['invoices', currentOrganization?.id || '', selectedStatus],
  });

  // Filter invoices by status and search term
  const filteredInvoices = invoices.filter(invoice => {
    const matchesStatus = selectedStatus === 'all' || invoice.status === selectedStatus;
    const matchesSearch = 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Calculate statistics
  const stats = {
    total: invoices.length,
    paid: invoices.filter(i => i.status === 'paid').length,
    unpaid: invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length,
    draft: invoices.filter(i => i.status === 'draft').length,
    totalRevenue: invoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + i.totalAmount, 0),
    pendingRevenue: invoices
      .filter(i => i.status === 'sent' || i.status === 'partial' || i.status === 'overdue')
      .reduce((sum, i) => sum + i.remainingAmount, 0),
  };

  const getStatusColor = (status: InvoiceStatus) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    };
    return colors[status];
  };

  const getStatusIcon = (status: InvoiceStatus) => {
    const icons = {
      draft: <FileText className="w-3 h-3" />,
      sent: <Mail className="w-3 h-3" />,
      paid: <Check className="w-3 h-3" />,
      partial: <AlertCircle className="w-3 h-3" />,
      overdue: <AlertCircle className="w-3 h-3" />,
      cancelled: <X className="w-3 h-3" />,
    };
    return icons[status];
  };

  const handleMarkAsPaid = async (invoice: Invoice) => {
    if (confirm(`Mark invoice ${invoice.invoiceNumber} as paid?`)) {
      try {
        await updateDocument('invoices', invoice.id!, {
          status: 'paid',
          paidAmount: invoice.totalAmount,
          remainingAmount: 0,
          updatedAt: new Date(),
        });
        invalidate();
      } catch (error) {
        console.error('Error updating invoice:', error);
        alert('Failed to update invoice');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      try {
        await deleteDocument('invoices', id);
        invalidate();
      } catch (error) {
        console.error('Error deleting invoice:', error);
        alert('Failed to delete invoice');
      }
    }
  };

  const columns = [
    { 
      header: 'Invoice #', 
      accessor: ((invoice: Invoice) => (
        <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
          {invoice.invoiceNumber}
        </span>
      )) as any 
    },
    { 
      header: 'Customer', 
      accessor: ((invoice: Invoice) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100">{invoice.customerName}</div>
          {invoice.customerEmail && (
            <div className="text-xs text-gray-500 dark:text-gray-400">{invoice.customerEmail}</div>
          )}
        </div>
      )) as any 
    },
    { 
      header: 'Date', 
      accessor: ((invoice: Invoice) => formatDate(invoice.invoiceDate)) as any 
    },
    { 
      header: 'Due Date', 
      accessor: ((invoice: Invoice) => {
        const dueDate = new Date(invoice.dueDate);
        const isOverdue = dueDate < new Date() && invoice.status !== 'paid' && invoice.status !== 'cancelled';
        return (
          <span className={isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-900 dark:text-gray-100'}>
            {formatDate(invoice.dueDate)}
          </span>
        );
      }) as any 
    },
    { 
      header: 'Amount', 
      accessor: ((invoice: Invoice) => (
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {formatCurrency(invoice.totalAmount)}
        </span>
      )) as any 
    },
    { 
      header: 'Paid', 
      accessor: ((invoice: Invoice) => (
        <span className="text-gray-600 dark:text-gray-400">
          {formatCurrency(invoice.paidAmount)}
        </span>
      )) as any 
    },
    { 
      header: 'Balance', 
      accessor: ((invoice: Invoice) => (
        <span className={invoice.remainingAmount > 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-green-600 dark:text-green-400'}>
          {formatCurrency(invoice.remainingAmount)}
        </span>
      )) as any 
    },
    { 
      header: 'Status', 
      accessor: ((invoice: Invoice) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${getStatusColor(invoice.status)}`}>
          {getStatusIcon(invoice.status)}
          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
        </span>
      )) as any 
    },
    {
      header: 'Actions',
      accessor: ((invoice: Invoice) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(`/dashboard/invoices/${invoice.id}`, '_blank')}
            className="hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 p-1"
            title="View Invoice"
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {/* TODO: Download PDF */}}
            className="hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20 p-1"
            title="Download PDF"
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleMarkAsPaid(invoice)}
              className="hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20 p-1"
              title="Mark as Paid"
            >
              <Check className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {/* TODO: Send email */}}
            className="hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-900/20 p-1"
            title="Send Email"
          >
            <Mail className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(invoice.id!)}
            className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 p-1"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )) as any
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Invoices</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage and track all invoices</p>
        </div>
        <Button onClick={() => window.location.href = '/dashboard/invoices/new'} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span>Create Invoice</span>
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Paid Invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.paid}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatCurrency(stats.totalRevenue)} revenue</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unpaid Invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.unpaid}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatCurrency(stats.pendingRevenue)} pending</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Draft Invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.draft}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by invoice number or customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as InvoiceStatus | 'all')}
          className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Invoices Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 dark:text-gray-400">Loading invoices...</div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="text-red-600 dark:text-red-400 text-center">
            <p className="font-semibold text-lg">⚠️ Error Loading Invoices</p>
            <p className="text-sm mt-2">{error.message}</p>
          </div>
          <Button onClick={() => invalidate()} variant="outline">
            Try Again
          </Button>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No invoices found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
              {searchTerm || selectedStatus !== 'all' 
                ? 'Try adjusting your filters'
                : 'Create your first invoice to get started'}
            </p>
            <Button onClick={() => window.location.href = '/dashboard/invoices/new'}>
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <DataTable data={filteredInvoices} columns={columns} />
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
    </div>
  );
}
