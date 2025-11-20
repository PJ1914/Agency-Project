'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Edit, Mail, Lock, User, Building2, UserCheck, UserX } from 'lucide-react';
import { DataTable } from '@/components/Table';
import { isSuperAdmin } from '@/lib/auth';

interface User {
  id: string;
  email: string;
  password: string; // Temporary password
  name: string;
  organizationId: string;
  organizationName?: string;
  role: 'admin' | 'manager' | 'user';
  status: 'active' | 'inactive';
  createdAt: any;
  lastLogin?: any;
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    organizationId: '',
    role: 'user' as 'admin' | 'manager' | 'user',
  });

  // Check if user is super admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        router.push('/login');
        return;
      }
      
      const adminStatus = await isSuperAdmin(user.uid);
      setIsAdmin(adminStatus);
      
      if (!adminStatus) {
        alert('Access denied. Admin only.');
        router.push('/dashboard');
        return;
      }
    };
    
    checkAdmin();
  }, [user, router]);
  
  // Load data after admin check passes
  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load organizations
      const orgsSnapshot = await getDocs(collection(db, 'organizations'));
      const orgsData = orgsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as any[];
      setOrganizations(orgsData);

      // Load users
      const usersSnapshot = await getDocs(collection(db, 'appUsers'));
      const usersData = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        const org = orgsData.find((o: any) => o.id === data.organizationId);
        return {
          id: doc.id,
          ...data,
          organizationName: org?.name || 'Unknown',
        } as User;
      });
      setUsers(usersData);

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const handleGeneratePassword = () => {
    setFormData({
      ...formData,
      password: generatePassword(),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create user in Firebase Authentication first
      const auth = (await import('firebase/auth')).getAuth();
      const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
      
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const firebaseUser = userCredential.user;
      
      // Update display name
      await updateProfile(firebaseUser, {
        displayName: formData.name
      });

      // Add user to appUsers collection with the Firebase UID
      await addDoc(collection(db, 'appUsers'), {
        uid: firebaseUser.uid,
        email: formData.email,
        password: formData.password, // Store temporary password for reference
        name: formData.name,
        organizationId: formData.organizationId,
        role: formData.role,
        status: 'active',
        createdAt: serverTimestamp(),
        createdBy: user?.email,
      });

      alert(`User created successfully!\n\nEmail: ${formData.email}\nPassword: ${formData.password}\n\nPlease save these credentials and share with the user.`);
      
      setIsAddModalOpen(false);
      setFormData({
        email: '',
        password: '',
        name: '',
        organizationId: '',
        role: 'user',
      });
      loadData();
    } catch (error: any) {
      console.error('Error creating user:', error);
      alert(`Failed to create user: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await deleteDoc(doc(db, 'appUsers', userId));
      alert('User deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await updateDoc(doc(db, 'appUsers', userId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const columns = [
    { header: 'Name', accessor: 'name' as keyof User },
    { header: 'Email', accessor: 'email' as keyof User },
    { header: 'Password', accessor: 'password' as keyof User },
    { header: 'Organization', accessor: 'organizationName' as keyof User },
    { 
      header: 'Role', 
      accessor: ((user: User) => (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
          {user.role}
        </span>
      )) as any 
    },
    { 
      header: 'Status', 
      accessor: ((user: User) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          user.status === 'active' 
            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
        }`}>
          {user.status}
        </span>
      )) as any 
    },
    {
      header: 'Actions',
      accessor: ((user: User) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleStatus(user.id, user.status)}
            className="hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            {user.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDelete(user.id)}
            className="hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )) as any
    },
  ];

  if (!user || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Admin only area</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">User Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Create and manage user accounts (Admin Only)</p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Create User</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Generate credentials for a new user account
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Temporary Password</Label>
                <div className="flex space-x-2">
                  <Input
                    id="password"
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Generated password"
                    required
                  />
                  <Button type="button" onClick={handleGeneratePassword} variant="outline">
                    <Lock className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Click the lock icon to generate a secure password
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization">Organization</Label>
                <select
                  id="organization"
                  value={formData.organizationId}
                  onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  required
                >
                  <option value="">Select organization</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                >
                  <option value="user">User</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex space-x-2 pt-4">
                <Button type="submit" className="flex-1" disabled={loading}>
                  Create User
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-gray-100">All Users</CardTitle>
          <CardDescription className="dark:text-gray-400">
            {users.length} users registered in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading users...</div>
          ) : (
            <DataTable data={users} columns={columns} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
