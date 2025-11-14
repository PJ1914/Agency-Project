'use client';

import { useState, useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { InventoryItem } from '@/types/inventory.d';
import { ReorderSuggestion } from '@/types/supplier.d';
import { DataTable } from '@/components/Table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, AlertCircle, Edit, Trash2, History, ShoppingCart, Bell, TrendingDown, QrCode, Camera } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { addDocument, updateDocument, deleteDocument } from '@/lib/firestore';
import { AddInventoryModal } from '@/components/AddInventoryModal';
import { EditInventoryModal } from '@/components/EditInventoryModal';
import { InventoryHistoryModal } from '@/components/InventoryHistoryModal';
import { ReorderSuggestionsModal } from '@/components/ReorderSuggestionsModal';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { QRCodeGenerator } from '@/components/QRCodeGenerator';
import { checkInventoryLevels } from '@/lib/notifications';
import { updateInventoryWithHistory } from '@/lib/inventoryManager';
import { getReorderSuggestions, checkReorderRequirements } from '@/lib/inventoryEnhancements';
import { usePaginatedData } from '@/hooks/usePaginatedData';
import { Pagination } from '@/components/Pagination';

export default function InventoryPage() {
  const { currentOrganization } = useOrganization();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isQRGeneratorOpen, setIsQRGeneratorOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [reorderSuggestions, setReorderSuggestions] = useState<ReorderSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Use paginated data hook
  const {
    data: inventory,
    isLoading: inventoryLoading,
    error: inventoryError,
    page,
    hasMore,
    nextPage,
    prevPage,
    invalidate,
    pageSize,
  } = usePaginatedData<InventoryItem>({
    collectionName: 'inventory',
    organizationId: currentOrganization?.id,
    pageSize: 50,
    orderByField: 'createdAt',
    orderDirection: 'desc',
    queryKey: ['inventory', currentOrganization?.id || ''],
  });

  // Check inventory levels and reorder requirements on load
  useEffect(() => {
    if (inventory.length > 0 && currentOrganization?.id) {
      checkInventoryLevels();
      checkReorderRequirements(currentOrganization.id);
    }
  }, [inventory, currentOrganization?.id]);

  // Load reorder suggestions
  const loadReorderSuggestions = async () => {
    if (!currentOrganization?.id) return;
    
    setLoadingSuggestions(true);
    try {
      const suggestions = await getReorderSuggestions(currentOrganization.id);
      setReorderSuggestions(suggestions);
      setIsReorderModalOpen(true);
    } catch (error) {
      console.error('Error loading reorder suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Calculate stats
  const lowStockCount = inventory.filter(item => 
    item.lowStockThreshold && item.quantity <= item.lowStockThreshold
  ).length;

  const outOfStockCount = inventory.filter(item => item.quantity === 0).length;

  const totalValue = inventory.reduce((sum, item) => sum + (item.price || 0), 0);

  const handleAdd = async (item: Partial<InventoryItem>) => {
    if (!currentOrganization?.id) {
      alert('No organization selected');
      return;
    }
    await addDocument('inventory', {
      ...item,
      organizationId: currentOrganization.id,
    });
    invalidate();
    // Check inventory levels and reorder requirements after adding
    setTimeout(() => {
      checkInventoryLevels();
      if (currentOrganization?.id) {
        checkReorderRequirements(currentOrganization.id);
      }
    }, 1000);
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
    
    invalidate();
    // Check inventory levels and reorder requirements after updating
    setTimeout(() => {
      checkInventoryLevels();
      if (currentOrganization?.id) {
        checkReorderRequirements(currentOrganization.id);
      }
    }, 1000);
  };

  const handleShowHistory = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsHistoryModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      await deleteDocument('inventory', id);
      invalidate();
    }
  };

  const columns = [
    { header: 'Product Name', accessor: 'productName' as keyof InventoryItem },
    { header: 'SKU', accessor: 'sku' as keyof InventoryItem },
    { 
      header: 'Quantity', 
      accessor: ((item: InventoryItem) => (
        <div className="flex items-center space-x-1 sm:space-x-2">
          <span>{item.quantity}</span>
          {item.lowStockThreshold && item.quantity <= item.lowStockThreshold && (
            <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />
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
        <div className="flex items-center space-x-1 sm:space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleShowHistory(item)}
            className="hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-900/20 p-1 sm:p-2"
            title="View History"
          >
            <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedItem(item);
              setIsQRGeneratorOpen(true);
            }}
            className="hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20 p-1 sm:p-2"
            title="Generate QR Code"
          >
            <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(item)}
            className="hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 p-1 sm:p-2"
          >
            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(item.id!)}
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
      {/* Header with Smart Alerts Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Inventory</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-500 dark:text-gray-400 mt-1">Manage stock levels and reordering</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setIsScannerOpen(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            Quick Scan
          </Button>
          <Button 
            onClick={loadReorderSuggestions}
            disabled={loadingSuggestions}
            variant="outline"
            className="flex items-center gap-2"
          >
            {loadingSuggestions ? (
              <>Loading...</>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                Smart Alerts
                {lowStockCount > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-full text-xs font-semibold">
                    {lowStockCount}
                  </span>
                )}
              </>
            )}
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center justify-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </Button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      {!inventoryLoading && !inventoryError && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Inventory Value</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(totalValue)}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {inventory.length} items in stock
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Low Stock Items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {lowStockCount}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Below threshold
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Out of Stock</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {outOfStockCount}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Requires immediate attention
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {inventoryLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Loading inventory...</div>
        </div>
      ) : inventoryError ? (
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
          <DataTable data={inventory} columns={columns} />
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

      <ReorderSuggestionsModal
        open={isReorderModalOpen}
        onClose={() => setIsReorderModalOpen(false)}
        suggestions={reorderSuggestions}
        onCreatePO={(suggestion) => {
          // Future: Navigate to PO creation page
          alert(`Creating Purchase Order for ${suggestion.productName}\nQuantity: ${suggestion.suggestedOrderQuantity} units\nEst. Cost: ${formatCurrency(suggestion.estimatedCost)}`);
          setIsReorderModalOpen(false);
        }}
      />

      <BarcodeScanner
        open={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        mode="quick-check"
        onProductScanned={(product) => {
          setSelectedItem(product);
        }}
      />

      <QRCodeGenerator
        open={isQRGeneratorOpen}
        onClose={() => setIsQRGeneratorOpen(false)}
        product={selectedItem}
      />
    </div>
  );
}
