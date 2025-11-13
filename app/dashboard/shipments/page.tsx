'use client';

import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Shipment } from '@/types/shipment.d';
import { DataTable } from '@/components/Table';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { formatDate, getStatusColor } from '@/lib/utils';
import { addDocument, updateDocument, deleteDocument } from '@/lib/firestore';
import { AddShipmentModal } from '@/components/AddShipmentModal';
import { EditShipmentModal } from '@/components/EditShipmentModal';

export default function ShipmentsPage() {
  const { shipments, shipmentsLoading, shipmentsError, refetchShipments } = useData();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

  const handleAdd = async (shipment: Partial<Shipment>) => {
    await addDocument('shipments', shipment);
    refetchShipments();
  };

  const handleEdit = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (id: string, shipment: Partial<Shipment>) => {
    await updateDocument('shipments', id, shipment);
    refetchShipments();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this shipment?')) {
      await deleteDocument('shipments', id);
      refetchShipments();
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
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(shipment)}
            className="hover:bg-blue-50 hover:text-blue-600"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(shipment.id!)}
            className="hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )) as any
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Shipments</h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">Track shipping status and deliveries</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center justify-center space-x-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          <span>Add Shipment</span>
        </Button>
      </div>

      {shipmentsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 dark:text-gray-400">Loading shipments...</div>
        </div>
      ) : shipmentsError ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="text-red-600 text-center">
            <p className="font-semibold text-lg">⚠️ Permission Denied</p>
            <p className="text-sm mt-2">Firestore security rules need to be deployed.</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-2xl">
            <p className="text-sm text-gray-700 mb-2"><strong>Quick Fix:</strong></p>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Go to <a href="https://console.firebase.google.com/project/huggies-9f6e1/firestore/rules" target="_blank" className="text-blue-600 underline">Firebase Console</a></li>
              <li>Deploy the security rules (see URGENT_FIX_LOADING_ISSUE.md)</li>
              <li>Refresh this page</li>
            </ol>
          </div>
          <Button onClick={() => refetchShipments()} variant="outline">
            Try Again
          </Button>
        </div>
      ) : (
        <DataTable data={shipments} columns={columns} />
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
