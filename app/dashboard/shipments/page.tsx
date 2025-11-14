'use client';

import { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Shipment } from '@/types/shipment.d';
import { DataTable } from '@/components/Table';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { formatDate, getStatusColor } from '@/lib/utils';
import { addDocument, updateDocument, deleteDocument } from '@/lib/firestore';
import { AddShipmentModal } from '@/components/AddShipmentModal';
import { EditShipmentModal } from '@/components/EditShipmentModal';
import { usePaginatedData } from '@/hooks/usePaginatedData';
import { Pagination } from '@/components/Pagination';

export default function ShipmentsPage() {
  const { currentOrganization } = useOrganization();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

  // Use paginated data hook
  const {
    data: shipments,
    isLoading: shipmentsLoading,
    error: shipmentsError,
    page,
    hasMore,
    nextPage,
    prevPage,
    invalidate,
    pageSize,
  } = usePaginatedData<Shipment>({
    collectionName: 'shipments',
    organizationId: currentOrganization?.id,
    pageSize: 50,
    orderByField: 'shipDate',
    orderDirection: 'desc',
    queryKey: ['shipments', currentOrganization?.id || ''],
  });

  const handleAdd = async (shipment: Partial<Shipment>) => {
    await addDocument('shipments', shipment);
    invalidate();
  };

  const handleEdit = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (id: string, shipment: Partial<Shipment>) => {
    await updateDocument('shipments', id, shipment);
    invalidate();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this shipment?')) {
      await deleteDocument('shipments', id);
      invalidate();
    }
  };

  const columns = [
    { header: 'Tracking Number', accessor: 'trackingNumber' as keyof Shipment },
    { header: 'Order ID', accessor: 'orderId' as keyof Shipment },
    { header: 'Carrier', accessor: 'carrier' as keyof Shipment },
    { 
      header: 'Status', 
      accessor: ((shipment: Shipment) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(shipment.status)}`}>
          {shipment.status}
        </span>
      )) as any 
    },
    { header: 'Origin', accessor: 'origin' as keyof Shipment },
    { header: 'Destination', accessor: 'destination' as keyof Shipment },
    { 
      header: 'Ship Date', 
      accessor: ((shipment: Shipment) => formatDate(shipment.shipDate)) as any 
    },
    {
      header: 'Actions',
      accessor: ((shipment: Shipment) => (
        <div className="flex items-center space-x-1 sm:space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(shipment)}
            className="hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 p-1 sm:p-2"
          >
            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(shipment.id!)}
            className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 p-1 sm:p-2"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
        </div>
      )) as any
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Shipments</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-500 dark:text-gray-400 mt-1">Track shipping status and deliveries</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center justify-center space-x-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          <span>Add Shipment</span>
        </Button>
      </div>

      {shipmentsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Loading shipments...</div>
        </div>
      ) : shipmentsError ? (
        <div className="flex flex-col items-center justify-center py-8 sm:py-12 space-y-3 sm:space-y-4 px-3 sm:px-0">
          <div className="text-red-600 dark:text-red-400 text-center">
            <p className="font-semibold text-base sm:text-lg">⚠️ Permission Denied</p>
            <p className="text-xs sm:text-sm mt-2">Firestore security rules need to be deployed.</p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 sm:p-4 max-w-2xl w-full">
            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mb-2"><strong>Quick Fix:</strong></p>
            <ol className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
              <li>Go to <a href="https://console.firebase.google.com/project/huggies-9f6e1/firestore/rules" target="_blank" className="text-blue-600 underline break-all">Firebase Console</a></li>
              <li>Deploy the security rules (see URGENT_FIX_LOADING_ISSUE.md)</li>
              <li>Refresh this page</li>
            </ol>
          </div>
          <Button onClick={() => invalidate()} variant="outline" className="w-full sm:w-auto">
            Try Again
          </Button>
        </div>
      ) : (
        <>
          <DataTable data={shipments} columns={columns} />
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

      <AddShipmentModal 
        open={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={handleAdd}
      />

      <EditShipmentModal 
        open={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        onUpdate={handleUpdate}
        shipment={selectedShipment}
      />
    </div>
  );
}
