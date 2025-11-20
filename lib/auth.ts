import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  UserCredential,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export const authService = {
  // Sign in with email and password
  async signIn(email: string, password: string): Promise<UserCredential> {
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  },

  // Sign out
  async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },

  // Get current user
  getCurrentUser(): User | null {
    return auth.currentUser;
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return auth.currentUser !== null;
  },
};

/**
 * Check if a user is a super admin
 * Super admins have access to all organizations and admin features
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  try {
    // Check in appUsers collection first (primary)
    const appUserRef = doc(db, 'appUsers', userId);
    const appUserDoc = await getDoc(appUserRef);
    
    if (appUserDoc.exists()) {
      const data = appUserDoc.data();
      return data.isSuperAdmin === true || data.role === 'super-admin';
    }
    
    // Fallback to users collection
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      return data.isSuperAdmin === true || data.role === 'super-admin';
    }
    
    return false;
  } catch (error) {
    console.error('Error checking super admin status:', error);
    return false;
  }
}

/**
 * Check if a user has admin privileges (super-admin or admin role)
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    // Check in appUsers collection first
    const appUserRef = doc(db, 'appUsers', userId);
    const appUserDoc = await getDoc(appUserRef);
    
    if (appUserDoc.exists()) {
      const data = appUserDoc.data();
      return data.isSuperAdmin === true || 
             data.role === 'super-admin' || 
             data.role === 'admin';
    }
    
    // Fallback to users collection
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      return data.isSuperAdmin === true || 
             data.role === 'super-admin' || 
             data.role === 'admin';
    }
    
    return false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Get user role from Firestore
 */
export async function getUserRole(userId: string): Promise<string | null> {
  try {
    // Check in appUsers collection first
    const appUserRef = doc(db, 'appUsers', userId);
    const appUserDoc = await getDoc(appUserRef);
    
    if (appUserDoc.exists()) {
      const data = appUserDoc.data();
      if (data.isSuperAdmin) return 'super-admin';
      return data.role || 'user';
    }
    
    // Fallback to users collection
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (data.isSuperAdmin) return 'super-admin';
      return data.role || 'user';
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}
