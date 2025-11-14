import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where,
  orderBy,
  limit,
  Timestamp 
} from 'firebase/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || '');

// Define the structure for AI action results
export interface AIActionResult {
  success: boolean;
  action: 'create' | 'read' | 'update' | 'delete' | 'none';
  entity: 'order' | 'inventory' | 'customer' | 'invoice' | 'supplier' | 'none';
  message: string;
  data?: any;
  requiresConfirmation?: boolean;
  confirmationData?: any;
}

// Extract intent and entities from user message
async function parseUserIntent(message: string, organizationId: string): Promise<any> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const prompt = `
You are an AI intent parser for a business management system. Analyze the user's message and extract:
1. The ACTION they want to perform (create, read, update, delete, or none)
2. The ENTITY they want to act on (order, inventory, customer, invoice, supplier, or none)
3. The DATA/PARAMETERS for the action

User Message: "${message}"

Examples:
- "Add a new product called iPhone 15 with price 999 and stock 50" → action: create, entity: inventory
- "Show me all orders from last week" → action: read, entity: order
- "Update customer John's email to john@example.com" → action: update, entity: customer
- "Delete product with ID abc123" → action: delete, entity: inventory
- "What is my total revenue?" → action: read, entity: none (analytical query)

Respond in valid JSON format only:
{
  "action": "create|read|update|delete|none",
  "entity": "order|inventory|customer|invoice|supplier|none",
  "parameters": {
    // Extract relevant fields based on entity type
  },
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

For inventory entity, extract: name, category, price, stock, minStock, sku, supplier, description
For customer entity, extract: name, email, phone, address, company
For order entity, extract: customerId, items, totalAmount, status, paymentStatus
For invoice entity, extract: invoiceNumber, customerId, items, amount, dueDate

Response (JSON only):`;

  const result = await model.generateContent(prompt);
  const response = await result.response.text();
  
  // Extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  throw new Error('Failed to parse intent');
}

// CRUD Operations for Inventory
async function createInventoryItem(data: any, organizationId: string): Promise<any> {
  const inventoryData = {
    name: data.name,
    category: data.category || 'Uncategorized',
    price: parseFloat(data.price) || 0,
    stock: parseInt(data.stock) || 0,
    minStock: parseInt(data.minStock) || 10,
    sku: data.sku || `SKU-${Date.now()}`,
    supplier: data.supplier || 'Unknown',
    description: data.description || '',
    organizationId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const docRef = await addDoc(collection(db, 'inventory'), inventoryData);
  return { id: docRef.id, ...inventoryData };
}

async function updateInventoryItem(data: any, organizationId: string): Promise<any> {
  // Find the item by name, SKU, or ID
  const inventoryRef = collection(db, 'inventory');
  let q;

  if (data.id) {
    const docRef = doc(db, 'inventory', data.id);
    const updateData: any = { updatedAt: Timestamp.now() };
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.price !== undefined) updateData.price = parseFloat(data.price);
    if (data.stock !== undefined) updateData.stock = parseInt(data.stock);
    if (data.minStock !== undefined) updateData.minStock = parseInt(data.minStock);
    if (data.category !== undefined) updateData.category = data.category;
    if (data.supplier !== undefined) updateData.supplier = data.supplier;
    if (data.description !== undefined) updateData.description = data.description;

    await updateDoc(docRef, updateData);
    return { id: data.id, ...updateData };
  } else if (data.sku) {
    q = query(inventoryRef, where('organizationId', '==', organizationId), where('sku', '==', data.sku), limit(1));
  } else if (data.name) {
    q = query(inventoryRef, where('organizationId', '==', organizationId), where('name', '==', data.name), limit(1));
  } else {
    throw new Error('Must provide id, sku, or name to update item');
  }

  if (q) {
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref;
      const updateData: any = { updatedAt: Timestamp.now() };
      
      if (data.price !== undefined) updateData.price = parseFloat(data.price);
      if (data.stock !== undefined) updateData.stock = parseInt(data.stock);
      if (data.minStock !== undefined) updateData.minStock = parseInt(data.minStock);
      
      await updateDoc(docRef, updateData);
      return { id: snapshot.docs[0].id, ...updateData };
    }
  }
  
  throw new Error('Item not found');
}

