'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Customer, CustomerType, CustomerStatus } from '@/types/customer.d';
import { DataTable } from '@/components/Table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Award,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  FileText,
  Star
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { addDocument, updateDocument, deleteDocument } from '@/lib/firestore';
import { updateCustomerOnOrderCreate, updateCustomerOnOrderCancel, recalculateAllCustomerStats, linkOrdersToCustomers } from '@/lib/customerHelpers';
import { usePaginatedData } from '@/hooks/usePaginatedData';
import { Pagination } from '@/components/Pagination';
import { AddCustomerModal } from '@/components/AddCustomerModal';
import { EditCustomerModal } from '@/components/EditCustomerModal';
import { ViewCustomerModal } from '@/components/ViewCustomerModal';
import { CustomAlert } from '@/components/CustomAlert';
import { useCustomAlert } from '@/hooks/useCustomAlert';

export default function CustomersPage() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const router = useRouter();
  const { alertState, showAlert, showConfirm, closeAlert } = useCustomAlert();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedType, setSelectedType] = useState<CustomerType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [realStats, setRealStats] = useState({
    totalCustomers: 0,
    vipCustomers: 0,
    totalRevenue: 0,
    avgRevenue: 0,
    totalOutstanding: 0,
    newCustomers: 0,
  });

  // Navigate to orders with selected customer
  const handleCreateOrder = (customer: Customer) => {
    // Store customer in sessionStorage to pass to orders page
    sessionStorage.setItem('preSelectedCustomer', JSON.stringify(customer));
    router.push('/dashboard/orders');
  };

  // Use paginated data hook
  const {
    data: customers,
    isLoading,
    error,
    page,
    hasMore,
    nextPage,
    prevPage,
    invalidate,
    pageSize,
  } = usePaginatedData<Customer>({
    collectionName: 'customers',
    organizationId: currentOrganization?.id,
    pageSize: 50,
    orderByField: 'createdAt',
    orderDirection: 'desc',
    queryKey: ['customers', currentOrganization?.id || ''],
  });

  // Filter customers by type and search
  const filteredCustomers = customers.filter(customer => {
    const matchesType = selectedType === 'all' || customer.type === selectedType;
    const matchesSearch = 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.customerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.companyName && customer.companyName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesType && matchesSearch;
  });

  // Fetch real-time statistics from all customers in Firestore
  useEffect(() => {
    const fetchStats = async () => {
      if (!currentOrganization?.id) return;

      try {
        // Fetch ALL customers for accurate stats
        const customersQuery = query(
          collection(db, 'customers'),
          where('organizationId', '==', currentOrganization.id)
        );
        const customersSnapshot = await getDocs(customersQuery);
        const allCustomers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));

        // Calculate VIP threshold (customers with total purchases > 50000)
        const VIP_THRESHOLD = 50000;
        const vipCount = allCustomers.filter(c => c.totalPurchases >= VIP_THRESHOLD).length;

        // Calculate totals
        const totalRevenue = allCustomers.reduce((sum, c) => sum + (c.totalPurchases || 0), 0);
        const totalOutstanding = allCustomers.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0);
        const newCustomersCount = allCustomers.filter(c => c.type === 'new').length;

        setRealStats({
          totalCustomers: allCustomers.length,
          vipCustomers: vipCount,
          totalRevenue,
          avgRevenue: allCustomers.length > 0 ? totalRevenue / allCustomers.length : 0,
          totalOutstanding,
          newCustomers: newCustomersCount,
        });
      } catch (error) {
        console.error('Error fetching customer stats:', error);
      }
    };

    fetchStats();
  }, [currentOrganization?.id, customers]); // Re-fetch when customers change

  // Recalculate all customer stats from orders
  const handleRecalculateStats = async () => {
    if (!currentOrganization?.id) return;
    
    showConfirm({
      type: 'info',
      title: 'Recalculate Customer Statistics',
      message: 'This will:\n1. Link orders to customers (by name/phone)\n2. Recalculate all customer statistics\n\nContinue?',
      confirmText: 'Yes, Continue',
      onConfirm: async () => {
        setIsRecalculating(true);
    try {
      // First, link orders to customers
      console.log('Step 1: Linking orders to customers...');
      const linkResult = await linkOrdersToCustomers(currentOrganization.id);
      
      if (linkResult.success) {
        console.log(`✅ Linked ${linkResult.linked} orders (${linkResult.alreadyLinked} already linked)`);
      }

      // Then recalculate stats
      console.log('Step 2: Recalculating customer stats...');
      const result = await recalculateAllCustomerStats(currentOrganization.id);
      
      if (result.success) {
        showAlert({
          type: 'success',
          title: 'Statistics Updated!',
          message: `✅ Successfully completed!\n\nOrders linked: ${linkResult.linked}\nCustomers updated: ${result.updated}\n${result.errors > 0 ? `Errors: ${result.errors}` : ''}`,
        });
        invalidate(); // Refresh the customer list
      } else {
        showAlert({
          type: 'error',
          title: 'Update Failed',
          message: '❌ Failed to recalculate stats. Please try again.',
        });
      }
      } catch (error) {
        console.error('Error recalculating stats:', error);
        showAlert({
          type: 'error',
          title: 'Error',
          message: '❌ An error occurred. Please check the console.',
        });
      } finally {
        setIsRecalculating(false);
      }
    },
    });
  };

  const handleAdd = async (customer: Partial<Customer>) => {
    try {
      if (!currentOrganization?.id || !user?.uid) {
        showAlert({
          type: 'error',
          title: 'Error',
          message: 'Organization or user not found',
        });
        return;
      }

      // Generate next available customer ID (fills gaps)
      const customerId = await generateNextCustomerId();

      const newCustomer: Partial<Customer> = {
        ...customer,
        customerId,
        organizationId: currentOrganization.id,
        createdBy: user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        totalPurchases: 0,
        totalOrders: 0,
        outstandingBalance: 0,
        loyaltyPoints: 0,
        notes: [],
        tags: customer.tags || [],
        type: customer.type || 'new',
        status: 'active',
      };

      await addDocument('customers', newCustomer);
      invalidate();
      showAlert({
        type: 'success',
        message: '✅ Customer added successfully!',
      });
    } catch (error) {
      console.error('Error adding customer:', error);
      showAlert({
        type: 'error',
        message: 'Failed to add customer. Please try again.',
      });
    }
  };

  // Generate next available Customer ID
  const generateNextCustomerId = async (): Promise<string> => {
    if (!currentOrganization?.id) return 'CUST-0001';

    try {
      // Extract existing customer numbers from current data
      const existingNumbers = customers
        .map(customer => {
          const match = customer.customerId.match(/^CUST-(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => num > 0)
        .sort((a, b) => a - b);

      // Find the first available number (fill gaps first)
      let nextNumber = 1;
      for (const num of existingNumbers) {
        if (num === nextNumber) {
          nextNumber++;
        } else if (num > nextNumber) {
          // Found a gap, use it
          break;
        }
      }

      return `CUST-${nextNumber.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating customer ID:', error);
      return 'CUST-0001';
    }
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsEditModalOpen(true);
  };

  const handleView = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsViewModalOpen(true);
  };

  const handleUpdate = async (id: string, updatedCustomer: Partial<Customer>) => {
    try {
      await updateDocument('customers', id, {
        ...updatedCustomer,
        updatedAt: new Date(),
      });
      invalidate();
      showAlert({
        type: 'success',
        message: '✅ Customer updated successfully!',
      });
    } catch (error) {
      console.error('Error updating customer:', error);
      showAlert({
        type: 'error',
        message: 'Failed to update customer. Please try again.',
      });
    }
  };

  const handleDelete = async (id: string) => {
    showConfirm({
      type: 'warning',
      title: 'Delete Customer',
      message: 'Are you sure you want to delete this customer? This action cannot be undone.',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await deleteDocument('customers', id);
          invalidate();
          showAlert({
            type: 'success',
            message: '✅ Customer deleted successfully!',
          });
        } catch (error) {
          console.error('Error deleting customer:', error);
          showAlert({
            type: 'error',
            message: 'Failed to delete customer. Please try again.',
          });
        }
      },
    });
  };

  const getTypeColor = (type: CustomerType) => {
    const colors = {
      vip: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      regular: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      new: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    };
    return colors[type] || colors.regular;
  };

  const getTypeIcon = (type: CustomerType) => {
    const icons = {
      vip: <Star className="w-3 h-3 fill-current" />,
      regular: <Users className="w-3 h-3" />,
      new: <UserPlus className="w-3 h-3" />,
      inactive: <Users className="w-3 h-3" />,
    };
    return icons[type] || icons.regular;
  };

  const columns = [
    { 
      header: 'Customer ID', 
      accessor: ((customer: Customer) => (
        <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
          {customer.customerId}
        </span>
      )) as any 
    },
    { 
      header: 'Name', 
      accessor: ((customer: Customer) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100">{customer.name}</div>
          {customer.companyName && (
            <div className="text-xs text-gray-500 dark:text-gray-400">{customer.companyName}</div>
          )}
        </div>
      )) as any 
    },
    { 
      header: 'Contact', 
      accessor: ((customer: Customer) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-sm">
            <Phone className="w-3 h-3 text-gray-400" />
            <span className="text-gray-900 dark:text-gray-100">{customer.phone}</span>
          </div>
          {customer.email && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Mail className="w-3 h-3" />
              <span>{customer.email}</span>
            </div>
          )}
        </div>
      )) as any 
    },
    { 
      header: 'Location', 
      accessor: ((customer: Customer) => (
        customer.city || customer.country ? (
          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
            <MapPin className="w-3 h-3" />
            <span>{[customer.city, customer.country].filter(Boolean).join(', ')}</span>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )
      )) as any 
    },
    { 
      header: 'Type', 
      accessor: ((customer: Customer) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${getTypeColor(customer.type)}`}>
          {getTypeIcon(customer.type)}
          {customer.type ? customer.type.charAt(0).toUpperCase() + customer.type.slice(1) : 'Regular'}
        </span>
      )) as any 
    },
    { 
      header: 'Orders', 
      accessor: ((customer: Customer) => (
        <span className="font-semibold text-gray-900 dark:text-gray-100">{customer.totalOrders || 0}</span>
      )) as any 
    },
    { 
      header: 'Total Purchases', 
      accessor: ((customer: Customer) => (
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {formatCurrency(customer.totalPurchases || 0)}
        </span>
      )) as any 
    },
    { 
      header: 'Outstanding', 
      accessor: ((customer: Customer) => (
        <span className={(customer.outstandingBalance || 0) > 0 ? 'font-semibold text-red-600 dark:text-red-400' : 'text-gray-400'}>
          {(customer.outstandingBalance || 0) > 0 ? formatCurrency(customer.outstandingBalance) : '-'}
        </span>
      )) as any 
    },
    { 
      header: 'Loyalty Points', 
      accessor: ((customer: Customer) => (
        <div className="flex items-center gap-1">
          <Award className="w-3 h-3 text-yellow-500" />
          <span className="font-medium text-gray-900 dark:text-gray-100">{customer.loyaltyPoints || 0}</span>
        </div>
      )) as any 
    },
    {
      header: 'Actions',
      accessor: ((customer: Customer) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleView(customer)}
            className="hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 p-1"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(customer)}
            className="hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20 p-1"
            title="Edit"
          >
            <Edit className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(customer.id)}
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
    <>
      <CustomAlert {...alertState} onClose={closeAlert} />
      
      <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Customer Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage customer relationships and track purchase history</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleRecalculateStats} 
            variant="outline"
            disabled={isRecalculating}
            className="flex items-center gap-2"
            title="Recalculate all customer stats from orders"
          >
            <TrendingUp className="w-4 h-4" />
            <span>{isRecalculating ? 'Syncing...' : 'Sync Stats'}</span>
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Total Customers</CardDescription>
              <Users className="w-4 h-4 text-gray-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{realStats.totalCustomers}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{customers.filter(c => c.status === 'active').length} active</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>VIP Customers</CardDescription>
              <Star className="w-4 h-4 text-purple-500 fill-current" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{realStats.vipCustomers}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{realStats.newCustomers} new customers</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Total Revenue</CardDescription>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(realStats.totalRevenue)}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Avg: {formatCurrency(realStats.avgRevenue)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Outstanding Balance</CardDescription>
              <DollarSign className="w-4 h-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(realStats.totalOutstanding)}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Amount due</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name, ID, phone, email, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as CustomerType | 'all')}
          className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="all">All Types</option>
          <option value="vip">VIP</option>
          <option value="regular">Regular</option>
          <option value="new">New</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Customers Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 dark:text-gray-400">Loading customers...</div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="text-red-600 dark:text-red-400 text-center">
            <p className="font-semibold text-lg">⚠️ Error Loading Customers</p>
            <p className="text-sm mt-2">{error.message}</p>
          </div>
          <Button onClick={() => invalidate()} variant="outline">
            Try Again
          </Button>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No customers found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
              {searchTerm || selectedType !== 'all' 
                ? 'Try adjusting your filters'
                : 'Add your first customer to get started'}
            </p>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <DataTable data={filteredCustomers} columns={columns} />
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

      {/* Modals */}
      <AddCustomerModal 
        open={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={handleAdd}
      />

      <EditCustomerModal 
        open={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        onUpdate={handleUpdate}
        customer={selectedCustomer}
      />

      <ViewCustomerModal
        open={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        customer={selectedCustomer}
        onEdit={(customer) => {
          setIsViewModalOpen(false);
          setSelectedCustomer(customer);
          setIsEditModalOpen(true);
        }}
        onCreateOrder={handleCreateOrder}
      />
      </div>
    </>
  );
}
