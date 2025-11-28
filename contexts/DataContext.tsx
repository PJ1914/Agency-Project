'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useFirestore } from '@/hooks/useFirestore';
import { Order } from '@/types/order.d';
import { Transaction } from '@/types/transaction.d';
import { Shipment } from '@/types/shipment.d';
import { InventoryItem } from '@/types/inventory.d';
import { Notification } from '@/types/notification.d';
import { where } from 'firebase/firestore';
import { useOrganization } from './OrganizationContext';

interface DataContextType {
  // Orders
  orders: Order[];
  ordersLoading: boolean;
  ordersError: any;
  refetchOrders: () => void;
  
  // Transactions
  transactions: Transaction[];
  transactionsLoading: boolean;
  transactionsError: any;
  refetchTransactions: () => void;
  
  // Shipments
  shipments: Shipment[];
  shipmentsLoading: boolean;
  shipmentsError: any;
  refetchShipments: () => void;
  
  // Inventory
  inventory: InventoryItem[];
  inventoryLoading: boolean;
  inventoryError: any;
  refetchInventory: () => void;
  
  // Notifications
  notifications: Notification[];
  notificationsLoading: boolean;
  notificationsError: any;
  refetchNotifications: () => void;
  unreadNotificationsCount: number;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id;

  // Create constraints only when organizationId is available
  const ordersConstraints = organizationId ? [where('organizationId', '==', organizationId)] : undefined;
  const transactionsConstraints = organizationId ? [where('organizationId', '==', organizationId)] : undefined;
  const shipmentsConstraints = organizationId ? [where('organizationId', '==', organizationId)] : undefined;
  const inventoryConstraints = organizationId ? [where('organizationId', '==', organizationId)] : undefined;
  const notificationsConstraints = organizationId ? [where('organizationId', '==', organizationId)] : undefined;

  // Fetch data filtered by organization
  // CRITICAL: These queries MUST include organizationId filter to prevent data leakage
  const { 
    data: orders, 
    loading: ordersLoading, 
    error: ordersError, 
    refetch: refetchOrders 
  } = useFirestore<Order>('orders', ordersConstraints || []);

  const { 
    data: transactions, 
    loading: transactionsLoading, 
    error: transactionsError, 
    refetch: refetchTransactions 
  } = useFirestore<Transaction>('transactions', transactionsConstraints || []);

  const { 
    data: shipments, 
    loading: shipmentsLoading, 
    error: shipmentsError, 
    refetch: refetchShipments 
  } = useFirestore<Shipment>('shipments', shipmentsConstraints || []);

  const { 
    data: inventory, 
    loading: inventoryLoading, 
    error: inventoryError, 
    refetch: refetchInventory 
  } = useFirestore<InventoryItem>('inventory', inventoryConstraints || []);

  const { 
    data: notifications, 
    loading: notificationsLoading, 
    error: notificationsError, 
    refetch: refetchNotifications 
  } = useFirestore<Notification>('notifications', notificationsConstraints || []);

  // Filter unread notifications for count
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;
  
  // Log data loading for debugging
  useEffect(() => {
    if (organizationId) {
      console.log('📊 DataContext: Loading data for organization:', organizationId);
      console.log('  - Orders:', orders.length);
      console.log('  - Inventory:', inventory.length);
      console.log('  - Transactions:', transactions.length);
    }
  }, [organizationId, orders.length, inventory.length, transactions.length]);

  const value = {
    orders,
    ordersLoading,
    ordersError,
    refetchOrders,
    
    transactions,
    transactionsLoading,
    transactionsError,
    refetchTransactions,
    
    shipments,
    shipmentsLoading,
    shipmentsError,
    refetchShipments,
    
    inventory,
    inventoryLoading,
    inventoryError,
    refetchInventory,
    
    notifications,
    notificationsLoading,
    notificationsError,
    refetchNotifications,
    unreadNotificationsCount,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
