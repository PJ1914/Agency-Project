'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { generateApiKey } from '@/lib/apiHelpers';
import type { ApiKey, ApiPermission } from '@/types/api';
import { FiCopy, FiTrash2, FiKey, FiRefreshCw, FiEye, FiEyeOff } from 'react-icons/fi';

export default function APIManagement({ organizationId }: { organizationId: string }) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  // Form state
  const [keyName, setKeyName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<ApiPermission[]>([]);
  const [rateLimit, setRateLimit] = useState(60);
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null);

  const availablePermissions: ApiPermission[] = [
    'orders:read',
    'orders:write',
    'inventory:read',
    'inventory:write',
    'customers:read',
    'customers:write',
    'transactions:read',
    'analytics:read',
    'webhooks:manage'
  ];

  useEffect(() => {
    fetchApiKeys();
  }, [organizationId]);

  const fetchApiKeys = async () => {
    try {
      const q = query(
        collection(db, 'apiKeys'),
        where('organizationId', '==', organizationId)
      );
      const snapshot = await getDocs(q);
      const keys = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ApiKey[];
      setApiKeys(keys);
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!keyName || selectedPermissions.length === 0) {
      alert('Please provide a name and select at least one permission');
      return;
    }

    try {
      const { key, secret } = generateApiKey();
      
      const expiryDate = expiresInDays 
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : undefined;

      const newApiKey: Omit<ApiKey, 'id'> = {
        organizationId,
        name: keyName,
        key,
        secret,
        permissions: selectedPermissions,
        status: 'active',
        rateLimit,
        usageCount: 0,
        expiresAt: expiryDate,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'apiKeys'), newApiKey);
      
      setApiKeys([...apiKeys, { id: docRef.id, ...newApiKey } as ApiKey]);
      
      // Reset form
      setKeyName('');
      setSelectedPermissions([]);
      setRateLimit(60);
      setExpiresInDays(null);
      setShowCreateModal(false);

      // Show the newly created key
      alert(`API Key Created!\n\nKey: ${key}\nSecret: ${secret}\n\nPlease save these securely. The secret will not be shown again.`);
    } catch (error) {
      console.error('Error creating API key:', error);
      alert('Failed to create API key');
    }
  };

  const revokeApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      await updateDoc(doc(db, 'apiKeys', keyId), {
        status: 'revoked',
        updatedAt: Timestamp.now()
      });

      setApiKeys(apiKeys.map(k => 
        k.id === keyId ? { ...k, status: 'revoked' as const } : k
      ));
    } catch (error) {
      console.error('Error revoking API key:', error);
      alert('Failed to revoke API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleKeys(newVisible);
  };

  const togglePermission = (permission: ApiPermission) => {
    if (selectedPermissions.includes(permission)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== permission));
    } else {
      setSelectedPermissions([...selectedPermissions, permission]);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading API keys...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">API Management</h2>
          <p className="text-gray-600 mt-1">Manage API keys for external integrations</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <FiKey /> Create API Key
        </button>
      </div>

      {/* API Keys List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">API Key</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Permissions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate Limit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {apiKeys.map((apiKey) => (
              <tr key={apiKey.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{apiKey.name}</div>
                  <div className="text-xs text-gray-500">
                    Created: {new Date(apiKey.createdAt instanceof Date ? apiKey.createdAt : (apiKey.createdAt as any).toDate()).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {visibleKeys.has(apiKey.id) ? apiKey.key : '••••••••••••••••'}
                    </code>
                    <button
                      onClick={() => toggleKeyVisibility(apiKey.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {visibleKeys.has(apiKey.id) ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(apiKey.key)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <FiCopy size={16} />
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {apiKey.permissions.slice(0, 2).map(p => (
                      <span key={p} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        {p}
                      </span>
                    ))}
                    {apiKey.permissions.length > 2 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        +{apiKey.permissions.length - 2}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {apiKey.rateLimit}/min
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {apiKey.usageCount || 0} requests
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    apiKey.status === 'active' ? 'bg-green-100 text-green-800' :
                    apiKey.status === 'revoked' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {apiKey.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {apiKey.status === 'active' && (
                    <button
                      onClick={() => revokeApiKey(apiKey.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {apiKeys.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No API keys created yet. Click &quot;Create API Key&quot; to get started.
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Create New API Key</h3>
              
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Key Name *
                  </label>
                  <input
                    type="text"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    placeholder="e.g., Production API Key"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                {/* Permissions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permissions *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {availablePermissions.map(permission => (
                      <label key={permission} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(permission)}
                          onChange={() => togglePermission(permission)}
                          className="rounded"
                        />
                        <span className="text-sm">{permission}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Rate Limit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rate Limit (requests per minute)
                  </label>
                  <input
                    type="number"
                    value={rateLimit}
                    onChange={(e) => setRateLimit(parseInt(e.target.value))}
                    min="1"
                    max="1000"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                {/* Expiry */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expires In (days, optional)
                  </label>
                  <input
                    type="number"
                    value={expiresInDays || ''}
                    onChange={(e) => setExpiresInDays(e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Never expires"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={createApiKey}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                >
                  Create API Key
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
