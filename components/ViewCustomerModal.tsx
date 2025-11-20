'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Customer, CustomerNote } from '@/types/customer.d';
import { Order } from '@/types/order.d';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  CreditCard, 
  Award,
  TrendingUp,
  FileText,
  Calendar,
  Edit,
  Plus,
  DollarSign
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface ViewCustomerModalProps {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
  onEdit: (customer: Customer) => void;
  onCreateOrder?: (customer: Customer) => void;
}

export function ViewCustomerModal({ open, onClose, customer, onEdit, onCreateOrder }: ViewCustomerModalProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [purchaseHistory, setPurchaseHistory] = useState<Order[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [noteCategory, setNoteCategory] = useState<'general' | 'complaint' | 'inquiry' | 'feedback' | 'follow-up'>('general');
  const [isAddingNote, setIsAddingNote] = useState(false);

  const handleCreateOrder = () => {
    if (customer && onCreateOrder) {
      onCreateOrder(customer);
      onClose();
    }
  };

  useEffect(() => {
    if (customer && open) {
      loadPurchaseHistory();
    }
  }, [customer, open]);

  const loadPurchaseHistory = async () => {
    if (!customer) return;
    
    setIsLoadingHistory(true);
    try {
      const ordersRef = collection(db, 'orders');
      // Query by customerId (primary) or fallback to clientName for old orders
      const queries = [
        query(
          ordersRef,
          where('organizationId', '==', customer.organizationId),
          where('customerId', '==', customer.id)
        )
      ];

      // Also check for orders with matching clientName (for backwards compatibility)
      queries.push(
        query(
          ordersRef,
          where('organizationId', '==', customer.organizationId),
          where('clientName', '==', customer.name)
        )
      );

      // Execute both queries and merge results
      const results = await Promise.all(queries.map(q => getDocs(q)));
      const orderMap = new Map<string, Order>();
      
      results.forEach(querySnapshot => {
        querySnapshot.docs.forEach(doc => {
          if (!orderMap.has(doc.id)) {
            orderMap.set(doc.id, { id: doc.id, ...doc.data() } as Order);
          }
        });
      });

      const orders = Array.from(orderMap.values());
      orders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
      setPurchaseHistory(orders);
    } catch (error) {
      console.error('Error loading purchase history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !customer || !user) return;

    setIsAddingNote(true);
    try {
      const note: CustomerNote = {
        id: Date.now().toString(),
        content: newNote,
        category: noteCategory,
        createdAt: new Date(),
        createdBy: user.uid,
        createdByName: user.displayName || user.email || 'Unknown'
      };

      const updatedNotes = [...(customer.notes || []), note];
      
      // Update in Firestore (you'll need to implement this in your orders page)
      const customersRef = collection(db, 'customers');
      const docRef = await addDoc(customersRef, {
        ...customer,
        notes: updatedNotes,
        updatedAt: new Date()
      });

      setNewNote('');
      setNoteCategory('general');
      alert('✅ Note added successfully!');
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Failed to add note');
    } finally {
      setIsAddingNote(false);
    }
  };

  if (!customer) return null;

  const getCategoryColor = (category: string) => {
    const colors = {
      general: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      complaint: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      inquiry: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      feedback: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'follow-up': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    };
    return colors[category as keyof typeof colors] || colors.general;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">{customer.name}</DialogTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Customer ID: <span className="font-mono font-semibold">{customer.customerId}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateOrder} size="sm" variant="default" className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Order
              </Button>
              <Button onClick={() => onEdit(customer)} size="sm" variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">Purchase History</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Orders</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{customer.totalOrders}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Purchases</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(customer.totalPurchases)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Outstanding</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(customer.outstandingBalance)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Loyalty Points</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    {customer.loyaltyPoints}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Phone:</span>
                    <span>{customer.phone}</span>
                  </div>
                  {customer.alternatePhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">Alt Phone:</span>
                      <span>{customer.alternatePhone}</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">Email:</span>
                      <span>{customer.email}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  {customer.companyName && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">Company:</span>
                      <span>{customer.companyName}</span>
                    </div>
                  )}
                  {(customer.city || customer.country) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">Location:</span>
                      <span>{[customer.city, customer.country].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Business & Financial Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Business Details */}
              {(customer.gstNumber || customer.panNumber) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Business Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {customer.gstNumber && (
                      <div>
                        <span className="font-medium">GST Number:</span>
                        <span className="ml-2 font-mono">{customer.gstNumber}</span>
                      </div>
                    )}
                    {customer.panNumber && (
                      <div>
                        <span className="font-medium">PAN Number:</span>
                        <span className="ml-2 font-mono">{customer.panNumber}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Financial Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Financial Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {customer.creditLimit && customer.creditLimit > 0 && (
                    <div>
                      <span className="font-medium">Credit Limit:</span>
                      <span className="ml-2">{formatCurrency(customer.creditLimit)}</span>
                    </div>
                  )}
                  {customer.discountPercentage > 0 && (
                    <div>
                      <span className="font-medium">Discount:</span>
                      <span className="ml-2 text-green-600 dark:text-green-400">{customer.discountPercentage}%</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Avg Order Value:</span>
                    <span className="ml-2">
                      {customer.totalOrders > 0 
                        ? formatCurrency(customer.totalPurchases / customer.totalOrders)
                        : formatCurrency(0)
                      }
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Activity Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Customer Since</span>
                  <div className="font-medium">{formatDate(customer.createdAt)}</div>
                </div>
                {customer.firstOrderDate && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">First Order</span>
                    <div className="font-medium">{formatDate(customer.firstOrderDate)}</div>
                  </div>
                )}
                {customer.lastOrderDate && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Last Order</span>
                    <div className="font-medium">{formatDate(customer.lastOrderDate)}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Purchase History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Purchase History</CardTitle>
                <CardDescription>All orders placed by this customer</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingHistory ? (
                  <div className="text-center py-8 text-gray-500">Loading purchase history...</div>
                ) : purchaseHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No orders found</div>
                ) : (
                  <div className="space-y-3">
                    {purchaseHistory.map((order) => (
                      <div key={order.id} className="border dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                                {order.orderId}
                              </span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {formatDate(order.orderDate)}
                              </span>
                            </div>
                            <div className="mt-1 text-sm">
                              {order.productName} × {order.quantity}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-lg">{formatCurrency(order.amount)}</div>
                            <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                              order.status === 'delivered' 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : order.status === 'shipped'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>
                              {order.status}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-4">
            {/* Add Note Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add New Note
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <select
                    value={noteCategory}
                    onChange={(e) => setNoteCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent bg-white dark:bg-gray-800"
                  >
                    <option value="general">General</option>
                    <option value="complaint">Complaint</option>
                    <option value="inquiry">Inquiry</option>
                    <option value="feedback">Feedback</option>
                    <option value="follow-up">Follow-up</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Note</label>
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Write a note about this customer..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent bg-white dark:bg-gray-800"
                  />
                </div>
                <Button onClick={handleAddNote} disabled={isAddingNote || !newNote.trim()}>
                  {isAddingNote ? 'Adding...' : 'Add Note'}
                </Button>
              </CardContent>
            </Card>

            {/* Existing Notes */}
            <Card>
              <CardHeader>
                <CardTitle>All Notes ({customer.notes?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {!customer.notes || customer.notes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No notes yet</div>
                ) : (
                  <div className="space-y-3">
                    {customer.notes.map((note) => (
                      <div key={note.id} className="border dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(note.category)}`}>
                            {note.category}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(note.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{note.content}</p>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          By: {note.createdByName || 'Unknown'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
