/**
 * Script to recalculate customer statistics from their orders
 * Run this to sync customer data with actual order history
 * 
 * Usage: node scripts/recalculate-customer-stats.js <organizationId>
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

const VIP_THRESHOLD = 50000;
const LOYALTY_POINTS_RATE = 100;

async function recalculateCustomerStats(organizationId) {
  try {
    console.log(`\n🔄 Starting customer stats recalculation for organization: ${organizationId}\n`);

    // Get all customers for this organization
    const customersSnapshot = await db.collection('customers')
      .where('organizationId', '==', organizationId)
      .get();

    if (customersSnapshot.empty) {
      console.log('❌ No customers found for this organization');
      return;
    }

    console.log(`📊 Found ${customersSnapshot.size} customers\n`);

    let updated = 0;
    let errors = 0;

    // Process each customer
    for (const customerDoc of customersSnapshot.docs) {
      const customerId = customerDoc.id;
      const customerData = customerDoc.data();

      try {
        console.log(`Processing: ${customerData.name} (${customerData.customerId})...`);

        // Fetch all orders for this customer (exclude cancelled)
        const ordersSnapshot = await db.collection('orders')
          .where('customerId', '==', customerId)
          .where('organizationId', '==', organizationId)
          .where('status', '!=', 'cancelled')
          .get();

        const orders = ordersSnapshot.docs.map(doc => doc.data());

        // Calculate totals
        const totalPurchases = orders.reduce((sum, order) => sum + (order.amount || 0), 0);
        const totalOrders = orders.length;
        const outstandingBalance = orders.reduce((sum, order) => sum + (order.outstandingAmount || 0), 0);
        const loyaltyPoints = Math.floor(totalPurchases / LOYALTY_POINTS_RATE);

        // Determine customer type
        let type = customerData.type || 'new';
        if (totalPurchases >= VIP_THRESHOLD) {
          type = 'vip';
        } else if (totalOrders > 0 && type === 'new') {
          type = 'regular';
        }

        // Get first and last order dates
        const orderDates = orders
          .map(o => o.orderDate?.toDate ? o.orderDate.toDate() : new Date(o.orderDate))
          .sort((a, b) => a.getTime() - b.getTime());
        
        const firstOrderDate = orderDates.length > 0 ? orderDates[0] : null;
        const lastOrderDate = orderDates.length > 0 ? orderDates[orderDates.length - 1] : null;

        // Update customer document
        await db.collection('customers').doc(customerId).update({
          totalPurchases: totalPurchases,
          totalOrders: totalOrders,
          outstandingBalance: outstandingBalance,
          loyaltyPoints: loyaltyPoints,
          type: type,
          firstOrderDate: firstOrderDate,
          lastOrderDate: lastOrderDate,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`  ✅ Updated: ${totalOrders} orders, ₹${totalPurchases.toFixed(2)} revenue, ${loyaltyPoints} points, type: ${type}`);
        updated++;

      } catch (error) {
        console.error(`  ❌ Error processing ${customerId}:`, error.message);
        errors++;
      }
    }

    console.log(`\n✨ Recalculation complete!`);
    console.log(`   ✅ Updated: ${updated} customers`);
    if (errors > 0) {
      console.log(`   ❌ Errors: ${errors} customers`);
    }
    console.log('');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Get organization ID from command line
const organizationId = process.argv[2];

if (!organizationId) {
  console.error('❌ Usage: node scripts/recalculate-customer-stats.js <organizationId>');
  console.error('\nExample: node scripts/recalculate-customer-stats.js bqmlXfHcT80Z0scT5Sn1');
  process.exit(1);
}

// Run the recalculation
recalculateCustomerStats(organizationId)
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
