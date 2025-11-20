import { 
  collection, 
  doc, 
  getDoc, 
  updateDoc, 
  increment,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { createNotification } from './notifications';

/**
 * Deduct inventory when an order is placed
 */
export async function deductInventory(
  productId: string, 
  quantity: number,
  orderId: string
): Promise<{ success: boolean; message: string; currentStock?: number }> {
  try {
    const inventoryRef = doc(db, 'inventory', productId);
    const inventorySnap = await getDoc(inventoryRef);
    
    if (!inventorySnap.exists()) {
      return {
        success: false,
        message: 'Product not found in inventory'
      };
    }
    
    const inventoryData = inventorySnap.data();
    const currentStock = inventoryData.quantity || 0;
    
    // Check if enough stock available
    if (currentStock < quantity) {
      await createNotification({
        type: 'stock-critical',
        title: 'Insufficient Stock',
        message: `Cannot process order ${orderId}. ${inventoryData.productName} has only ${currentStock} units available, but ${quantity} units requested.`,
        severity: 'critical',
        inventoryId: productId,
        orderId: orderId,
        organizationId: inventoryData.organizationId,
        actionRequired: true,
        actionUrl: '/dashboard/inventory',
      });
      
      return {
        success: false,
        message: `Insufficient stock. Available: ${currentStock}, Required: ${quantity}`,
        currentStock
      };
    }
    
    const newStock = currentStock - quantity;
    
    // Create history entry with current timestamp (not serverTimestamp in array)
    const historyEntry = {
      id: Date.now().toString(),
      type: 'sale',
      quantityChange: -quantity,
      previousQuantity: currentStock,
      newQuantity: newStock,
      reason: `Order #${orderId}`,
      orderId: orderId,
      createdAt: new Date().toISOString()
    };
    
    // Get existing history
    const existingHistory = inventoryData.history || [];
    
    // Calculate new total price based on unit price and new quantity
    const unitPrice = inventoryData.unitPrice || (inventoryData.price / currentStock);
    const newTotalPrice = unitPrice * newStock;
    
    // Deduct inventory and add history
    await updateDoc(inventoryRef, {
      quantity: newStock,
      price: newTotalPrice,
      unitPrice: unitPrice,
      lastOrderDate: serverTimestamp(),
      history: [...existingHistory, historyEntry],
      updatedAt: serverTimestamp()
    });
    
    // Check if stock is now low
    if (inventoryData.lowStockThreshold && newStock <= inventoryData.lowStockThreshold) {
      await createNotification({
        type: newStock === 0 ? 'stock-critical' : 'low-stock',
        title: newStock === 0 ? 'Stock Depleted!' : 'Low Stock Alert',
        message: `${inventoryData.productName} now has ${newStock} units remaining after order ${orderId}. ${newStock === 0 ? 'Immediate restocking required!' : `Threshold: ${inventoryData.lowStockThreshold}`}`,
        severity: newStock === 0 ? 'critical' : 'warning',
        inventoryId: productId,
        orderId: orderId,
        organizationId: inventoryData.organizationId,
        actionRequired: true,
        actionUrl: '/dashboard/inventory',
      });
    }
    
    // Log inventory transaction
    await addDoc(collection(db, 'inventoryTransactions'), {
      productId,
      productName: inventoryData.productName,
      type: 'deduction',
      quantity: -quantity,
      orderId,
      reason: 'Order placed',
      previousStock: currentStock,
      newStock: newStock,
      createdAt: serverTimestamp()
    });
    
    return {
      success: true,
      message: `Inventory updated successfully. New stock: ${newStock}`,
      currentStock: newStock
    };
  } catch (error: any) {
    console.error('Error deducting inventory:', error);
    return {
      success: false,
      message: error.message || 'Failed to update inventory'
    };
  }
}

/**
 * Restore inventory when an order is cancelled
 */
export async function restoreInventory(
  productId: string, 
  quantity: number,
  orderId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const inventoryRef = doc(db, 'inventory', productId);
    const inventorySnap = await getDoc(inventoryRef);
    
    if (!inventorySnap.exists()) {
      return {
        success: false,
        message: 'Product not found in inventory'
      };
    }
    
    const inventoryData = inventorySnap.data();
    const currentStock = inventoryData.quantity || 0;
    const newStock = currentStock + quantity;
    
    // Create history entry with current timestamp (not serverTimestamp in array)
    const historyEntry = {
      id: Date.now().toString(),
      type: 'adjustment',
      quantityChange: quantity,
      previousQuantity: currentStock,
      newQuantity: newStock,
      reason: `Order #${orderId} cancelled`,
      orderId: orderId,
      createdAt: new Date().toISOString()
    };
    
    // Get existing history
    const existingHistory = inventoryData.history || [];
    
    // Calculate new total price based on unit price and new quantity
    const unitPrice = inventoryData.unitPrice || (inventoryData.price / currentStock);
    const newTotalPrice = unitPrice * newStock;
    
    // Restore inventory and add history
    await updateDoc(inventoryRef, {
      quantity: newStock,
      price: newTotalPrice,
      unitPrice: unitPrice,
      history: [...existingHistory, historyEntry],
      updatedAt: serverTimestamp()
    });
    
    // Log inventory transaction
    await addDoc(collection(db, 'inventoryTransactions'), {
      productId,
      productName: inventoryData.productName,
      type: 'addition',
      quantity: quantity,
      orderId,
      reason: 'Order cancelled',
      previousStock: currentStock,
      newStock: newStock,
      createdAt: serverTimestamp()
    });
    
    return {
      success: true,
      message: `Inventory restored. New stock: ${newStock}`
    };
  } catch (error: any) {
    console.error('Error restoring inventory:', error);
    return {
      success: false,
      message: error.message || 'Failed to restore inventory'
    };
  }
}