async function deleteInventoryItem(data: any, organizationId: string): Promise<any> {
  if (data.id) {
    await deleteDoc(doc(db, 'inventory', data.id));
    return { id: data.id };
  }
  
  throw new Error('Must provide item ID to delete');
}

async function readInventory(data: any, organizationId: string): Promise<any[]> {
  const inventoryRef = collection(db, 'inventory');
  let q = query(inventoryRef, where('organizationId', '==', organizationId));
  
  if (data.category) {
    q = query(q, where('category', '==', data.category));
  }
  
  if (data.lowStock) {
    // Filter for low stock items (client-side)
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((item: any) => item.stock <= item.minStock);
  }
  
  if (data.limit) {
    q = query(q, limit(parseInt(data.limit)));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// CRUD Operations for Customers
async function createCustomer(data: any, organizationId: string): Promise<any> {
  const customerData = {
    name: data.name,
    email: data.email || '',
    phone: data.phone || '',
    address: data.address || '',
    company: data.company || '',
    organizationId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    totalPurchases: 0,
    lastPurchaseDate: null,
  };

  const docRef = await addDoc(collection(db, 'customers'), customerData);
  return { id: docRef.id, ...customerData };
}

async function updateCustomer(data: any, organizationId: string): Promise<any> {
  const customersRef = collection(db, 'customers');
  let docToUpdate;

  if (data.id) {
    docToUpdate = doc(db, 'customers', data.id);
  } else if (data.email) {
    const q = query(customersRef, where('organizationId', '==', organizationId), where('email', '==', data.email), limit(1));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      docToUpdate = snapshot.docs[0].ref;
    }
  } else if (data.name) {
    const q = query(customersRef, where('organizationId', '==', organizationId), where('name', '==', data.name), limit(1));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      docToUpdate = snapshot.docs[0].ref;
    }
  }

  if (docToUpdate) {
    const updateData: any = { updatedAt: Timestamp.now() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.company !== undefined) updateData.company = data.company;

    await updateDoc(docToUpdate, updateData);
    return { ...updateData };
  }

  throw new Error('Customer not found');
}

