import { doc, getDoc, updateDoc, increment, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { Customer } from '@/types/customer.d';
import { Order } from '@/types/order.d';

/**
 * VIP threshold - customers with total purchases above this become VIP
 */
const VIP_THRESHOLD = 50000;

/**
 * Loyalty points calculation: 1 point per 100 rupees spent
 */
const LOYALTY_POINTS_RATE = 100;

/**
 * Update customer stats when an order is created
 * - Increments total purchases
 * - Increments total orders
 * - Updates outstanding balance if not fully paid
 * - Awards loyalty points
 * - Updates customer type to VIP if threshold reached
 */
export async function updateCustomerOnOrderCreate(
  customerId: string,
  orderAmount: number,
  paidAmount: number,
  outstandingAmount: number
): Promise<void> {
  try {
    const customerRef = doc(db, 'customers', customerId);
    const customerSnap = await getDoc(customerRef);

    if (!customerSnap.exists()) {
      console.error('Customer not found:', customerId);
      return;
    }

    const customer = customerSnap.data() as Customer;
    
    // Calculate loyalty points for this order (1 point per 100 rupees)
    const newLoyaltyPoints = Math.floor(orderAmount / LOYALTY_POINTS_RATE);
    
    // Calculate new total purchases
    const newTotalPurchases = (customer.totalPurchases || 0) + orderAmount;
    
    // Determine if customer should be VIP
    const shouldBeVIP = newTotalPurchases >= VIP_THRESHOLD;
    const newType = shouldBeVIP ? 'vip' : (customer.type === 'new' ? 'regular' : customer.type);

    // Update customer document
    await updateDoc(customerRef, {
      totalPurchases: increment(orderAmount),
      totalOrders: increment(1),
      outstandingBalance: increment(outstandingAmount),
      loyaltyPoints: increment(newLoyaltyPoints),
      type: newType,
      lastOrderDate: new Date(),
      updatedAt: new Date(),
      // Set firstOrderDate if this is their first order
      ...(customer.totalOrders === 0 && { firstOrderDate: new Date() })
    });

    console.log(`✅ Customer ${customerId} stats updated: +${orderAmount} revenue, +${newLoyaltyPoints} points, type: ${newType}`);
  } catch (error) {
    console.error('Error updating customer on order create:', error);
    throw error;
  }
}

/**
 * Update customer stats when a payment is made
 * - Reduces outstanding balance
 */
export async function updateCustomerOnPayment(
  customerId: string,
  paymentAmount: number
): Promise<void> {
  try {
    const customerRef = doc(db, 'customers', customerId);
    
    // Reduce outstanding balance
    await updateDoc(customerRef, {
      outstandingBalance: increment(-paymentAmount),
      updatedAt: new Date(),
    });

    console.log(`✅ Customer ${customerId} outstanding reduced by ${paymentAmount}`);
  } catch (error) {
    console.error('Error updating customer on payment:', error);
    throw error;
  }
}

/**
 * Update customer stats when an order is cancelled
 * - Reverses the changes made during order creation
 */
export async function updateCustomerOnOrderCancel(
  customerId: string,
  orderAmount: number,
  outstandingAmount: number
): Promise<void> {
  try {
    const customerRef = doc(db, 'customers', customerId);
    const customerSnap = await getDoc(customerRef);

    if (!customerSnap.exists()) return;

    const customer = customerSnap.data() as Customer;
    
    // Calculate loyalty points to deduct
    const loyaltyPointsToDeduct = Math.floor(orderAmount / LOYALTY_POINTS_RATE);
    
    // Calculate new total purchases after cancellation
    const newTotalPurchases = Math.max(0, (customer.totalPurchases || 0) - orderAmount);
    
    // Re-evaluate VIP status
    const shouldBeVIP = newTotalPurchases >= VIP_THRESHOLD;
    const newType = shouldBeVIP ? 'vip' : (customer.type === 'vip' ? 'regular' : customer.type);

    await updateDoc(customerRef, {
      totalPurchases: increment(-orderAmount),
      totalOrders: increment(-1),
      outstandingBalance: increment(-outstandingAmount),
      loyaltyPoints: increment(-loyaltyPointsToDeduct),
      type: newType,
      updatedAt: new Date(),
    });

    console.log(`✅ Customer ${customerId} stats reversed for cancelled order`);
  } catch (error) {
    console.error('Error updating customer on order cancel:', error);
    throw error;
  }
}

/**
 * Recalculate customer stats from all their orders (use for data sync/fixes)
 */
export async function recalculateCustomerStats(
  customerId: string,
  organizationId: string
): Promise<void> {
  try {
    const customerRef = doc(db, 'customers', customerId);
    
    // Fetch all orders for this customer - simpler query to avoid complex index
    const ordersQuery = query(
      collection(db, 'orders'),
      where('customerId', '==', customerId),
      where('organizationId', '==', organizationId)
    );
    
    const ordersSnap = await getDocs(ordersQuery);
    const allOrders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
    
    // Filter out cancelled orders in memory (no index needed)
    const orders = allOrders.filter(order => order.status !== 'cancelled');

    // Fetch all transactions/payments for this organization to calculate real outstanding
    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('organizationId', '==', organizationId)
    );
    const transactionsSnap = await getDocs(transactionsQuery);
    const allTransactions = transactionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

    // Calculate totals
    const totalPurchases = orders.reduce((sum, order) => sum + order.amount, 0);
    const totalOrders = orders.length;
    
    // Calculate real outstanding: Order Amount - Sum of Payments for that order
    let outstandingBalance = 0;
    for (const order of orders) {
      const orderPayments = allTransactions.filter(t => 
        t.orderId === order.orderId && 
        t.status?.toLowerCase() === 'success'
      );
      const totalPaid = orderPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      const orderOutstanding = order.amount - totalPaid;
      outstandingBalance += Math.max(0, orderOutstanding); // Don't allow negative
    }
    
    const loyaltyPoints = Math.floor(totalPurchases / LOYALTY_POINTS_RATE);

    // Determine customer type
    const type = totalPurchases >= VIP_THRESHOLD ? 'vip' : 'regular';

    // Get first and last order dates - only if there are orders
    let firstOrderDate = null;
    let lastOrderDate = null;
    
    if (orders.length > 0) {
      const orderDates = orders
        .map(o => o.orderDate ? new Date(o.orderDate) : null)
        .filter((date): date is Date => date !== null && !isNaN(date.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());
      
      firstOrderDate = orderDates.length > 0 ? orderDates[0] : null;
      lastOrderDate = orderDates.length > 0 ? orderDates[orderDates.length - 1] : null;
    }

    // Update customer
    const updateData: any = {
      totalPurchases,
      totalOrders,
      outstandingBalance,
      loyaltyPoints,
      type,
      updatedAt: new Date(),
    };

    // Only add date fields if they're valid
    if (firstOrderDate) {
      updateData.firstOrderDate = firstOrderDate;
    }
    if (lastOrderDate) {
      updateData.lastOrderDate = lastOrderDate;
    }

    await updateDoc(customerRef, updateData);

    console.log(`✅ Customer ${customerId} stats recalculated from ${totalOrders} orders`);
  } catch (error) {
    console.error('Error recalculating customer stats:', error);
    throw error;
  }
}

/**
 * Link existing orders to customers by matching clientName/clientPhone
 * Use this to fix old orders that don't have customerId
 */
export async function linkOrdersToCustomers(organizationId: string): Promise<{ success: boolean; linked: number; alreadyLinked: number }> {
  try {
    console.log('🔗 Starting order-customer linking...');

    // Get all customers
    const customersQuery = query(
      collection(db, 'customers'),
      where('organizationId', '==', organizationId)
    );
    const customersSnap = await getDocs(customersQuery);

    // Create lookup maps
    const customersByName = new Map<string, string>();
    const customersByPhone = new Map<string, string>();

    customersSnap.docs.forEach(doc => {
      const customer = doc.data() as Customer;
      customersByName.set(customer.name.toLowerCase().trim(), doc.id);
      if (customer.phone) {
        customersByPhone.set(customer.phone.replace(/\D/g, ''), doc.id);
      }
    });

    // Get all orders
    const ordersQuery = query(
      collection(db, 'orders'),
      where('organizationId', '==', organizationId)
    );
    const ordersSnap = await getDocs(ordersQuery);

    let linked = 0;
    let alreadyLinked = 0;

    // Process each order
    for (const orderDoc of ordersSnap.docs) {
      const order = orderDoc.data() as Order;

      // Skip if already linked
      if (order.customerId) {
        alreadyLinked++;
        continue;
      }

      // Try to find matching customer
      let matchedCustomerId = null;

      // Match by name
      if (order.clientName) {
        const nameKey = order.clientName.toLowerCase().trim();
        matchedCustomerId = customersByName.get(nameKey);
      }

      // Match by phone if name didn't work
      if (!matchedCustomerId && order.clientPhone) {
        const phoneKey = order.clientPhone.replace(/\D/g, '');
        matchedCustomerId = customersByPhone.get(phoneKey);
      }

      if (matchedCustomerId) {
        // Link order to customer
        await updateDoc(doc(db, 'orders', orderDoc.id), {
          customerId: matchedCustomerId,
          updatedAt: new Date()
        });
        linked++;
      }
    }

    console.log(`✅ Linking complete: ${linked} linked, ${alreadyLinked} already linked`);
    return { success: true, linked, alreadyLinked };
  } catch (error) {
    console.error('Error linking orders to customers:', error);
    return { success: false, linked: 0, alreadyLinked: 0 };
  }
}

/**
 * Recalculate ALL customer stats for an organization from their orders (use for data sync/fixes)
 */
export async function recalculateAllCustomerStats(organizationId: string): Promise<{ success: boolean; updated: number; errors: number }> {
  try {
    console.log('🔄 Starting bulk customer stats recalculation...');

    // Fetch all customers
    const customersQuery = query(
      collection(db, 'customers'),
      where('organizationId', '==', organizationId)
    );
    const customersSnap = await getDocs(customersQuery);

    let updated = 0;
    let errors = 0;

    // Process each customer
    for (const customerDoc of customersSnap.docs) {
      try {
        await recalculateCustomerStats(customerDoc.id, organizationId);
        updated++;
      } catch (error) {
        console.error(`Error processing customer ${customerDoc.id}:`, error);
        errors++;
      }
    }

    console.log(`✅ Recalculation complete: ${updated} updated, ${errors} errors`);
    return { success: true, updated, errors };
  } catch (error) {
    console.error('Error recalculating all customer stats:', error);
    return { success: false, updated: 0, errors: 0 };
  }
}

/**
 * Update order payment status when a payment is made
 * Calculates total paid amount from all successful transactions
 * Updates paidAmount, outstandingAmount, and paymentStatus in order
 */
export async function updateOrderPaymentStatus(
  orderId: string,
  organizationId: string
): Promise<void> {
  try {
    // Get all successful transactions for this order
    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('orderId', '==', orderId),
      where('organizationId', '==', organizationId),
      where('status', '==', 'Success')
    );
    
    const transactionsSnap = await getDocs(transactionsQuery);
    const totalPaid = transactionsSnap.docs.reduce((sum, doc) => {
      return sum + (doc.data().amount || 0);
    }, 0);

    // Get the order to calculate outstanding
    const ordersQuery = query(
      collection(db, 'orders'),
      where('orderId', '==', orderId),
      where('organizationId', '==', organizationId)
    );
    
    const ordersSnap = await getDocs(ordersQuery);
    if (ordersSnap.empty) {
      console.error('Order not found:', orderId);
      return;
    }

    const orderDoc = ordersSnap.docs[0];
    const order = orderDoc.data() as Order;
    const orderRef = doc(db, 'orders', orderDoc.id);

    const outstanding = Math.max(0, order.amount - totalPaid);
    let paymentStatus: 'paid' | 'unpaid' | 'partial';
    
    if (totalPaid === 0) {
      paymentStatus = 'unpaid';
    } else if (outstanding === 0) {
      paymentStatus = 'paid';
    } else {
      paymentStatus = 'partial';
    }

    // Update order with payment info
    await updateDoc(orderRef, {
      paidAmount: totalPaid,
      outstandingAmount: outstanding,
      paymentStatus: paymentStatus,
      updatedAt: new Date(),
    });

    console.log(`✅ Order ${orderId} payment updated: ₹${totalPaid} paid, ₹${outstanding} outstanding, status: ${paymentStatus}`);
  } catch (error) {
    console.error('Error updating order payment status:', error);
    throw error;
  }
}

/**
 * Get VIP threshold value
 */
export function getVIPThreshold(): number {
  return VIP_THRESHOLD;
}

/**
 * Check if a customer should be VIP based on total purchases
 */
export function isVIPCustomer(totalPurchases: number): boolean {
  return totalPurchases >= VIP_THRESHOLD;
}
