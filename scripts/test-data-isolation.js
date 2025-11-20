/**
 * Quick Data Isolation Test
 * Run this in browser console after switching organizations
 */

console.log('🔍 QUICK DATA ISOLATION TEST\n');

// Get current organization
const currentOrgId = localStorage.getItem('currentOrganizationId');
console.log('📍 Current Organization ID:', currentOrgId);

// Check what the page is showing
console.log('\n📊 Expected behavior:');
console.log('  1. Console should show: "🔄 [usePaginatedData] inventory - Organization changed to: [org-id]"');
console.log('  2. Console should show: "📦 [usePaginatedData] Fetching inventory..."');
console.log('  3. Console should show: "✓ Applied organizationId filter: [org-id]"');
console.log('  4. Console should show fetched items with matching organizationId');
console.log('\n✅ If you see these logs, the fix is working!');
console.log('❌ If you see old data, check the logs above for errors');

console.log('\n🔄 Now switch to a different organization and watch the console...\n');
