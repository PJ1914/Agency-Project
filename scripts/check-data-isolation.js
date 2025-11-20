/**
 * Data Isolation Checker - Run this in browser console to verify organization data isolation
 * 
 * This script checks if any data is leaking between organizations
 * 
 * INSTRUCTIONS:
 * 1. Log in to your app
 * 2. Switch to one organization (e.g., "Balaji Kiranam")
 * 3. Open DevTools Console (F12)
 * 4. Copy and paste this entire script
 * 5. Press Enter
 * 6. Check the results
 * 7. Switch to another organization and run again to verify
 */

(async function checkDataIsolation() {
  console.log('🔍 Starting Data Isolation Check...\n');
  
  try {
    // Get Firebase instances
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const { db, auth } = await import('@/lib/firebase');
    
    const user = auth.currentUser;
    if (!user) {
      console.error('❌ No user logged in');
      return;
    }
    
    console.log('👤 Current User:', user.email);
    
    // Get current organization from localStorage
    const currentOrgId = localStorage.getItem('currentOrganizationId');
    if (!currentOrgId) {
      console.error('❌ No organization selected');
      return;
    }
    
    console.log('🏢 Current Organization ID:', currentOrgId);
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Check each collection
    const collections = ['orders', 'inventory', 'customers', 'shipments', 'transactions'];
    
    for (const collectionName of collections) {
      console.log(`📋 Checking ${collectionName}...`);
      
      // Get all documents
      const allQuery = collection(db, collectionName);
      const allSnapshot = await getDocs(allQuery);
      
      // Get org-filtered documents
      const orgQuery = query(
        collection(db, collectionName),
        where('organizationId', '==', currentOrgId)
      );
      const orgSnapshot = await getDocs(orgQuery);
      
      // Get documents without organizationId
      const noOrgDocs = allSnapshot.docs.filter(doc => !doc.data().organizationId);
      
      // Get documents from OTHER organizations
      const otherOrgDocs = allSnapshot.docs.filter(doc => {
        const orgId = doc.data().organizationId;
        return orgId && orgId !== currentOrgId;
      });
      
      console.log(`  Total documents: ${allSnapshot.size}`);
      console.log(`  ✅ Your org documents: ${orgSnapshot.size}`);
      console.log(`  ⚠️  Missing organizationId: ${noOrgDocs.length}`);
      console.log(`  ❌ Other org documents: ${otherOrgDocs.length}`);
      
      if (noOrgDocs.length > 0) {
        console.warn(`  ⚠️  WARNING: ${noOrgDocs.length} ${collectionName} without organizationId!`);
        console.log('     These documents:', noOrgDocs.slice(0, 3).map(d => ({
          id: d.id,
          ...d.data()
        })));
      }
      
      if (otherOrgDocs.length > 0) {
        console.error(`  ❌ ERROR: Seeing ${otherOrgDocs.length} ${collectionName} from other orgs!`);
        console.log('     Sample:', otherOrgDocs.slice(0, 2).map(d => ({
          id: d.id,
          organizationId: d.data().organizationId
        })));
      }
      
      console.log('');
    }
    
    console.log('='.repeat(60));
    console.log('\n✅ Data Isolation Check Complete!\n');
    
    // Summary
    console.log('📊 SUMMARY:');
    console.log('If you see:');
    console.log('  ✅ Only "Your org documents" - PERFECT! Data is isolated');
    console.log('  ⚠️  "Missing organizationId" - Need to add organizationId to old data');
    console.log('  ❌ "Other org documents" - BUG! Data is leaking between orgs');
    
  } catch (error) {
    console.error('❌ Error during check:', error);
  }
})();
