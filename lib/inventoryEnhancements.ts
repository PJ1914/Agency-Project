import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { InventoryItem } from '@/types/inventory.d';
import { ReorderSuggestion } from '@/types/supplier.d';
import { createNotification } from './notifications';

/**
 * Calculate optimal reorder point based on lead time and usage
 * Formula: Reorder Point = (Average Daily Usage × Lead Time) + Safety Stock
 */
export function calculateReorderPoint(
  averageDailyUsage: number,
  leadTimeDays: number = 7,
  safetyStockDays: number = 3
): number {
  return Math.ceil((averageDailyUsage * leadTimeDays) + (averageDailyUsage * safetyStockDays));
}

/**
 * Calculate Economic Order Quantity (EOQ)
 * Formula: EOQ = √((2 × Annual Demand × Ordering Cost) / Holding Cost per Unit)
 * Simplified: For small businesses, suggest 2-4 weeks of stock
 */
export function calculateEconomicOrderQuantity(
  averageDailyUsage: number,
  leadTimeDays: number = 7
): number {
  // Suggest ordering enough for (lead time + 2 weeks)
  const suggestedDays = leadTimeDays + 14;
  return Math.ceil(averageDailyUsage * suggestedDays);
}

/**
 * Estimate average daily usage from history
 */
export function estimateAverageDailyUsage(item: InventoryItem): number {
  if (!item.history || item.history.length === 0) {
    // No history, estimate 10% of current stock per week
    return Math.ceil((item.quantity * 0.1) / 7);
  }

  // Calculate usage from sale history in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentSales = item.history.filter(entry => {
    const entryDate = entry.createdAt instanceof Date 
      ? entry.createdAt 
      : new Date(entry.createdAt);
    return entry.type === 'sale' && entryDate >= thirtyDaysAgo;
  });

  if (recentSales.length === 0) {
    // No recent sales, use 5 units per day as default
    return 5;
  }

  const totalSold = recentSales.reduce((sum, entry) => sum + Math.abs(entry.quantityChange), 0);
  const daysWithData = Math.min(30, recentSales.length);
  
  return Math.ceil(totalSold / daysWithData) || 1;
}

/**
 * Get reorder suggestions for low stock items
 */
export async function getReorderSuggestions(organizationId: string): Promise<ReorderSuggestion[]> {
  try {
    const inventoryRef = collection(db, 'inventory');
    const q = query(inventoryRef, where('organizationId', '==', organizationId));
    const snapshot = await getDocs(q);

    const suggestions: ReorderSuggestion[] = [];

    for (const docSnap of snapshot.docs) {
      const item = { id: docSnap.id, ...docSnap.data() } as InventoryItem;

      // Only suggest reorder if below threshold
      if (!item.lowStockThreshold || item.quantity > item.lowStockThreshold) {
        continue;
      }

      const averageDailyUsage = estimateAverageDailyUsage(item);
      const leadTime = item.leadTimeDays || 7;

      const reorderPoint = item.reorderPoint || calculateReorderPoint(averageDailyUsage, leadTime);
      const suggestedOrderQuantity = item.reorderQuantity || calculateEconomicOrderQuantity(averageDailyUsage, leadTime);

      // Determine urgency
      let urgency: 'critical' | 'high' | 'medium' | 'low';
      if (item.quantity === 0) {
        urgency = 'critical';
      } else if (item.quantity <= averageDailyUsage * 2) {
        urgency = 'high';
      } else if (item.quantity <= item.lowStockThreshold) {
        urgency = 'medium';
      } else {
        urgency = 'low';
      }

      suggestions.push({
        inventoryId: item.id,
        productName: item.productName,
        currentStock: item.quantity,
        lowStockThreshold: item.lowStockThreshold,
        reorderPoint,
        suggestedOrderQuantity,
        supplierId: item.supplierId,
        supplierName: item.supplierName,
        estimatedCost: item.unitPrice * suggestedOrderQuantity,
        urgency,
      });
    }

    // Sort by urgency
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    suggestions.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

    return suggestions;
  } catch (error) {
    console.error('Error getting reorder suggestions:', error);
    return [];
  }
}

/**
 * Check inventory and create reorder notifications
 */
export async function checkReorderRequirements(organizationId: string): Promise<void> {
  const suggestions = await getReorderSuggestions(organizationId);

  for (const suggestion of suggestions) {
    if (suggestion.urgency === 'critical' || suggestion.urgency === 'high') {
      // Check if notification already exists
      const notifQuery = query(
        collection(db, 'notifications'),
        where('inventoryId', '==', suggestion.inventoryId),
        where('type', '==', 'reorder-required'),
        where('read', '==', false)
      );

      const existingNotifs = await getDocs(notifQuery);

      if (existingNotifs.empty) {
        await createNotification({
          type: 'reorder-required',
          title: suggestion.urgency === 'critical' ? '🚨 Urgent Reorder Required' : '⚠️ Reorder Recommended',
          message: `${suggestion.productName}: Current stock ${suggestion.currentStock} units. Suggested order: ${suggestion.suggestedOrderQuantity} units${suggestion.supplierName ? ` from ${suggestion.supplierName}` : ''}.`,
          severity: suggestion.urgency === 'critical' ? 'critical' : 'warning',
          inventoryId: suggestion.inventoryId,
          actionRequired: true,
          actionUrl: '/dashboard/inventory',
        });
      }
    }
  }
}

/**
 * Get urgency color for UI
 */
export function getUrgencyColor(urgency: 'critical' | 'high' | 'medium' | 'low'): string {
  const colors = {
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };
  return colors[urgency];
}

/**
 * Format days into readable string
 */
export function formatLeadTime(days: number): string {
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  const weeks = Math.floor(days / 7);
  const remainingDays = days % 7;
  if (remainingDays === 0) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
  return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ${remainingDays} ${remainingDays === 1 ? 'day' : 'days'}`;
}
