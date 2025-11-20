/**
 * SIMPLE BROWSER CONSOLE SCRIPT - Set Super Admin
 * 
 * INSTRUCTIONS:
 * 1. Make sure you're logged in to the app
 * 2. Open browser DevTools (F12) 
 * 3. Go to Console tab
 * 4. Look for the log that says "Current user email: your-email@gmail.com"
 * 5. Copy and paste the ENTIRE code below into console
 * 6. Press Enter
 * 7. Wait for success message
 * 8. Sign out and sign back in
 */

// Copy from here ↓↓↓

import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

async function makeMeSuperAdmin() {
  const user = auth.currentUser;
  
  if (!user) {
    console.error('❌ Not logged in! Please log in first.');
    return;
  }
  
  console.log('👤 Setting super admin for:', user.email);
  console.log('🔑 UID:', user.uid);
  
  try {
    // Update appUsers collection
    const appUserRef = doc(db, 'appUsers', user.uid);
    await setDoc(appUserRef, {
      isSuperAdmin: true,
      role: 'super-admin',
      email: user.email,
      updatedAt: new Date()
    }, { merge: true });
    
    console.log('✅ SUCCESS! You are now a super admin!');
    console.log('⚠️  Please SIGN OUT and SIGN BACK IN');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

makeMeSuperAdmin();

// ↑↑↑ Copy to here