/**
 * Check if product has sufficient stock
 */
export async function checkStock(
  productId: string, 
  requiredQuantity: number
): Promise<{ available: boolean; currentStock: number; productName: string }> {
  try {
    const inventoryRef = doc(db, 'inventory', productId);
    const inventorySnap = await getDoc(inventoryRef);
    
    if (!inventorySnap.exists()) {
      return {
        available: false,
        currentStock: 0,
        productName: 'Unknown'
      };
    }
    
    const inventoryData = inventorySnap.data();
    const currentStock = inventoryData.quantity || 0;
    
    return {
      available: currentStock >= requiredQuantity,
      currentStock,
      productName: inventoryData.productName || 'Unknown'
    };
  } catch (error) {
    console.error('Error checking stock:', error);
    return {
      available: false,
      currentStock: 0,
      productName: 'Unknown'
    };
  }
}

/**
 * Get inventory transaction history
 */
export async function getInventoryHistory(productId?: string) {
  try {
    let q;
    if (productId) {
      q = query(
        collection(db, 'inventoryTransactions'),
        where('productId', '==', productId)
      );
    } else {
      q = collection(db, 'inventoryTransactions');
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching inventory history:', error);
    return [];
  }
}

/**
 * Update inventory quantity with history tracking
 */
export async function updateInventoryWithHistory(
  productId: string,
  newQuantity: number,
  reason: string = 'Manual adjustment',
  performedBy?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const inventoryRef = doc(db, 'inventory', productId);
    const inventorySnap = await getDoc(inventoryRef);
    
    if (!inventorySnap.exists()) {
      return {
        success: false,
        message: 'Product not found in inventory'
      };
    }
    
    const inventoryData = inventorySnap.data();
    const currentStock = inventoryData.quantity || 0;
    const quantityChange = newQuantity - currentStock;
    
    // Create history entry with current timestamp (not serverTimestamp in array)
    const historyEntry = {
      id: Date.now().toString(),
      type: quantityChange > 0 ? 'restock' : 'adjustment',
      quantityChange: quantityChange,
      previousQuantity: currentStock,
      newQuantity: newQuantity,
      reason: reason,
      performedBy: performedBy || 'Admin',
      createdAt: new Date().toISOString()
    };
    
    // Get existing history
    const existingHistory = inventoryData.history || [];
    
    // Calculate new total price based on unit price and new quantity
    const unitPrice = inventoryData.unitPrice || (currentStock > 0 ? inventoryData.price / currentStock : inventoryData.price);
    const newTotalPrice = unitPrice * newQuantity;
    
    // Update inventory with history
    await updateDoc(inventoryRef, {
      quantity: newQuantity,
      price: newTotalPrice,
      unitPrice: unitPrice,
      history: [...existingHistory, historyEntry],
      updatedAt: serverTimestamp()
    });
    
    // Log inventory transaction
    await addDoc(collection(db, 'inventoryTransactions'), {
      productId,
      productName: inventoryData.productName,
      type: quantityChange > 0 ? 'addition' : 'deduction',
      quantity: quantityChange,
      reason: reason,
      previousStock: currentStock,
      newStock: newQuantity,
      performedBy: performedBy || 'Admin',
      createdAt: serverTimestamp()
    });
    
    return {
      success: true,
      message: `Inventory updated successfully. Stock changed from ${currentStock} to ${newQuantity}`
    };
  } catch (error: any) {
    console.error('Error updating inventory:', error);
    return {
      success: false,
      message: error.message || 'Failed to update inventory'
    };
  }
}

/**
 * Auto-create shipment when order status changes to 'shipped'
 */
export async function autoCreateShipment(order: any): Promise<string | null> {
  try {
    const shipmentData = {
      orderId: order.orderId,
      trackingNumber: `TRK${Date.now()}${Math.floor(Math.random() * 1000)}`,
      carrier: 'Default Carrier',
      status: 'in-transit',
      origin: 'Warehouse',
      destination: order.country,
      shipDate: new Date(),
      estimatedDelivery: order.expectedDelivery || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: `Auto-generated shipment for order ${order.orderId}`,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const shipmentRef = await addDoc(collection(db, 'shipments'), shipmentData);
    
    // Create notification
    await createNotification({
      type: 'order-created',
      title: 'Shipment Created',
      message: `Shipment ${shipmentData.trackingNumber} created for order ${order.orderId} to ${order.country}`,
      severity: 'info',
      orderId: order.orderId,
      shipmentId: shipmentRef.id,
      organizationId: order.organizationId,
      actionRequired: false,
      actionUrl: '/dashboard/shipments',
    });
    
    return shipmentRef.id;
  } catch (error) {
    console.error('Error creating shipment:', error);
    return null;
  }
}