async function readCustomers(data: any, organizationId: string): Promise<any[]> {
  const customersRef = collection(db, 'customers');
  let q = query(customersRef, where('organizationId', '==', organizationId));
  
  if (data.limit) {
    q = query(q, limit(parseInt(data.limit)));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// CRUD Operations for Orders
async function createOrder(data: any, organizationId: string): Promise<any> {
  const orderData = {
    customerId: data.customerId,
    customerName: data.customerName || '',
    items: data.items || [],
    totalAmount: parseFloat(data.totalAmount) || 0,
    status: data.status || 'pending',
    paymentStatus: data.paymentStatus || 'unpaid',
    organizationId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const docRef = await addDoc(collection(db, 'orders'), orderData);
  
  // Update inventory stock for each item
  for (const item of orderData.items) {
    if (item.productId) {
      const productRef = doc(db, 'inventory', item.productId);
      const inventoryRef = collection(db, 'inventory');
      const q = query(inventoryRef, where('organizationId', '==', organizationId), where('name', '==', item.name), limit(1));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const product = snapshot.docs[0];
        const currentStock = product.data().stock || 0;
        await updateDoc(product.ref, {
          stock: currentStock - (item.quantity || 0),
          updatedAt: Timestamp.now()
        });
      }
    }
  }

  return { id: docRef.id, ...orderData };
}

async function updateOrder(data: any, organizationId: string): Promise<any> {
  if (!data.id) {
    throw new Error('Must provide order ID to update');
  }

  const docRef = doc(db, 'orders', data.id);
  const updateData: any = { updatedAt: Timestamp.now() };
  
  if (data.status !== undefined) updateData.status = data.status;
  if (data.paymentStatus !== undefined) updateData.paymentStatus = data.paymentStatus;
  if (data.totalAmount !== undefined) updateData.totalAmount = parseFloat(data.totalAmount);

  await updateDoc(docRef, updateData);
  return { id: data.id, ...updateData };
}

async function readOrders(data: any, organizationId: string): Promise<any[]> {
  const ordersRef = collection(db, 'orders');
  let q = query(ordersRef, where('organizationId', '==', organizationId), orderBy('createdAt', 'desc'));
  
  if (data.status) {
    q = query(ordersRef, where('organizationId', '==', organizationId), where('status', '==', data.status), orderBy('createdAt', 'desc'));
  }
  
  if (data.limit) {
    q = query(q, limit(parseInt(data.limit)));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Main function to process AI actions
export async function processAIAction(
  userMessage: string,
  organizationId: string
): Promise<AIActionResult> {
  try {
    // Parse user intent
    const intent = await parseUserIntent(userMessage, organizationId);
    
    console.log('Parsed Intent:', intent);

    // If confidence is low, ask for clarification
    if (intent.confidence < 0.6) {
      return {
        success: false,
        action: 'none',
        entity: 'none',
        message: `I'm not quite sure what you want me to do. ${intent.reasoning}. Could you please rephrase your request?`
      };
    }

    // If no action is needed (just a question)
    if (intent.action === 'none') {
      return {
        success: true,
        action: 'none',
        entity: 'none',
        message: 'This seems like a question. Let me help you with that.',
        data: intent
      };
    }

    let result;
    let actionMessage = '';

    // Execute the appropriate CRUD operation
    switch (intent.entity) {
      case 'inventory':
        if (intent.action === 'create') {
          result = await createInventoryItem(intent.parameters, organizationId);
          actionMessage = `✅ Successfully created inventory item: ${result.name} (SKU: ${result.sku})`;
        } else if (intent.action === 'update') {
          result = await updateInventoryItem(intent.parameters, organizationId);
          actionMessage = `✅ Successfully updated inventory item`;
        } else if (intent.action === 'delete') {
          // Require confirmation for delete
          return {
            success: false,
            action: 'delete',
            entity: 'inventory',
            message: `⚠️ Are you sure you want to delete this item? This action cannot be undone.`,
            requiresConfirmation: true,
            confirmationData: intent.parameters
          };
        } else if (intent.action === 'read') {
          result = await readInventory(intent.parameters, organizationId);
          actionMessage = `📦 Found ${result.length} inventory item(s)`;
        }
        break;

      case 'customer':
        if (intent.action === 'create') {
          result = await createCustomer(intent.parameters, organizationId);
          actionMessage = `✅ Successfully created customer: ${result.name}`;
        } else if (intent.action === 'update') {
          result = await updateCustomer(intent.parameters, organizationId);
          actionMessage = `✅ Successfully updated customer`;
        } else if (intent.action === 'read') {
          result = await readCustomers(intent.parameters, organizationId);
          actionMessage = `👥 Found ${result.length} customer(s)`;
        }
        break;

      case 'order':
        if (intent.action === 'create') {
          result = await createOrder(intent.parameters, organizationId);
          actionMessage = `✅ Successfully created order #${result.id}`;
        } else if (intent.action === 'update') {
          result = await updateOrder(intent.parameters, organizationId);
          actionMessage = `✅ Successfully updated order`;
        } else if (intent.action === 'read') {
          result = await readOrders(intent.parameters, organizationId);
          actionMessage = `📋 Found ${result.length} order(s)`;
        }
        break;

      default:
        return {
          success: false,
          action: intent.action,
          entity: intent.entity,
          message: `I can't perform ${intent.action} operations on ${intent.entity} yet. Currently supported: inventory, customers, orders.`
        };
    }

    return {
      success: true,
      action: intent.action,
      entity: intent.entity,
      message: actionMessage,
      data: result
    };

  } catch (error) {
    console.error('Error processing AI action:', error);
    return {
      success: false,
      action: 'none',
      entity: 'none',
      message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
    };
  }
}

// Confirm and execute delete action
export async function confirmDeleteAction(
  entity: string,
  data: any,
  organizationId: string
): Promise<AIActionResult> {
  try {
    let result;
    let message = '';

    if (entity === 'inventory') {
      result = await deleteInventoryItem(data, organizationId);
      message = `✅ Successfully deleted inventory item`;
    } else {
      throw new Error(`Delete operation not supported for ${entity}`);
    }

    return {
      success: true,
      action: 'delete',
      entity: entity as any,
      message,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      action: 'delete',
      entity: entity as any,
      message: `❌ Error: ${error instanceof Error ? error.message : 'Failed to delete'}`
    };
  }
}
