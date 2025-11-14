'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReorderSuggestion } from '@/types/supplier.d';
import { 
  AlertTriangle, 
  TrendingUp, 
  Package, 
  Calendar,
  DollarSign,
  CheckCircle2
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getUrgencyColor, formatLeadTime } from '@/lib/inventoryEnhancements';

interface ReorderSuggestionsModalProps {
  open: boolean;
  onClose: () => void;
  suggestions: ReorderSuggestion[];
  onCreatePO?: (suggestion: ReorderSuggestion) => void;
}

export function ReorderSuggestionsModal({ 
  open, 
  onClose, 
  suggestions,
  onCreatePO 
}: ReorderSuggestionsModalProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      // Auto-select critical and high urgency items
      const autoSelect = suggestions
        .filter(s => s.urgency === 'critical' || s.urgency === 'high')
        .map(s => s.inventoryId);
      setSelectedItems(new Set(autoSelect));
    }
  }, [open, suggestions]);

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const totalEstimatedCost = suggestions
    .filter(s => selectedItems.has(s.inventoryId))
    .reduce((sum, s) => sum + s.estimatedCost, 0);

  const getUrgencyIcon = (urgency: string) => {
    if (urgency === 'critical') return <AlertTriangle className="w-5 h-5 text-red-500" />;
    if (urgency === 'high') return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    return <TrendingUp className="w-5 h-5 text-yellow-500" />;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Package className="w-6 h-6" />
            Reorder Suggestions ({suggestions.length})
          </DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Smart recommendations based on stock levels, usage patterns, and lead times
          </p>
        </DialogHeader>

        {suggestions.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              All Stock Levels are Healthy! ✅
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              No reordering required at this time.
            </p>
          </div>
        ) : (
          <>
            {/* Summary Card */}
            <Card className="bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Selected Items Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Items Selected</p>
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {selectedItems.size}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Units</p>
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {suggestions
                        .filter(s => selectedItems.has(s.inventoryId))
                        .reduce((sum, s) => sum + s.suggestedOrderQuantity, 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Est. Cost</p>
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(totalEstimatedCost)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Suggestions List */}
            <div className="space-y-3 mt-4">
              {suggestions.map((suggestion) => (
                <Card 
                  key={suggestion.inventoryId}
                  className={`cursor-pointer transition-all ${
                    selectedItems.has(suggestion.inventoryId)
                      ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => toggleSelection(suggestion.inventoryId)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      {/* Left side - Product info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(suggestion.inventoryId)}
                            onChange={() => toggleSelection(suggestion.inventoryId)}
                            className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div>
                            <h3 className="font-semibold text-lg">{suggestion.productName}</h3>
                            {suggestion.supplierName && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Supplier: {suggestion.supplierName}
                              </p>
                            )}
                          </div>
                          {getUrgencyIcon(suggestion.urgency)}
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Current Stock</p>
                            <p className={`font-semibold ${
                              suggestion.currentStock === 0 
                                ? 'text-red-600 dark:text-red-400' 
                                : 'text-gray-900 dark:text-gray-100'
                            }`}>
                              {suggestion.currentStock} units
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Threshold</p>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {suggestion.lowStockThreshold} units
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Reorder Point</p>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {suggestion.reorderPoint} units
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Suggested Qty</p>
                            <p className="font-semibold text-indigo-600 dark:text-indigo-400">
                              {suggestion.suggestedOrderQuantity} units
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Right side - Urgency and cost */}
                      <div className="text-right ml-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-2 ${getUrgencyColor(suggestion.urgency)}`}>
                          {suggestion.urgency.toUpperCase()}
                        </span>
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {formatCurrency(suggestion.estimatedCost)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Est. Cost</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-4 border-t dark:border-gray-700">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Export as CSV
                    const csv = [
                      ['Product', 'Current Stock', 'Suggested Quantity', 'Est. Cost', 'Urgency', 'Supplier'],
                      ...suggestions
                        .filter(s => selectedItems.has(s.inventoryId))
                        .map(s => [
                          s.productName,
                          s.currentStock,
                          s.suggestedOrderQuantity,
                          s.estimatedCost,
                          s.urgency,
                          s.supplierName || 'N/A'
                        ])
                    ].map(row => row.join(',')).join('\n');
                    
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `reorder-suggestions-${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                  }}
                  disabled={selectedItems.size === 0}
                >
                  Export CSV
                </Button>
                <Button
                  onClick={() => {
                    if (onCreatePO && selectedItems.size > 0) {
                      // For now, create PO for first selected item
                      // In future, group by supplier
                      const firstSelected = suggestions.find(s => selectedItems.has(s.inventoryId));
                      if (firstSelected) {
                        onCreatePO(firstSelected);
                      }
                    }
                  }}
                  disabled={selectedItems.size === 0}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Create Purchase Order ({selectedItems.size})
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
