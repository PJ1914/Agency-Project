'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { InventoryItem } from '@/types/inventory.d';
import { ReorderSuggestion } from '@/types/supplier.d';
import { DataTable } from '@/components/Table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, AlertCircle, Edit, Trash2, History, ShoppingCart, Bell, TrendingDown, QrCode, Camera, Upload, Search, Filter, X, Download, SortAsc, SortDesc, Package, DollarSign, TrendingUp, Layers, ChevronDown, Grid3x3, List } from 'lucide-react';
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
import { CustomAlert } from '@/components/CustomAlert';
import { useCustomAlert } from '@/hooks/useCustomAlert';

export default function InventoryPage() {
  const { currentOrganization } = useOrganization();
  const { alertState, showAlert, showConfirm, closeAlert } = useCustomAlert();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isQRGeneratorOpen, setIsQRGeneratorOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [reorderSuggestions, setReorderSuggestions] = useState<ReorderSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Filter and Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [selectedSize, setSelectedSize] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'good'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'price' | 'recent'>('recent');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [showFilters, setShowFilters] = useState(false);

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
    pageSize: 1000, // Increased to load more items for filtering
    orderByField: 'createdAt',
    orderDirection: 'desc',
    queryKey: ['inventory', currentOrganization?.id || ''],
  });

  // Extract unique categories from inventory
  const categories = useMemo(() => {
    const cats = new Set(inventory.map(item => item.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [inventory]);

  // Extract unique subcategories based on selected category
  const subcategories = useMemo(() => {
    let items = inventory;
    
    // If a category is selected, filter items by that category
    if (selectedCategory !== 'all') {
      items = inventory.filter(item => item.category === selectedCategory);
    }
    
    // Extract unique subcategories from filtered items
    const subs = new Set(
      items
        .map(item => item.subcategory)
        .filter(Boolean) // Remove null/undefined
    );
    
    const result = Array.from(subs).sort();
    console.log('Subcategories detected:', result, 'from', items.length, 'items');
    return result;
  }, [inventory, selectedCategory]);

  // Extract unique sizes based on category and subcategory filters
  const sizes = useMemo(() => {
    let items = inventory;
    
    // Filter by category if selected
    if (selectedCategory !== 'all') {
      items = items.filter(item => item.category === selectedCategory);
    }
    
    // Filter by subcategory if selected
    if (selectedSubcategory !== 'all') {
      items = items.filter(item => item.subcategory === selectedSubcategory);
    }
    
    const sizeSet = new Set(items.map(item => item.size).filter(Boolean));
    return Array.from(sizeSet).sort((a, b) => {
      // Custom sort for sizes (XL, L, M, S, etc.)
      const sizeOrder: Record<string, number> = { 'XXL': 1, 'XL': 2, 'L': 3, 'M': 4, 'S': 5, 'XS': 6, 'NB': 7 };
      const aVal = a ? (sizeOrder[a] || 999) : 999;
      const bVal = b ? (sizeOrder[b] || 999) : 999;
      return aVal - bVal;
    });
  }, [inventory, selectedCategory, selectedSubcategory]);

  // Calculate subcategory counts based on current category filter
  const subcategoryCounts = useMemo(() => {
    let items = inventory;
    
    // If a category is selected, only count subcategories within that category
    if (selectedCategory !== 'all') {
      items = inventory.filter(item => item.category === selectedCategory);
    }
    
    return items.reduce((acc, item) => {
      const sub = item.subcategory || 'Uncategorized';
      acc[sub] = (acc[sub] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [inventory, selectedCategory]);

  // Calculate category counts
  const categoryCounts = useMemo(() => {
    return inventory.reduce((acc, item) => {
      const cat = item.category || 'Uncategorized';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [inventory]);

  // Calculate size counts based on current filters
  const sizeCounts = useMemo(() => {
    let items = inventory;
    
    if (selectedCategory !== 'all') {
      items = items.filter(item => item.category === selectedCategory);
    }
    
    if (selectedSubcategory !== 'all') {
      items = items.filter(item => item.subcategory === selectedSubcategory);
    }
    
    return items.reduce((acc, item) => {
      const size = item.size || 'Unknown';
      acc[size] = (acc[size] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [inventory, selectedCategory, selectedSubcategory]);

  // Auto-load all inventory items on mount
  useEffect(() => {
    // If there are more items to load and we're not currently loading, load them
    if (hasMore && !inventoryLoading && inventory.length < 1000) {
      console.log('Auto-loading more inventory items...', inventory.length, 'loaded so far');
      nextPage();
    }
  }, [hasMore, inventoryLoading, inventory.length]);

  // Filter and sort inventory
  const filteredAndSortedInventory = useMemo(() => {
    console.log('🔍 Filtering inventory:', {
      totalItems: inventory.length,
      selectedCategory,
      selectedSubcategory,
      selectedSize,
      stockFilter,
      searchQuery
    });
    
    let filtered = [...inventory];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.productName?.toLowerCase().includes(query) ||
        item.sku?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query) ||
        item.subcategory?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
      console.log('  After search filter:', filtered.length);
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
      console.log('  After category filter:', filtered.length);
    }

    // Subcategory filter
    if (selectedSubcategory !== 'all') {
      filtered = filtered.filter(item => item.subcategory === selectedSubcategory);
      console.log('  After subcategory filter:', filtered.length);
    }

    // Size filter
    if (selectedSize !== 'all') {
      filtered = filtered.filter(item => item.size === selectedSize);
      console.log('  After size filter:', filtered.length);
    }

    // Stock level filter
    if (stockFilter !== 'all') {
      filtered = filtered.filter(item => {
        const threshold = item.lowStockThreshold || 10;
        if (stockFilter === 'out') return item.quantity === 0;
        if (stockFilter === 'low') return item.quantity > 0 && item.quantity <= threshold;
        if (stockFilter === 'good') return item.quantity > threshold;
        return true;
      });
      console.log('  After stock filter:', filtered.length);
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = (a.productName || '').localeCompare(b.productName || '');
          break;
        case 'quantity':
          comparison = a.quantity - b.quantity;
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'recent':
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          comparison = dateB - dateA;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    console.log('✅ Final filtered results:', filtered.length);
    return filtered;
  }, [inventory, searchQuery, selectedCategory, selectedSubcategory, selectedSize, stockFilter, sortBy, sortOrder]);

  // Reset subcategory when category changes (only if invalid)
  useEffect(() => {
    // Only reset if the current subcategory is not valid for the new category
    if (selectedCategory !== 'all' && selectedSubcategory !== 'all') {
      const validSubcategories = subcategories;
      if (!validSubcategories.includes(selectedSubcategory)) {
        console.log('Resetting invalid subcategory:', selectedSubcategory);
        setSelectedSubcategory('all');
      }
    }
  }, [selectedCategory, subcategories]);

  // Reset size when filters change (only if invalid)
  useEffect(() => {
    if (selectedSize !== 'all') {
      const validSizes = sizes;
      if (!validSizes.includes(selectedSize)) {
        console.log('Resetting invalid size:', selectedSize);
        setSelectedSize('all');
      }
    }
  }, [selectedCategory, selectedSubcategory, sizes]);

  // Enhanced statistics
  const stats = useMemo(() => {
    const total = inventory.length;
    const totalValue = inventory.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const lowStock = inventory.filter(item => {
      const threshold = item.lowStockThreshold || 10;
      return item.quantity > 0 && item.quantity <= threshold;
    }).length;
    const outOfStock = inventory.filter(item => item.quantity === 0).length;
    const categoryCounts = inventory.reduce((acc, item) => {
      const cat = item.category || 'Uncategorized';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const subcategoryCounts = inventory.reduce((acc, item) => {
      const sub = item.subcategory || 'Uncategorized';
      acc[sub] = (acc[sub] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const avgValue = total > 0 ? totalValue / total : 0;
    const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);

    return {
      total,
      totalValue,
      lowStock,
      outOfStock,
      categoryCounts,
      subcategoryCounts,
      avgValue,
      totalItems,
      filteredCount: filteredAndSortedInventory.length
    };
  }, [inventory, filteredAndSortedInventory]);

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

  const handleAdd = async (item: Partial<InventoryItem>) => {
    if (!currentOrganization?.id) {
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'No organization selected',
      });
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
    showConfirm({
      type: 'warning',
      title: 'Delete Item',
      message: 'Are you sure you want to delete this item?',
      confirmText: 'Delete',
      onConfirm: async () => {
        await deleteDocument('inventory', id);
        invalidate();
      },
    });
  };

  const handleDeleteAll = async () => {
    showConfirm({
      type: 'warning',
      title: 'Delete All Inventory',
      message: `Are you sure you want to delete ALL ${inventory.length} items? This action cannot be undone!`,
      confirmText: 'Delete All',
      onConfirm: async () => {
        try {
          let deletedCount = 0;
          for (const item of inventory) {
            await deleteDocument('inventory', item.id!);
            deletedCount++;
          }
          invalidate();
          showAlert({
            type: 'success',
            title: 'Success',
            message: `Successfully deleted ${deletedCount} inventory items.`,
          });
        } catch (error) {
          console.error('Error deleting all inventory:', error);
          showAlert({
            type: 'error',
            title: 'Error',
            message: 'Failed to delete all inventory items. Please try again.',
          });
        }
      },
    });
  };

  // Export to CSV
  const handleExportCSV = () => {
    const csvData = filteredAndSortedInventory.map(item => ({
      'Product Name': item.productName,
      'SKU': item.sku,
      'Category': item.category || '',
      'Quantity': item.quantity,
      'Price': item.price,
      'Unit Price': item.unitPrice,
      'Low Stock Threshold': item.lowStockThreshold || '',
      'Supplier': item.supplierName || '',
      'Description': item.description || ''
    }));

    const headers = Object.keys(csvData[0] || {});
    const csv = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
    ].join('\\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    showAlert({
      type: 'success',
      title: 'Export Complete',
      message: `Exported ${filteredAndSortedInventory.length} items to CSV`,
    });
  };

  const handleBulkImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentOrganization?.id) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      let successCount = 0;
      let errorCount = 0;
      const detectedSubcategories = new Set<string>();
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < 3) continue; // Skip invalid rows
        
        try {
          const productName = values[0] || 'Uncategorized'; // This is the actual product name (e.g., "Huggies Comfy Pants")
          const packType = values[1] || 'Standard';
          const size = values[2] || '';
          const quantity = parseInt(values[3]) || 0;
          const price = parseFloat(values[4]) || 0;
          
          // Use product name as subcategory (e.g., "Huggies Comfy Pants", "Huggies Dry Tape")
          const subcategory = productName;
          
          // Determine category from product name
          // Extract the brand/main category (everything before the last word or common pattern)
          let category = 'General';
          if (productName.toLowerCase().includes('huggies')) {
            category = 'Huggies';
          } else if (productName.toLowerCase().includes('pampers')) {
            category = 'Pampers';
          } else {
            // Generic category extraction - use first word or full name
            const words = productName.split(' ');
            category = words.length > 1 ? words[0] : productName;
          }
          
          // Generate SKU with category prefix and size
          const categoryPrefix = category.substring(0, 3).toUpperCase();
          const timestamp = Date.now();
          const sku = `${categoryPrefix}-${size.replace(/[^a-zA-Z0-9]/g, '')}-${timestamp}-${i}`;
          
          // Create full display name with pack type and size
          const fullProductName = `${productName} - ${packType} - ${size}`;
          
          // Create detailed description
          const description = `Pack Type: ${packType}, Size: ${size}`;
          
          // Track detected subcategories
          detectedSubcategories.add(subcategory);
          
          const newItem: Partial<InventoryItem> = {
            productName: fullProductName,
            sku,
            quantity,
            price,
            unitPrice: price,
            category,
            subcategory,
            size,
            description,
            lowStockThreshold: Math.floor(quantity * 0.2) || 5, // 20% of initial quantity or minimum 5
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          await addDocument('inventory', {
            ...newItem,
            organizationId: currentOrganization.id,
          });
          successCount++;
        } catch (error) {
          console.error(`Error importing row ${i}:`, error);
          errorCount++;
        }
      }
      
      invalidate();
      
      const subcatList = Array.from(detectedSubcategories).sort().join(', ');
      showAlert({
        type: successCount > 0 ? 'success' : 'error',
        title: 'Import Complete',
        message: `Successfully imported ${successCount} items with ${detectedSubcategories.size} subcategories: ${subcatList}. ${errorCount > 0 ? `${errorCount} items failed.` : ''}`,
      });
      
      // Reset file input
      if (event.target) event.target.value = '';
    } catch (error) {
      console.error('Error importing CSV:', error);
      showAlert({
        type: 'error',
        title: 'Import Failed',
        message: 'Failed to import inventory data. Please check the file format.',
      });
    } finally {
      setIsImporting(false);
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
      header: 'Subcategory', 
      accessor: ((item: InventoryItem) => (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
          {item.subcategory || '-'}
        </span>
      )) as any 
    },
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
    <>
      <CustomAlert {...alertState} onClose={closeAlert} />
      
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
                {stats.lowStock > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-full text-xs font-semibold">
                    {stats.lowStock}
                  </span>
                )}
              </>
            )}
          </Button>
          <Button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isImporting ? (
              <>Importing...</>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Import CSV
              </>
            )}
          </Button>
          <Button 
            onClick={handleDeleteAll}
            disabled={inventory.length === 0}
            variant="outline"
            className="flex items-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 border-red-300 dark:border-red-700"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Delete All</span>
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center justify-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </Button>
        </div>
      </div>
      
      {/* Hidden file input for CSV import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleBulkImport}
        className="hidden"
      />

      {/* Enhanced Stats Cards */}
      {!inventoryLoading && !inventoryError && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Total Value
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(stats.totalValue)}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {stats.totalItems} items • Avg: {formatCurrency(stats.avgValue)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Total Products
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.total}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {Object.keys(stats.categoryCounts).length} categories
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Low Stock
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {stats.lowStock}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Need attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Out of Stock
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.outOfStock}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Require restock
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modern Search and Filters */}
      <Card className="border-2">
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-4">
            {/* Top Row: Search + Actions */}
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search products, SKU, category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 text-base"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full p-1 transition"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  variant="outline"
                  className="flex items-center gap-2 h-11"
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">Filters</span>
                  {(selectedCategory !== 'all' || selectedSubcategory !== 'all' || selectedSize !== 'all' || stockFilter !== 'all') && (
                    <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-xs font-semibold">
                      {[selectedCategory !== 'all', selectedSubcategory !== 'all', selectedSize !== 'all', stockFilter !== 'all'].filter(Boolean).length}
                    </span>
                  )}
                </Button>
                <Button
                  onClick={handleExportCSV}
                  variant="outline"
                  className="flex items-center gap-2 h-11"
                  disabled={filteredAndSortedInventory.length === 0}
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </div>
            </div>

            {/* Expandable Filters Section */}
            {showFilters && (
              <div className="space-y-4 pt-4 border-t animate-in slide-in-from-top-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Category Dropdown */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      Category
                    </label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories ({inventory.length})</SelectItem>
                        {categories.map(cat => cat && (
                          <SelectItem key={cat} value={cat}>
                            {cat} ({categoryCounts[cat] || 0})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subcategory Dropdown */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Grid3x3 className="w-4 h-4" />
                      Subcategory
                      {subcategories.length > 0 && (
                        <span className="text-xs text-gray-500">({subcategories.length} types)</span>
                      )}
                    </label>
                    <Select 
                      value={selectedSubcategory} 
                      onValueChange={setSelectedSubcategory}
                      disabled={subcategories.length === 0}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={subcategories.length === 0 ? "No subcategories" : "All Subcategories"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subcategories</SelectItem>
                        {subcategories.map(sub => sub && (
                          <SelectItem key={sub} value={sub}>
                            {sub} ({subcategoryCounts[sub] || 0})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Size Dropdown */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Size
                      {sizes.length > 0 && (
                        <span className="text-xs text-gray-500">({sizes.length} sizes)</span>
                      )}
                    </label>
                    <Select 
                      value={selectedSize} 
                      onValueChange={setSelectedSize}
                      disabled={sizes.length === 0}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={sizes.length === 0 ? "No sizes" : "All Sizes"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sizes</SelectItem>
                        {sizes.map(size => size && (
                          <SelectItem key={size} value={size}>
                            {size} ({sizeCounts[size] || 0})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Stock Level Dropdown */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Stock Level
                    </label>
                    <Select value={stockFilter} onValueChange={(val) => setStockFilter(val as any)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="All Stock Levels" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Stock Levels</SelectItem>
                        <SelectItem value="good">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            In Stock
                          </span>
                        </SelectItem>
                        <SelectItem value="low">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                            Low Stock ({stats.lowStock})
                          </span>
                        </SelectItem>
                        <SelectItem value="out">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            Out of Stock ({stats.outOfStock})
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort Dropdown */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                      Sort By
                    </label>
                    <div className="flex gap-2">
                      <Select value={sortBy} onValueChange={(val) => setSortBy(val as any)}>
                        <SelectTrigger className="h-11 flex-1">
                          <SelectValue placeholder="Sort by..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recent">Recently Added</SelectItem>
                          <SelectItem value="name">Name (A-Z)</SelectItem>
                          <SelectItem value="quantity">Quantity</SelectItem>
                          <SelectItem value="price">Price</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="h-11 w-11 flex-shrink-0"
                        title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                      >
                        {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Clear Filters */}
                {(searchQuery || selectedCategory !== 'all' || selectedSubcategory !== 'all' || selectedSize !== 'all' || stockFilter !== 'all') && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Showing <span className="font-semibold text-gray-900 dark:text-white">{stats.filteredCount}</span> of <span className="font-semibold text-gray-900 dark:text-white">{stats.total}</span> products
                    </span>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('all');
                        setSelectedSubcategory('all');
                        setSelectedSize('all');
                        setStockFilter('all');
                      }}
                      className="h-9 text-sm"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Clear all filters
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Quick Filters - Always Visible */}
            {!showFilters && (
              <div className="flex items-center gap-2 flex-wrap">
                {selectedCategory !== 'all' && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-sm">
                    <Layers className="w-3.5 h-3.5" />
                    {selectedCategory}
                    <button onClick={() => setSelectedCategory('all')} className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {selectedSubcategory !== 'all' && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-full text-sm">
                    <Grid3x3 className="w-3.5 h-3.5" />
                    {selectedSubcategory}
                    <button onClick={() => setSelectedSubcategory('all')} className="hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full p-0.5">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {selectedSize !== 'all' && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-full text-sm">
                    <Package className="w-3.5 h-3.5" />
                    Size: {selectedSize}
                    <button onClick={() => setSelectedSize('all')} className="hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-full p-0.5">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {stockFilter !== 'all' && (
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${
                    stockFilter === 'low' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                    stockFilter === 'out' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                    <Package className="w-3.5 h-3.5" />
                    {stockFilter === 'low' ? 'Low Stock' : stockFilter === 'out' ? 'Out of Stock' : 'In Stock'}
                    <button onClick={() => setStockFilter('all')} className="hover:opacity-70 rounded-full p-0.5">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
          <DataTable data={filteredAndSortedInventory} columns={columns} />
          
          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center py-6">
              <Button
                onClick={nextPage}
                variant="outline"
                className="flex items-center gap-2"
                disabled={inventoryLoading}
              >
                {inventoryLoading ? (
                  <>Loading more items...</>
                ) : (
                  <>
                    <Package className="w-4 h-4" />
                    Load More Items ({inventory.length} loaded)
                  </>
                )}
              </Button>
            </div>
          )}
          
          {!hasMore && inventory.length > 0 && (
            <div className="text-center py-4 text-sm text-gray-500">
              All {inventory.length} items loaded
            </div>
          )}
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
          showAlert({
            type: 'info',
            title: `Purchase Order for ${suggestion.productName}`,
            message: `Quantity: ${suggestion.suggestedOrderQuantity} units\nEst. Cost: ${formatCurrency(suggestion.estimatedCost)}`,
          });
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
    </>
  );
}
