import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs,
  updateDoc,
  doc 
} from 'firebase/firestore';
import { db } from './firebase';
import { Notification } from '@/types/notification.d';

// Create a notification in Firestore
export async function createNotification(
  notification: Omit<Notification, 'id' | 'createdAt' | 'read'>
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'notifications'), {
      ...notification,
      read: false,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

// Check inventory levels and create low stock notifications
export async function checkInventoryLevels(organizationId?: string): Promise<void> {
  try {
    const constraints = organizationId ? [where('organizationId', '==', organizationId)] : [];
    const inventoryQuery = query(collection(db, 'inventory'), ...constraints);
    const snapshot = await getDocs(inventoryQuery);
    
    for (const docSnap of snapshot.docs) {
      const item = { id: docSnap.id, ...docSnap.data() } as any;
      
      if (item.lowStockThreshold && item.quantity <= item.lowStockThreshold) {
        // Check if notification already exists for this item
        const notifQuery = query(
          collection(db, 'notifications'),
          where('inventoryId', '==', item.id),
          where('type', '==', item.quantity === 0 ? 'stock-critical' : 'low-stock'),
          where('read', '==', false)
        );
        
        const existingNotifs = await getDocs(notifQuery);
        
        if (existingNotifs.empty) {
          await createNotification({
            type: item.quantity === 0 ? 'stock-critical' : 'low-stock',
            title: item.quantity === 0 ? 'Stock Depleted!' : 'Low Stock Alert',
            message: `${item.productName} has ${item.quantity === 0 ? 'run out of stock' : `only ${item.quantity} units remaining`}. Threshold: ${item.lowStockThreshold}`,
            severity: item.quantity === 0 ? 'critical' : 'warning',
            inventoryId: item.id,
            organizationId: item.organizationId,
            actionRequired: true,
            actionUrl: '/dashboard/inventory',
          });
        }
      }
    }
  } catch (error) {
    console.error('Error checking inventory levels:', error);
  }
}

// Check for pending payments and create notifications
export async function checkPendingPayments(organizationId?: string): Promise<void> {
  try {
    const constraints: any[] = [where('status', '==', 'Pending')];
    if (organizationId) {
      constraints.push(where('organizationId', '==', organizationId));
    }
    const paymentsQuery = query(
      collection(db, 'transactions'),
      ...constraints
    );
    const snapshot = await getDocs(paymentsQuery);
    
    for (const docSnap of snapshot.docs) {
      const transaction = { id: docSnap.id, ...docSnap.data() } as any;
      
      // Check if notification already exists
      const notifQuery = query(
        collection(db, 'notifications'),
        where('transactionId', '==', transaction.id),
        where('type', '==', 'payment-pending'),
        where('read', '==', false)
      );
      
      const existingNotifs = await getDocs(notifQuery);
      
      if (existingNotifs.empty) {
        await createNotification({
          type: 'payment-pending',
          title: 'Payment Pending',
          message: `Payment of ₹${transaction.amount.toLocaleString()} from ${transaction.clientName} is pending confirmation.`,
          severity: 'warning',
          transactionId: transaction.id,
          orderId: transaction.orderId,
          organizationId: transaction.organizationId,
          actionRequired: true,
          actionUrl: '/dashboard/payments',
        });
      }
    }
  } catch (error) {
    console.error('Error checking pending payments:', error);
  }
}

// Check for failed payments
export async function checkFailedPayments(organizationId?: string): Promise<void> {
  try {
    const constraints: any[] = [where('status', '==', 'Failed')];
    if (organizationId) {
      constraints.push(where('organizationId', '==', organizationId));
    }
    const paymentsQuery = query(
      collection(db, 'transactions'),
      ...constraints
    );
    const snapshot = await getDocs(paymentsQuery);
    
    for (const docSnap of snapshot.docs) {
      const transaction = { id: docSnap.id, ...docSnap.data() } as any;
      
      const notifQuery = query(
        collection(db, 'notifications'),
        where('transactionId', '==', transaction.id),
        where('type', '==', 'payment-failed'),
        where('read', '==', false)
      );
      
      const existingNotifs = await getDocs(notifQuery);
      
      if (existingNotifs.empty) {
        await createNotification({
          type: 'payment-failed',
          title: 'Payment Failed',
          message: `Payment of ₹${transaction.amount.toLocaleString()} from ${transaction.clientName} has failed. Order: ${transaction.orderId}`,
          severity: 'critical',
          transactionId: transaction.id,
          orderId: transaction.orderId,
          organizationId: transaction.organizationId,
          actionRequired: true,
          actionUrl: '/dashboard/payments',
        });
      }
    }
  } catch (error) {
    console.error('Error checking failed payments:', error);
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const notifRef = doc(db, 'notifications', notificationId);
    await updateDoc(notifRef, { read: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(organizationId?: string): Promise<void> {
  try {
    const constraints = [where('read', '==', false)];
    if (organizationId) {
      constraints.push(where('organizationId', '==', organizationId));
    }
    
    const notifQuery = query(
      collection(db, 'notifications'),
      ...constraints
    );
    const snapshot = await getDocs(notifQuery);
    
    const updatePromises = snapshot.docs.map(docSnap => 
      updateDoc(doc(db, 'notifications', docSnap.id), { read: true })
    );
    
    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

// Send email notification via API
export async function sendEmailNotification(
  email: string,
  notification: Omit<Notification, 'id' | 'createdAt' | 'read'>
): Promise<void> {
  try {
    const response = await fetch('/api/send-notification-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, notification }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to send email notification');
    }
  } catch (error) {
    console.error('Error sending email notification:', error);
    throw error;
  }
}

// Run all checks
export async function runAllNotificationChecks(organizationId?: string): Promise<void> {
  await Promise.all([
    checkInventoryLevels(organizationId),
    checkPendingPayments(organizationId),
    checkFailedPayments(organizationId),
  ]);
}
