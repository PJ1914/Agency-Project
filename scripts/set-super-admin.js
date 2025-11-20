/**
 * Browser Console Script to Set Super Admin
 * 
 * Instructions:
 * 1. Open your browser DevTools (F12)
 * 2. Go to Console tab
 * 3. Make sure you're logged in to your app
 * 4. Copy and paste this entire script
 * 5. Press Enter
 * 6. Sign out and sign back in
 */

(async function setSuperAdmin() {
  try {
    // Import Firebase functions from your app
    const { doc, updateDoc, setDoc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js');
    const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js');
    
    // Get current user
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.error('❌ No user is currently logged in. Please log in first.');
      return;
    }
    
    console.log('👤 Current user:', user.email);
    console.log('🔑 User UID:', user.uid);
    
    // Get Firestore instance from window (assuming your app exposes it)
    const db = window.db || auth.app.firestore();
    
    // Try to update appUsers collection
    const appUserRef = doc(db, 'appUsers', user.uid);
    const appUserDoc = await getDoc(appUserRef);
    
    if (appUserDoc.exists()) {
      console.log('📝 Found user in appUsers collection');
      await updateDoc(appUserRef, {
        isSuperAdmin: true,
        role: 'super-admin',
        updatedAt: new Date()
      });
      console.log('✅ Successfully updated appUsers collection');
    } else {
      console.log('📝 User not found in appUsers, creating entry...');
      await setDoc(appUserRef, {
        uid: user.uid,
        email: user.email,
        name: user.displayName || 'Admin User',
        isSuperAdmin: true,
        role: 'super-admin',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Successfully created appUsers entry with super admin role');
    }
    
    // Also try users collection as fallback
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      await updateDoc(userRef, {
        isSuperAdmin: true,
        role: 'super-admin',
        updatedAt: new Date()
      });
      console.log('✅ Also updated users collection');
    }
    
    console.log('');
    console.log('🎉 SUCCESS! You are now a super admin!');
    console.log('');
    console.log('⚠️  IMPORTANT: Sign out and sign back in for changes to take effect');
    console.log('   1. Click "Sign Out" button');
    console.log('   2. Log back in with the same credentials');
    console.log('   3. You should now see Admin and Organizations menu items');
    
  } catch (error) {
    console.error('❌ Error setting super admin:', error);
    console.log('');
    console.log('📋 Manual Steps:');
    console.log('1. Go to Firebase Console: https://console.firebase.google.com');
    console.log('2. Select your project');
    console.log('3. Go to Firestore Database');
    console.log('4. Find collection "appUsers"');
    console.log('5. Find your user document (use your UID from above)');
    console.log('6. Add field: isSuperAdmin (boolean) = true');
    console.log('7. Add field: role (string) = super-admin');
  }
})();
