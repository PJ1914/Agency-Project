'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, updateDoc, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import type { Webhook, WebhookEvent, WebhookLog } from '@/types/api';
import { FiPlus, FiTrash2, FiToggleLeft, FiToggleRight, FiActivity } from 'react-icons/fi';
import crypto from 'crypto';

export default function WebhookManagement({ organizationId }: { organizationId: string }) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [logs, setLogs] = useState<Record<string, WebhookLog[]>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<WebhookEvent[]>([]);
  const [maxRetries, setMaxRetries] = useState(3);
  const [retryDelay, setRetryDelay] = useState(5000);

  const availableEvents: WebhookEvent[] = [
    'order.created',
    'order.updated',
    'order.completed',
    'order.cancelled',
    'inventory.low_stock',
    'inventory.updated',
    'payment.success',
    'payment.failed',
    'customer.created',
    'customer.updated'
  ];

  useEffect(() => {
    fetchWebhooks();
  }, [organizationId]);

  const fetchWebhooks = async () => {
    try {
      const q = query(
        collection(db, 'webhooks'),
        where('organizationId', '==', organizationId)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Webhook[];
      setWebhooks(data);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
    }
  };

  const fetchWebhookLogs = async (webhookId: string) => {
    try {
      const q = query(
        collection(db, 'webhookLogs'),
        where('webhookId', '==', webhookId)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WebhookLog[];
      setLogs({ ...logs, [webhookId]: data });
      setSelectedWebhook(webhookId);
    } catch (error) {
      console.error('Error fetching webhook logs:', error);
    }
  };

  const createWebhook = async () => {
    if (!name || !url || selectedEvents.length === 0) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const secret = crypto.randomBytes(32).toString('hex');

      const newWebhook: Omit<Webhook, 'id'> = {
        organizationId,
        name,
        url,
        events: selectedEvents,
        secret,
        status: 'active',
        retryConfig: {
          maxRetries,
          retryDelay
        },
        failureCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'webhooks'), newWebhook);
      
      setWebhooks([...webhooks, { id: docRef.id, ...newWebhook } as Webhook]);
      
      // Reset form
      setName('');
      setUrl('');
      setSelectedEvents([]);
      setMaxRetries(3);
      setRetryDelay(5000);
      setShowCreateModal(false);

      alert(`Webhook created!\n\nSecret: ${secret}\n\nUse this secret to verify webhook signatures.`);
    } catch (error) {
      console.error('Error creating webhook:', error);
      alert('Failed to create webhook');
    }
  };

  const toggleWebhookStatus = async (webhookId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      await updateDoc(doc(db, 'webhooks', webhookId), {
        status: newStatus,
        updatedAt: Timestamp.now()
      });

      setWebhooks(webhooks.map(w => 
        w.id === webhookId ? { ...w, status: newStatus as any } : w
      ));
    } catch (error) {
      console.error('Error toggling webhook:', error);
    }
  };

  const deleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    try {
      await deleteDoc(doc(db, 'webhooks', webhookId));
      setWebhooks(webhooks.filter(w => w.id !== webhookId));
    } catch (error) {
      console.error('Error deleting webhook:', error);
    }
  };

  const toggleEvent = (event: WebhookEvent) => {
    if (selectedEvents.includes(event)) {
      setSelectedEvents(selectedEvents.filter(e => e !== event));
    } else {
      setSelectedEvents([...selectedEvents, event]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Webhook Management</h2>
          <p className="text-gray-600 mt-1">Configure real-time event notifications</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <FiPlus /> Create Webhook
        </button>
      </div>

      {/* Webhooks List */}
      <div className="grid gap-4">
        {webhooks.map((webhook) => (
          <div key={webhook.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{webhook.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    webhook.status === 'active' ? 'bg-green-100 text-green-800' :
                    webhook.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {webhook.status}
                  </span>
                </div>
                <div className="text-sm text-gray-600 font-mono bg-gray-50 px-3 py-2 rounded">
                  {webhook.url}
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => toggleWebhookStatus(webhook.id, webhook.status)}
                  className="text-gray-600 hover:text-gray-900"
                  title={webhook.status === 'active' ? 'Disable' : 'Enable'}
                >
                  {webhook.status === 'active' ? <FiToggleRight size={24} /> : <FiToggleLeft size={24} />}
                </button>
                <button
                  onClick={() => fetchWebhookLogs(webhook.id)}
                  className="text-blue-600 hover:text-blue-700"
                  title="View Logs"
                >
                  <FiActivity size={20} />
                </button>
                <button
                  onClick={() => deleteWebhook(webhook.id)}
                  className="text-red-600 hover:text-red-700"
                  title="Delete"
                >
                  <FiTrash2 size={20} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {webhook.events.map(event => (
                <span key={event} className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                  {event}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Last Triggered:</span>
                <div className="font-medium">
                  {webhook.lastTriggered ? new Date(webhook.lastTriggered instanceof Date ? webhook.lastTriggered : (webhook.lastTriggered as any).toDate()).toLocaleString() : 'Never'}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Failures:</span>
                <div className={`font-medium ${webhook.failureCount > 0 ? 'text-red-600' : ''}`}>
                  {webhook.failureCount}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Retry Config:</span>
                <div className="font-medium">
                  {webhook.retryConfig.maxRetries} attempts, {webhook.retryConfig.retryDelay}ms delay
                </div>
              </div>
            </div>

            {/* Webhook Logs */}
            {selectedWebhook === webhook.id && logs[webhook.id] && (
              <div className="mt-4 border-t pt-4">
                <h4 className="font-semibold mb-2">Recent Activity</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                  {logs[webhook.id].slice(0, 10).map((log) => (
                    <div key={log.id} className="text-sm border rounded p-2">
                      <div className="flex justify-between items-start">
                        <span className="font-medium">{log.event}</span>
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          log.status === 'success' ? 'bg-green-100 text-green-800' :
                          log.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {log.status}
                        </span>
                      </div>
                      {log.response && (
                        <div className="text-xs text-gray-600 mt-1">
                          Status: {log.response.statusCode}
                        </div>
                      )}
                      {log.error && (
                        <div className="text-xs text-red-600 mt-1">{log.error}</div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(log.createdAt instanceof Date ? log.createdAt : (log.createdAt as any).toDate()).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {webhooks.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-white rounded-lg">
            No webhooks configured. Click &quot;Create Webhook&quot; to get started.
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Create New Webhook</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Production Webhook"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL *</label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://your-domain.com/webhook"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Events *</label>
                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                    {availableEvents.map(event => (
                      <label key={event} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedEvents.includes(event)}
                          onChange={() => toggleEvent(event)}
                          className="rounded"
                        />
                        <span className="text-sm">{event}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Retries</label>
                    <input
                      type="number"
                      value={maxRetries}
                      onChange={(e) => setMaxRetries(parseInt(e.target.value))}
                      min="0"
                      max="10"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Retry Delay (ms)</label>
                    <input
                      type="number"
                      value={retryDelay}
                      onChange={(e) => setRetryDelay(parseInt(e.target.value))}
                      min="1000"
                      step="1000"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={createWebhook}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                >
                  Create Webhook
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
