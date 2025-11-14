/**
 * Smart Integration System
 * Connects Orders, Customers, Inventory, and Payments
 * Ensures data consistency and automatic updates across all modules
 */

import { 
  collection, 
  doc, 
  getDoc, 
  updateDoc, 
  addDoc,
  serverTimestamp,
  increment,
  runTransaction,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';
import { Order } from '@/types/order.d';
import { Customer } from '@/types/customer.d';
import { InventoryItem } from '@/types/inventory.d';
import { Transaction } from '@/types/transaction.d';
import { deductInventory, restoreInventory } from './inventoryManager';
import { createNotification } from './notifications';

/**
 * Create a new order with automatic customer and inventory integration
 */
export async function createSmartOrder(orderData: Partial<Order>): Promise<{ 
  success: boolean; 
  orderId?: string; 
  message: string;
  warnings?: string[];
}> {
  const warnings: string[] = [];

  try {
    // Step 1: Validate inventory availability
    if (!orderData.productId || !orderData.quantity) {
      return {
        success: false,
        message: 'Product ID and quantity are required'
      };
    }

    const inventoryRef = doc(db, 'inventory', orderData.productId);
    const inventorySnap = await getDoc(inventoryRef);

    if (!inventorySnap.exists()) {
      return {
        success: false,
        message: 'Product not found in inventory'
      };
    }

    const inventory = { id: inventorySnap.id, ...inventorySnap.data() } as InventoryItem;

    if (inventory.quantity < orderData.quantity) {
      return {
        success: false,
        message: `Insufficient stock. Available: ${inventory.quantity}, Required: ${orderData.quantity}`
      };
    }

    // Step 2: Get or create customer
    let customerId = orderData.customerId;
    let customer: Customer | null = null;

    if (customerId) {
      // Use existing customer
      const customerSnap = await getDoc(doc(db, 'customers', customerId));
      if (customerSnap.exists()) {
        customer = { id: customerSnap.id, ...customerSnap.data() } as Customer;
      }
    } else if (orderData.clientName) {
      // Try to find existing customer by name
      const customersRef = collection(db, 'customers');
      const q = query(
        customersRef,
        where('name', '==', orderData.clientName),
        where('organizationId', '==', orderData.organizationId || '')
      );
      const customerSnap = await getDocs(q);

      if (!customerSnap.empty) {
        const existingCustomer = customerSnap.docs[0];
        customer = { id: existingCustomer.id, ...existingCustomer.data() } as Customer;
        customerId = existingCustomer.id;
        warnings.push(`Using existing customer: ${customer.name}`);
      } else {
        // Create new customer automatically
        warnings.push(`Creating new customer: ${orderData.clientName}`);
      }
    }

    // Step 3: Calculate payment details
    const totalAmount = orderData.amount || (inventory.unitPrice * orderData.quantity);
    const paymentStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
    const paidAmount = 0;
    const outstandingAmount = totalAmount;

    // Step 4: Create order with transaction
    const orderDoc = await runTransaction(db, async (transaction) => {
      // Create the order
      const orderRef = doc(collection(db, 'orders'));
      const newOrder: Partial<Order> = {
        ...orderData,
        customerId,
        amount: totalAmount,
        paymentStatus,
        paidAmount,
        outstandingAmount,
        inventoryDeducted: false, // Will be set to true after deduction
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      transaction.set(orderRef, newOrder);

      // Create or update customer
      if (!customerId && orderData.clientName) {
        // Create new customer
        const customerRef = doc(collection(db, 'customers'));
        const customerData: Partial<Customer> = {
          customerId: `CUST-${Date.now().toString().slice(-6)}`,
          name: orderData.clientName,
          phone: orderData.clientPhone || '',
          email: orderData.clientEmail || '',
          country: orderData.country || '',
          type: 'new',
          status: 'active',
          totalOrders: 1,
          totalPurchases: totalAmount,
          outstandingBalance: totalAmount,
          loyaltyPoints: Math.floor(totalAmount / 100),
          firstOrderDate: serverTimestamp(),
          lastOrderDate: serverTimestamp(),
          organizationId: orderData.organizationId || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        transaction.set(customerRef, customerData);
        customerId = customerRef.id;
      } else if (customerId && customer) {
        // Update existing customer stats
        const customerRef = doc(db, 'customers', customerId);
        transaction.update(customerRef, {
          totalOrders: increment(1),
          totalPurchases: increment(totalAmount),
          outstandingBalance: increment(totalAmount),
          loyaltyPoints: increment(Math.floor(totalAmount / 100)),
          lastOrderDate: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      return { orderId: orderRef.id, customerId };
    });

    // Step 5: Deduct inventory (outside transaction for better error handling)
    const deductResult = await deductInventory(
      orderData.productId!,
      orderData.quantity,
      orderData.orderId || orderDoc.orderId
    );

    if (deductResult.success) {
      // Mark order as inventory deducted
      await updateDoc(doc(db, 'orders', orderDoc.orderId), {
        inventoryDeducted: true,
        customerId: orderDoc.customerId,
      });
    } else {
      warnings.push(`Inventory deduction warning: ${deductResult.message}`);
    }

    // Step 6: Create notification
    await createNotification({
      type: 'order-created',
      title: 'New Order Created',
      message: `Order ${orderData.orderId} created for ${orderData.clientName}. Amount: ₹${totalAmount.toLocaleString()}`,
      severity: 'info',
      orderId: orderData.orderId,
      actionRequired: false,
      actionUrl: '/dashboard/orders',
    });

    return {
      success: true,
      orderId: orderDoc.orderId,
      message: 'Order created successfully',
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error: any) {
    console.error('Error creating smart order:', error);
    return {
      success: false,
      message: error.message || 'Failed to create order',
    };
  }
}

/**
 * Process payment and update order + customer
 */
export async function processPayment(
  orderId: string,
  paymentAmount: number,
  paymentMode: Transaction['paymentMode'],
  transactionId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Get the order
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      return { success: false, message: 'Order not found' };
    }

    const order = { id: orderSnap.id, ...orderSnap.data() } as Order;

    // Calculate new payment status
    const newPaidAmount = (order.paidAmount || 0) + paymentAmount;
    const newOutstanding = order.amount - newPaidAmount;
    
    let paymentStatus: 'unpaid' | 'partial' | 'paid';
    if (newOutstanding <= 0) {
      paymentStatus = 'paid';
    } else if (newPaidAmount > 0) {
      paymentStatus = 'partial';
    } else {
      paymentStatus = 'unpaid';
    }

    await runTransaction(db, async (transaction) => {
      // Update order
      transaction.update(orderRef, {
        paidAmount: newPaidAmount,
        outstandingAmount: Math.max(0, newOutstanding),
        paymentStatus,
        transactionId,
        updatedAt: serverTimestamp(),
      });

      // Update customer if exists
      if (order.customerId) {
        const customerRef = doc(db, 'customers', order.customerId);
        const customerSnap = await transaction.get(customerRef);
        
        if (customerSnap.exists()) {
          const currentOutstanding = customerSnap.data().outstandingBalance || 0;
          transaction.update(customerRef, {
            outstandingBalance: Math.max(0, currentOutstanding - paymentAmount),
            updatedAt: serverTimestamp(),
          });
        }
      }
    });

    // Create notification for full payment
    if (paymentStatus === 'paid') {
      await createNotification({
        type: 'payment-pending',
        title: 'Payment Completed',
        message: `Order ${order.orderId} fully paid. Amount: ₹${order.amount.toLocaleString()}`,
        severity: 'success',
        orderId: order.orderId,
        transactionId,
        actionRequired: false,
        actionUrl: '/dashboard/payments',
      });
    }

    return {
      success: true,
      message: `Payment processed successfully. ${paymentStatus === 'paid' ? 'Order fully paid!' : `Outstanding: ₹${newOutstanding.toLocaleString()}`}`,
    };
  } catch (error: any) {
    console.error('Error processing payment:', error);
    return {
      success: false,
      message: error.message || 'Failed to process payment',
    };
  }
}

/**
 * Cancel order and restore inventory + update customer
 */
export async function cancelSmartOrder(orderId: string, reason: string): Promise<{ 
  success: boolean; 
  message: string;
}> {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      return { success: false, message: 'Order not found' };
    }

    const order = { id: orderSnap.id, ...orderSnap.data() } as Order;

    if (order.status === 'cancelled') {
      return { success: false, message: 'Order already cancelled' };
    }

    await runTransaction(db, async (transaction) => {
      // Update order status
      transaction.update(orderRef, {
        status: 'cancelled',
        notes: (order.notes ? order.notes + '\n' : '') + `Cancelled: ${reason}`,
        updatedAt: serverTimestamp(),
      });

      // Update customer stats if exists
      if (order.customerId) {
        const customerRef = doc(db, 'customers', order.customerId);
        const customerSnap = await transaction.get(customerRef);
        
        if (customerSnap.exists()) {
          transaction.update(customerRef, {
            totalOrders: increment(-1),
            totalPurchases: increment(-order.amount),
            outstandingBalance: increment(-order.outstandingAmount),
            updatedAt: serverTimestamp(),
          });
        }
      }
    });

    // Restore inventory if it was deducted
    if (order.inventoryDeducted) {
      await restoreInventory(order.productId, order.quantity, order.orderId);
      await updateDoc(orderRef, { inventoryDeducted: false });
    }

    await createNotification({
      type: 'order-created',
      title: 'Order Cancelled',
      message: `Order ${order.orderId} cancelled. Reason: ${reason}`,
      severity: 'warning',
      orderId: order.orderId,
      actionRequired: false,
      actionUrl: '/dashboard/orders',
    });

    return {
      success: true,
      message: 'Order cancelled successfully',
    };
  } catch (error: any) {
    console.error('Error cancelling order:', error);
    return {
      success: false,
      message: error.message || 'Failed to cancel order',
    };
  }
}

/**
 * Get customer summary for quick selection
 */
export async function getCustomerSummary(organizationId: string): Promise<Array<{
  id: string;
  customerId: string;
  name: string;
  phone: string;
  email?: string;
  outstandingBalance: number;
  totalOrders: number;
  type: string;
}>> {
  try {
    const customersRef = collection(db, 'customers');
    const q = query(
      customersRef,
      where('organizationId', '==', organizationId),
      where('status', '==', 'active')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        customerId: data.customerId,
        name: data.name,
        phone: data.phone,
        email: data.email,
        outstandingBalance: data.outstandingBalance || 0,
        totalOrders: data.totalOrders || 0,
        type: data.type,
      };
    });
  } catch (error) {
    console.error('Error getting customer summary:', error);
    return [];
  }
}

/**
 * Get inventory items for product selection
 */
export async function getInventorySummary(organizationId: string): Promise<Array<{
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  category?: string;
  supplierName?: string;
}>> {
  try {
    const inventoryRef = collection(db, 'inventory');
    const q = query(inventoryRef, where('organizationId', '==', organizationId));
    const snapshot = await getDocs(q);

    return snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          productName: data.productName,
          sku: data.sku,
          quantity: data.quantity,
          unitPrice: data.unitPrice,
          category: data.category,
          supplierName: data.supplierName,
        };
      })
      .filter(item => item.quantity > 0) // Only show items in stock
      .sort((a, b) => a.productName.localeCompare(b.productName));
  } catch (error) {
    console.error('Error getting inventory summary:', error);
    return [];
  }
}

/**
 * Get unpaid orders for a customer
 */
export async function getCustomerUnpaidOrders(customerId: string): Promise<Order[]> {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('customerId', '==', customerId),
      where('paymentStatus', 'in', ['unpaid', 'partial'])
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
  } catch (error) {
    console.error('Error getting unpaid orders:', error);
    return [];
  }
}
