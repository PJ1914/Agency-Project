'use client';

import { useState, useEffect } from 'react';
import { InventoryItem, InventoryHistoryEntry } from '@/types/inventory.d';
import { formatDateTime } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, RefreshCw, Package } from 'lucide-react';

interface InventoryHistoryModalProps {
  open: boolean;
  onClose: () => void;
  item: InventoryItem | null;
}

export function InventoryHistoryModal({ open, onClose, item }: InventoryHistoryModalProps) {
  const [sortedHistory, setSortedHistory] = useState<InventoryHistoryEntry[]>([]);

  useEffect(() => {
    if (item && item.history) {
      // Sort history by date (newest first)
      const sorted = [...item.history].sort((a, b) => {
        const dateA = a.createdAt && typeof a.createdAt === 'object' && 'seconds' in a.createdAt 
          ? (a.createdAt as any).seconds * 1000 
          : new Date(a.createdAt).getTime();
        const dateB = b.createdAt && typeof b.createdAt === 'object' && 'seconds' in b.createdAt 
          ? (b.createdAt as any).seconds * 1000 
          : new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
      setSortedHistory(sorted);
    } else {
      setSortedHistory([]);
    }
  }, [item]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'restock':
        return <ArrowUp className="w-4 h-4 text-green-600" />;
      case 'sale':
        return <ArrowDown className="w-4 h-4 text-red-600" />;
      case 'adjustment':
        return <RefreshCw className="w-4 h-4 text-blue-600" />;
      case 'initial':
        return <Package className="w-4 h-4 text-gray-600" />;
      default:
        return <RefreshCw className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, any> = {
      restock: 'default',
      sale: 'destructive',
      adjustment: 'secondary',
      initial: 'outline',
    };
    return variants[type] || 'outline';
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'restock':
        return 'text-green-600 bg-green-50';
      case 'sale':
        return 'text-red-600 bg-red-50';
      case 'adjustment':
        return 'text-blue-600 bg-blue-50';
      case 'initial':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (!item) return null;

  const totalUpdates = sortedHistory.length;
  const totalRestocked = sortedHistory
    .filter(h => h.type === 'restock')
    .reduce((sum, h) => sum + h.quantityChange, 0);
  const totalSold = sortedHistory
    .filter(h => h.type === 'sale')
    .reduce((sum, h) => sum + Math.abs(h.quantityChange), 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Inventory History - {item.productName}
          </DialogTitle>
          <DialogDescription>
            SKU: {item.sku} | Current Stock: <span className="font-semibold text-blue-600">{item.quantity}</span> units
          </DialogDescription>
        </DialogHeader>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 py-4 border-y">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Updates</p>
            <p className="text-2xl font-bold text-gray-900">{totalUpdates}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Restocked</p>
            <p className="text-2xl font-bold text-green-600">+{totalRestocked}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Sold</p>
            <p className="text-2xl font-bold text-red-600">-{totalSold}</p>
          </div>
        </div>

        {/* History Timeline */}
        <div className="flex-1 overflow-y-auto space-y-3 py-4 custom-scrollbar">
          {sortedHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No history available yet</p>
              <p className="text-sm mt-1">Changes will appear here when inventory is updated</p>
            </div>
          ) : (
            sortedHistory.map((entry, index) => (
              <div
                key={entry.id || index}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className={`p-2 rounded-full ${getTypeColor(entry.type)}`}>
                      {getTypeIcon(entry.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge variant={getTypeBadge(entry.type)} className="capitalize">
                          {entry.type}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {formatDateTime(entry.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {entry.reason || 'No reason provided'}
                      </p>
                      <div className="flex items-center space-x-4 text-sm">
                        <div>
                          <span className="text-gray-600">Previous: </span>
                          <span className="font-semibold">{entry.previousQuantity}</span>
                        </div>
                        <div className="text-gray-400">→</div>
                        <div>
                          <span className="text-gray-600">New: </span>
                          <span className="font-semibold">{entry.newQuantity}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Change: </span>
                          <span className={`font-semibold ${entry.quantityChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {entry.quantityChange > 0 ? '+' : ''}{entry.quantityChange}
                          </span>
                        </div>
                      </div>
                      {entry.orderId && (
                        <p className="text-xs text-gray-500 mt-1">
                          Order ID: {entry.orderId}
                        </p>
                      )}
                      {entry.performedBy && (
                        <p className="text-xs text-gray-500 mt-1">
                          By: {entry.performedBy}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
