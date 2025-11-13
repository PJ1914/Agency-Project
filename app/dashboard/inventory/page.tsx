'use client';

import { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { InventoryItem } from '@/types/inventory.d';
import { DataTable } from '@/components/Table';
import { Button } from '@/components/ui/button';
import { Plus, AlertCircle, Edit, Trash2, History } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { addDocument, updateDocument, deleteDocument } from '@/lib/firestore';
import { AddInventoryModal } from '@/components/AddInventoryModal';
import { EditInventoryModal } from '@/components/EditInventoryModal';
import { InventoryHistoryModal } from '@/components/InventoryHistoryModal';
import { checkInventoryLevels } from '@/lib/notifications';
import { updateInventoryWithHistory } from '@/lib/inventoryManager';

export default function InventoryPage() {
  const { inventory, inventoryLoading, inventoryError, refetchInventory } = useData();
  const { currentOrganization } = useOrganization();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Check inventory levels on load and when inventory changes
  useEffect(() => {
    if (inventory.length > 0) {
      checkInventoryLevels();
    }
  }, [inventory]);

  const handleAdd = async (item: Partial<InventoryItem>) => {
    if (!currentOrganization?.id) {
      alert('No organization selected');
      return;
    }
    await addDocument('inventory', {
      ...item,
      organizationId: currentOrganization.id,
    });
    refetchInventory();
    // Check inventory levels after adding
    setTimeout(() => checkInventoryLevels(), 1000);
  };

  const handleEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (id: string, item: Partial<InventoryItem>) => {
    // If quantity changed, use updateInventoryWithHistory
    const originalItem = inventory.find(i => i.id === id);
    if (originalItem && item.quantity !== undefined && item.quantity !== originalItem.quantity) {
      const reason = item.quantity > originalItem.quantity 
        ? `Restocked: Added ${item.quantity - originalItem.quantity} units`
        : `Adjustment: Removed ${originalItem.quantity - item.quantity} units`;
      
      await updateInventoryWithHistory(id, item.quantity, reason);
      
      // Update other fields separately
      const { quantity, ...otherFields } = item;
      if (Object.keys(otherFields).length > 0) {
        await updateDocument('inventory', id, otherFields);
      }
    } else {
      await updateDocument('inventory', id, item);
    }
    
    refetchInventory();
    // Check inventory levels after updating
    setTimeout(() => checkInventoryLevels(), 1000);
  };

  const handleShowHistory = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsHistoryModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      await deleteDocument('inventory', id);
      refetchInventory();
    }
  };

  const columns = [
    { header: 'Product Name', accessor: 'productName' as keyof InventoryItem },
    { header: 'SKU', accessor: 'sku' as keyof InventoryItem },
    { 
      header: 'Quantity', 
      accessor: ((item: InventoryItem) => (
        <div className="flex items-center space-x-2">
          <span>{item.quantity}</span>
          {item.lowStockThreshold && item.quantity <= item.lowStockThreshold && (
            <AlertCircle className="w-4 h-4 text-orange-500" />
          )}
        </div>
      )) as any 
    },
    { 
      header: 'Price', 
      accessor: ((item: InventoryItem) => formatCurrency(item.price)) as any 
    },
    { header: 'Category', accessor: 'category' as keyof InventoryItem },
    {
      header: 'Actions',
      accessor: ((item: InventoryItem) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleShowHistory(item)}
            className="hover:bg-purple-50 hover:text-purple-600"
            title="View History"
          >
            <History className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(item)}
            className="hover:bg-blue-50 hover:text-blue-600"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(item.id!)}
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Inventory</h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">Manage stock levels and pricing</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center justify-center space-x-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          <span>Add Item</span>
        </Button>
      </div>

      {inventoryLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 dark:text-gray-400">Loading inventory...</div>
        </div>
      ) : inventoryError ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="text-red-600 dark:text-red-400 text-center">
            <p className="font-semibold text-lg">⚠️ Permission Denied</p>
            <p className="text-sm mt-2">Firestore security rules need to be deployed.</p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 max-w-2xl">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2"><strong>Quick Fix:</strong></p>
            <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
              <li>Go to <a href="https://console.firebase.google.com/project/huggies-9f6e1/firestore/rules" target="_blank" className="text-blue-600 underline">Firebase Console</a></li>
              <li>Deploy the security rules (see URGENT_FIX_LOADING_ISSUE.md)</li>
              <li>Refresh this page</li>
            </ol>
          </div>
          <Button onClick={() => refetchInventory()} variant="outline">
            Try Again
          </Button>
        </div>
      ) : (
        <DataTable data={inventory} columns={columns} />
      )}

      <AddInventoryModal 
        open={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={handleAdd}
      />

      <EditInventoryModal 
        open={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        onUpdate={handleUpdate}
        item={selectedItem}
      />

      <InventoryHistoryModal 
        open={isHistoryModalOpen} 
        onClose={() => setIsHistoryModalOpen(false)} 
        item={selectedItem}
      />
    </div>
  );
}
