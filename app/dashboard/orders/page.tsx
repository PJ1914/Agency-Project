'use client';

import { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Order } from '@/types/order.d';
import { DataTable } from '@/components/Table';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, FileText } from 'lucide-react';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import { addDocument, updateDocument, deleteDocument } from '@/lib/firestore';
import { AddOrderModal } from '@/components/AddOrderModal';
import { EditOrderModal } from '@/components/EditOrderModal';
import { createNotification } from '@/lib/notifications';
import { deductInventory, restoreInventory, autoCreateShipment } from '@/lib/inventoryManager';
import { generateInvoicePDF } from '@/lib/invoiceGenerator';

export default function OrdersPage() {
  const { orders, ordersLoading, ordersError, refetchOrders } = useData();
  const { currentOrganization } = useOrganization();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const handleAdd = async (order: Partial<Order>) => {
    try {
      if (!currentOrganization?.id) {
        alert('No organization selected');
        return;
      }

      // Check and deduct inventory
      const deductResult = await deductInventory(
        order.productId!,
        order.quantity!,
        order.orderId!
      );
      
      if (!deductResult.success) {
        alert(deductResult.message);
        return;
      }
      
      // Add order with inventory deducted flag and organizationId
      const newOrder = {
        ...order,
        inventoryDeducted: true,
        organizationId: currentOrganization.id,
      };
      
      await addDocument('orders', newOrder);
      
      // Create notification for new order
      await createNotification({
        type: 'order-created',
        title: 'New Order Created',
        message: `Order ${order.orderId} for ${order.clientName} created. ${order.productName}: ${order.quantity} units. Inventory updated. New stock: ${deductResult.currentStock} units.`,
        severity: 'success',
        orderId: order.orderId,
        actionRequired: false,
        actionUrl: '/dashboard/orders',
      });
      
      refetchOrders();
    } catch (error) {
      console.error('Error adding order:', error);
      throw error;
    }
  };

  const handleEdit = (order: Order) => {
    setSelectedOrder(order);
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (id: string, updatedOrder: Partial<Order>) => {
    try {
      const originalOrder = orders.find(o => o.id === id);
      
      // Check if status changed to 'shipped'
      if (originalOrder && updatedOrder.status === 'shipped' && originalOrder.status !== 'shipped') {
        // Auto-create shipment
        const shipmentId = await autoCreateShipment({
          ...originalOrder,
          ...updatedOrder
        });
        
        if (shipmentId) {
          updatedOrder.shipmentId = shipmentId;
        }
      }
      
      // Check if status changed to 'cancelled'
      if (originalOrder && updatedOrder.status === 'cancelled' && originalOrder.inventoryDeducted) {
        // Restore inventory
        const restoreResult = await restoreInventory(
          originalOrder.productId!,
          originalOrder.quantity,
          originalOrder.orderId
        );
        
        if (restoreResult.success) {
          await createNotification({
            type: 'order-created',
            title: 'Order Cancelled - Inventory Restored',
            message: `Order ${originalOrder.orderId} cancelled. ${originalOrder.quantity} units of ${originalOrder.productName} restored to inventory.`,
            severity: 'info',
            orderId: originalOrder.orderId,
            actionRequired: false,
            actionUrl: '/dashboard/orders',
          });
        }
      }
      
      await updateDocument('orders', id, updatedOrder);
      refetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this order?')) {
      await deleteDocument('orders', id);
      refetchOrders();
    }
  };

  const handleGenerateInvoice = async (order: Order) => {
    try {
      if (!currentOrganization) {
        alert('Organization not found');
        return;
      }

      // Get invoice settings from organization
      const invoiceConfig = currentOrganization.settings?.invoice || {};

      // Prepare invoice data
      const invoiceData = {
        invoiceNumber: order.orderId,
        date: formatDate(order.orderDate),
        customerName: order.clientName,
        customerAddress: order.country,
        salesMan: 'JAGAN HM', // You can make this dynamic
        items: [
          {
            product: order.productName,
            hsn: '96190040', // You can store this in order or product
            mrp: order.amount / order.quantity,
            qty: order.quantity,
            free: 0,
            rate: order.amount / order.quantity,
            dis: 0,
            dis2: 0,
            sgst: 2.5,
            cgst: 2.5,
            amount: order.amount
          }
        ],
        organizationName: currentOrganization.name,
        organizationAddress: currentOrganization.address || 'Address not set',
        organizationPhone: currentOrganization.phone || 'Phone not set',
        organizationEmail: currentOrganization.email || 'Email not set',
        organizationGSTIN: invoiceConfig.gstin || (currentOrganization as any).gstin || 'GSTIN not set',
        footerText: invoiceConfig.footerText
      };

      // Generate PDF
      const pdfBlob = await generateInvoicePDF(invoiceData);
      
      // Download PDF
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${order.orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Create notification
      await createNotification({
        title: 'Invoice Generated',
        message: `Invoice ${order.orderId} has been generated successfully`,
        type: 'order-created',
        severity: 'info',
        actionRequired: false
      });
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Failed to generate invoice. Please try again.');
    }
  };

  const columns = [
    { header: 'Order ID', accessor: 'orderId' as keyof Order },
    { header: 'Client', accessor: 'clientName' as keyof Order },
    { header: 'Product', accessor: 'productName' as keyof Order },
    { header: 'Country', accessor: 'country' as keyof Order },
    { 
      header: 'Quantity', 
      accessor: ((order: Order) => `${order.quantity} units`) as any 
    },
    { 
      header: 'Amount', 
      accessor: ((order: Order) => formatCurrency(order.amount)) as any 
    },
    { 
      header: 'Status', 
      accessor: ((order: Order) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
          {order.status}
        </span>
      )) as any 
    },
    { 
      header: 'Order Date', 
      accessor: ((order: Order) => formatDate(order.orderDate)) as any 
    },
    {
      header: 'Actions',
      accessor: ((order: Order) => (
        <div className="flex items-center space-x-1 sm:space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleGenerateInvoice(order)}
            className="hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20 p-1 sm:p-2"
            title="Generate Invoice"
          >
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(order)}
            className="hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 p-1 sm:p-2"
          >
            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(order.id!)}
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Orders</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-500 dark:text-gray-400 mt-1">Manage and track all export orders</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center justify-center space-x-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          <span>Add Order</span>
        </Button>
      </div>

      {ordersLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Loading orders...</div>
        </div>
      ) : ordersError ? (
        <div className="flex flex-col items-center justify-center py-8 sm:py-12 space-y-3 sm:space-y-4 px-3 sm:px-0">
          <div className="text-red-600 dark:text-red-400 text-center">
            <p className="font-semibold text-base sm:text-lg">⚠️ Permission Denied</p>
            <p className="text-xs sm:text-sm mt-2">Firestore security rules need to be deployed.</p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 sm:p-4 max-w-2xl w-full">
            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mb-2"><strong>Quick Fix:</strong></p>
            <ol className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
              <li>Go to <a href="https://console.firebase.google.com/project/huggies-9f6e1/firestore/rules" target="_blank" className="text-blue-600 underline break-all">Firebase Console → Firestore Rules</a></li>
              <li>Click &quot;Rules&quot; tab</li>
              <li className="break-all">Paste: <code className="bg-gray-100 dark:bg-gray-700 px-1 text-xs">allow read, write: if request.auth != null;</code></li>
              <li>Click &quot;Publish&quot;</li>
              <li>Refresh this page</li>
            </ol>
          </div>
          <Button onClick={() => refetchOrders()} variant="outline" className="w-full sm:w-auto">
            Try Again
          </Button>
        </div>
      ) : (
        <DataTable data={orders} columns={columns} />
      )}

      <AddOrderModal 
        open={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={handleAdd}
      />

      <EditOrderModal 
        open={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        onUpdate={handleUpdate}
        order={selectedOrder}
      />
    </div>
  );
}
