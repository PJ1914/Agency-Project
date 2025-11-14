'use client';

import { useState } from 'react';
import APIManagement from '@/components/APIManagement';
import WebhookManagement from '@/components/WebhookManagement';
import { FiKey, FiZap, FiGlobe, FiCreditCard, FiDatabase } from 'react-icons/fi';

export default function IntegrationsPage() {
  const organizationId = 'org_001'; // Get from auth context
  const [activeTab, setActiveTab] = useState<'api' | 'webhooks' | 'external'>('api');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Integrations & API</h1>
          <p className="text-gray-600">Connect your platform with external systems and services</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <FiKey className="text-green-600" size={24} />
              <span className="text-2xl font-bold text-gray-900">3</span>
            </div>
            <div className="text-sm text-gray-600">Active API Keys</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <FiZap className="text-blue-600" size={24} />
              <span className="text-2xl font-bold text-gray-900">5</span>
            </div>
            <div className="text-sm text-gray-600">Webhooks</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <FiGlobe className="text-purple-600" size={24} />
              <span className="text-2xl font-bold text-gray-900">12.5K</span>
            </div>
            <div className="text-sm text-gray-600">API Requests</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <FiCreditCard className="text-orange-600" size={24} />
              <span className="text-2xl font-bold text-gray-900">2</span>
            </div>
            <div className="text-sm text-gray-600">Payment Integrations</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <FiDatabase className="text-red-600" size={24} />
              <span className="text-2xl font-bold text-gray-900">1</span>
            </div>
            <div className="text-sm text-gray-600">Accounting Sync</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('api')}
              className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                activeTab === 'api'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FiKey size={20} />
              API Management
            </button>
            <button
              onClick={() => setActiveTab('webhooks')}
              className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                activeTab === 'webhooks'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FiZap size={20} />
              Webhooks
            </button>
            <button
              onClick={() => setActiveTab('external')}
              className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                activeTab === 'external'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FiGlobe size={20} />
              External Integrations
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'api' && <APIManagement organizationId={organizationId} />}
        {activeTab === 'webhooks' && <WebhookManagement organizationId={organizationId} />}
        {activeTab === 'external' && <ExternalIntegrations organizationId={organizationId} />}
      </div>
    </div>
  );
}

function ExternalIntegrations({ organizationId }: { organizationId: string }) {
  const integrations = [
    {
      id: 'razorpay',
      name: 'Razorpay',
      description: 'Accept payments online with India\'s leading payment gateway',
      icon: '💳',
      category: 'Payment Gateway',
      connected: true,
      features: ['Payment Links', 'UPI', 'Cards', 'Netbanking', 'Wallets']
    },
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Global payment processing for internet businesses',
      icon: '💰',
      category: 'Payment Gateway',
      connected: false,
      features: ['Global Payments', 'Subscriptions', 'Invoicing']
    },
    {
      id: 'zapier',
      name: 'Zapier',
      description: 'Connect to 5000+ apps and automate workflows',
      icon: '⚡',
      category: 'Automation',
      connected: true,
      features: ['Workflow Automation', '5000+ Apps', 'Custom Triggers']
    },
    {
      id: 'tally',
      name: 'Tally ERP',
      description: 'Sync with Tally for seamless accounting',
      icon: '📊',
      category: 'Accounting',
      connected: false,
      features: ['Invoice Sync', 'Ledger Integration', 'GST Reports']
    },
    {
      id: 'quickbooks',
      name: 'QuickBooks',
      description: 'Cloud accounting software for small businesses',
      icon: '📈',
      category: 'Accounting',
      connected: false,
      features: ['Automatic Sync', 'Financial Reports', 'Bank Reconciliation']
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Business',
      description: 'Send order updates and notifications via WhatsApp',
      icon: '💬',
      category: 'Communication',
      connected: true,
      features: ['Order Updates', 'Bulk Messages', 'Templates']
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">External Integrations</h2>
          <p className="text-gray-600 mt-1">Connect with third-party services</p>
        </div>
      </div>

      {/* Filter by Category */}
      <div className="flex gap-2">
        {['All', 'Payment Gateway', 'Accounting', 'Automation', 'Communication'].map(category => (
          <button
            key={category}
            className="px-4 py-2 rounded-lg border hover:bg-gray-50 text-sm"
          >
            {category}
          </button>
        ))}
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-2 gap-6">
        {integrations.map((integration) => (
          <div key={integration.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{integration.icon}</div>
                <div>
                  <h3 className="text-lg font-semibold">{integration.name}</h3>
                  <span className="text-xs text-gray-500">{integration.category}</span>
                </div>
              </div>
              
              {integration.connected ? (
                <span className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  Connected
                </span>
              ) : (
                <button className="bg-green-600 text-white px-4 py-1 rounded-lg hover:bg-green-700 text-sm">
                  Connect
                </button>
              )}
            </div>

            <p className="text-gray-600 text-sm mb-4">{integration.description}</p>

            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Features:</div>
              <div className="flex flex-wrap gap-2">
                {integration.features.map(feature => (
                  <span key={feature} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            {integration.connected && (
              <div className="mt-4 pt-4 border-t">
                <button className="text-sm text-red-600 hover:text-red-700">
                  Disconnect
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* API Documentation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-2">📖 API Documentation</h3>
        <p className="text-gray-700 mb-4">
          Build custom integrations using our REST API. View complete documentation with examples and guides.
        </p>
        <div className="flex gap-3">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            View API Docs
          </button>
          <button className="border border-blue-600 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50">
            Download Postman Collection
          </button>
        </div>
      </div>
    </div>
  );
}
