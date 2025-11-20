/**
 * Data Migration Utility - Add organizationId to existing data
 * 
 * This utility helps migrate old data to include organizationId field
 * Run this once per organization to fix data isolation issues
 * 
 * INSTRUCTIONS:
 * 1. Log in to your app as super admin
 * 2. Select the organization you want to migrate data for
 * 3. Open DevTools Console (F12)
 * 4. Copy and paste this entire script
 * 5. It will ask for confirmation before proceeding
 * 6. Type 'YES' in the prompt to continue
 * 7. Wait for migration to complete
 * 8. Refresh the page
 */

import { collection, query, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

async function migrateOrganizationData() {
  console.log('🔧 Organization Data Migration Utility\n');
  
  // Get current organization from localStorage
  const currentOrgId = localStorage.getItem('currentOrganizationId');
  
  if (!currentOrgId) {
    console.error('❌ No organization selected! Please select an organization first.');
    return;
  }
  
  console.log('🏢 Current Organization ID:', currentOrgId);
  console.log('\n⚠️  WARNING: This will add organizationId to ALL documents without one.');
  console.log('   Make sure the correct organization is selected!\n');
  
  const confirmation = prompt('Type YES to continue migration:');
  
  if (confirmation !== 'YES') {
    console.log('❌ Migration cancelled');
    return;
  }
  
  console.log('\n🚀 Starting migration...\n');
  
  const collections = [
    'orders',
    'inventory', 
    'customers',
    'shipments',
    'transactions',
    'invoices',
    'notifications'
  ];
  
  let totalMigrated = 0;
  
  for (const collectionName of collections) {
    try {
      console.log(`📋 Migrating ${collectionName}...`);
      
      // Get all documents without organizationId
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      
      const docsToUpdate = snapshot.docs.filter(doc => !doc.data().organizationId);
      
      if (docsToUpdate.length === 0) {
        console.log(`  ✅ No migration needed for ${collectionName}`);
        continue;
      }
      
      console.log(`  Found ${docsToUpdate.length} documents to migrate`);
      
      // Use batched writes for better performance
      const batchSize = 500;
      const batches = [];
      
      for (let i = 0; i < docsToUpdate.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchDocs = docsToUpdate.slice(i, i + batchSize);
        
        batchDocs.forEach(docSnapshot => {
          const docRef = doc(db, collectionName, docSnapshot.id);
          batch.update(docRef, {
            organizationId: currentOrgId,
            migratedAt: new Date(),
            migratedBy: 'migration-script'
          });
        });
        
        batches.push(batch.commit());
      }
      
      await Promise.all(batches);
      
      totalMigrated += docsToUpdate.length;
      console.log(`  ✅ Migrated ${docsToUpdate.length} ${collectionName}`);
      
    } catch (error) {
      console.error(`  ❌ Error migrating ${collectionName}:`, error);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n🎉 Migration Complete!`);
  console.log(`✅ Total documents migrated: ${totalMigrated}`);
  console.log(`\n⚠️  IMPORTANT: Refresh the page to see updated data\n`);
}

// Export for use
window.migrateOrganizationData = migrateOrganizationData;

// Auto-run
migrateOrganizationData();
