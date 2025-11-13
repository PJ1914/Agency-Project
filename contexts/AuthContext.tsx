'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Update last login
        const userRef = doc(db, 'users', firebaseUser.uid);
        await setDoc(userRef, {
          lastLoginAt: serverTimestamp()
        }, { merge: true });
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Check if user exists in appUsers collection
      const appUserRef = doc(db, 'appUsers', user.uid);
      const appUserDoc = await getDoc(appUserRef);
      
      if (appUserDoc.exists()) {
        const appUserData = appUserDoc.data();
        
        // Check if user is active
        if (appUserData.status === 'inactive') {
          await firebaseSignOut(auth);
          throw new Error('Your account is inactive. Please contact the administrator.');
        }
        
        // Update last login in appUsers collection
        await setDoc(appUserRef, {
          lastLoginAt: serverTimestamp()
        }, { merge: true });
      } else {
        // Check by email if UID doesn't match (for legacy users)
        const appUsersQuery = query(
          collection(db, 'appUsers'),
          where('email', '==', user.email)
        );
        const appUsersSnapshot = await getDocs(appUsersQuery);
        
        if (!appUsersSnapshot.empty) {
          const appUserDoc = appUsersSnapshot.docs[0];
          const appUserData = appUserDoc.data();
          
          // Check if user is active
          if (appUserData.status === 'inactive') {
            await firebaseSignOut(auth);
            throw new Error('Your account is inactive. Please contact the administrator.');
          }
          
          // Update the document with UID and last login
          await setDoc(doc(db, 'appUsers', appUserDoc.id), {
            uid: user.uid,
            lastLoginAt: serverTimestamp()
          }, { merge: true });
        } else {
          // If not in appUsers, check if they're in users collection (for backward compatibility)
          const userRef = doc(db, 'users', user.uid);
          await setDoc(userRef, {
            lastLoginAt: serverTimestamp()
          }, { merge: true });
        }
      }
    } catch (error: any) {
      // Provide user-friendly error messages
      if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email address.');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password. Please try again.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address format.');
      } else if (error.code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password.');
      } else {
        throw error;
      }
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update profile
    await updateProfile(user, { displayName: name });

    // Create user document
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      name: name,
      emailVerified: user.emailVerified,
      organizations: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    localStorage.removeItem('currentOrganizationId');
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
