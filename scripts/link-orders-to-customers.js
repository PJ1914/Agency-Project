/**
 * Script to link existing orders to customers
 * Matches orders with customers by clientName/clientPhone
 * 
 * Usage: node scripts/link-orders-to-customers.js <organizationId>
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function linkOrdersToCustomers(organizationId) {
  try {
    console.log(`\n🔗 Starting order-customer linking for organization: ${organizationId}\n`);

    // Get all customers for this organization
    const customersSnapshot = await db.collection('customers')
      .where('organizationId', '==', organizationId)
      .get();

    if (customersSnapshot.empty) {
      console.log('❌ No customers found for this organization');
      return;
    }

    // Create lookup maps
    const customersByName = new Map();
    const customersByPhone = new Map();
    const customersById = new Map();

    customersSnapshot.docs.forEach(doc => {
      const customer = { id: doc.id, ...doc.data() };
      customersById.set(doc.id, customer);
      customersByName.set(customer.name.toLowerCase().trim(), doc.id);
      if (customer.phone) {
        customersByPhone.set(customer.phone.replace(/\D/g, ''), doc.id);
      }
    });

    console.log(`📊 Found ${customersSnapshot.size} customers\n`);

    // Get all orders for this organization
    const ordersSnapshot = await db.collection('orders')
      .where('organizationId', '==', organizationId)
      .get();

    if (ordersSnapshot.empty) {
      console.log('❌ No orders found for this organization');
      return;
    }

    console.log(`📦 Found ${ordersSnapshot.size} orders\n`);

    let linked = 0;
    let alreadyLinked = 0;
    let notFound = 0;

    // Process each order
    for (const orderDoc of ordersSnapshot.docs) {
      const order = orderDoc.data();
      const orderId = orderDoc.id;

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
        await db.collection('orders').doc(orderId).update({
          customerId: matchedCustomerId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const customer = customersById.get(matchedCustomerId);
        console.log(`  ✅ Linked ${order.orderId} → ${customer.name} (${customer.customerId})`);
        linked++;
      } else {
        console.log(`  ⚠️  No match for ${order.orderId} (${order.clientName})`);
        notFound++;
      }
    }

    console.log(`\n✨ Linking complete!`);
    console.log(`   ✅ Linked: ${linked} orders`);
    console.log(`   ℹ️  Already linked: ${alreadyLinked} orders`);
    if (notFound > 0) {
      console.log(`   ⚠️  Not matched: ${notFound} orders`);
    }
    console.log('');

    // Now recalculate customer stats
    console.log('🔄 Recalculating customer stats...\n');
    
    for (const [customerId, customer] of customersById.entries()) {
      try {
        // Get all orders for this customer
        const customerOrdersSnapshot = await db.collection('orders')
          .where('customerId', '==', customerId)
          .where('organizationId', '==', organizationId)
          .where('status', '!=', 'cancelled')
          .get();

        const orders = customerOrdersSnapshot.docs.map(doc => doc.data());

        // Calculate stats
        const totalPurchases = orders.reduce((sum, order) => sum + (order.amount || 0), 0);
        const totalOrders = orders.length;
        const outstandingBalance = orders.reduce((sum, order) => sum + (order.outstandingAmount || 0), 0);
        const loyaltyPoints = Math.floor(totalPurchases / 100);

        // Determine type
        const VIP_THRESHOLD = 50000;
        let type = customer.type || 'new';
        if (totalPurchases >= VIP_THRESHOLD) {
          type = 'vip';
        } else if (totalOrders > 0 && type === 'new') {
          type = 'regular';
        }

        // Get dates
        const orderDates = orders
          .map(o => o.orderDate?.toDate ? o.orderDate.toDate() : new Date(o.orderDate))
          .sort((a, b) => a.getTime() - b.getTime());
        
        const firstOrderDate = orderDates.length > 0 ? orderDates[0] : null;
        const lastOrderDate = orderDates.length > 0 ? orderDates[orderDates.length - 1] : null;

        // Update customer
        await db.collection('customers').doc(customerId).update({
          totalPurchases,
          totalOrders,
          outstandingBalance,
          loyaltyPoints,
          type,
          firstOrderDate,
          lastOrderDate,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`  ✅ ${customer.name}: ${totalOrders} orders, ₹${totalPurchases.toFixed(2)}, ${loyaltyPoints} pts, ${type}`);
      } catch (error) {
        console.error(`  ❌ Error updating ${customer.name}:`, error.message);
      }
    }

    console.log('\n✅ All done!\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Get organization ID from command line
const organizationId = process.argv[2];

if (!organizationId) {
  console.error('❌ Usage: node scripts/link-orders-to-customers.js <organizationId>');
  console.error('\nExample: node scripts/link-orders-to-customers.js m73nIifvQkNY7h2tOVN5');
  process.exit(1);
}

// Run the linking
linkOrdersToCustomers(organizationId)
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
