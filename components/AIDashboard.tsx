'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { 
  generateDemandForecast, 
  generatePricingRecommendation,
  detectAnomalies,
  generateBusinessInsights,
  generateCategorySuggestions
} from '@/lib/aiService';
import type { 
  DemandForecast, 
  PricingRecommendation, 
  Anomaly, 
  AIInsight,
  CategorySuggestion 
} from '@/types/ai';
import { FiTrendingUp, FiAlertTriangle, FiDollarSign, FiBarChart2, FiTag, FiRefreshCw } from 'react-icons/fi';

export default function AIDashboard({ organizationId }: { organizationId: string }) {
  const [activeTab, setActiveTab] = useState<'insights' | 'forecasting' | 'pricing' | 'anomalies' | 'categorization'>('insights');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for each AI feature
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [forecasts, setForecasts] = useState<DemandForecast[]>([]);
  const [pricingRecommendations, setPricingRecommendations] = useState<PricingRecommendation[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [categorySuggestions, setCategorySuggestions] = useState<CategorySuggestion[]>([]);

  const loadInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await generateBusinessInsights(organizationId);
      setInsights(data);
      
      if (data.length === 0) {
        setError('No insights generated. Make sure you have orders, inventory, and customer data in your system.');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to generate insights. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const loadForecasts = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get all inventory items from Firestore (no organizationId filter)
      const inventoryRef = collection(db, 'inventory');
      const inventoryQuery = query(inventoryRef, limit(5));
      const inventorySnapshot = await getDocs(inventoryQuery);
      
      if (inventorySnapshot.empty) {
        setError('No inventory items found. Add products to your inventory first.');
        setForecasts([]);
        setLoading(false);
        return;
      }

      const forecastPromises = inventorySnapshot.docs.map(doc => 
        generateDemandForecast(organizationId, doc.id, 'month')
      );
      
      const forecastResults = await Promise.all(forecastPromises);
      setForecasts(forecastResults);
    } catch (error: any) {
      setError(error.message || 'Failed to generate forecasts.');
      setForecasts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPricingRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get all inventory items from Firestore (no organizationId filter)
      const inventoryRef = collection(db, 'inventory');
      const inventoryQuery = query(inventoryRef, limit(5));
      const inventorySnapshot = await getDocs(inventoryQuery);
      
      if (inventorySnapshot.empty) {
        setError('No inventory items found. Add products to your inventory first.');
        setPricingRecommendations([]);
        setLoading(false);
        return;
      }

      const pricingPromises = inventorySnapshot.docs.map(doc => 
        generatePricingRecommendation(organizationId, doc.id)
      );
      
      const pricingResults = await Promise.all(pricingPromises);
      setPricingRecommendations(pricingResults);
    } catch (error: any) {
      setError(error.message || 'Failed to generate pricing recommendations.');
      setPricingRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAnomalies = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get recent orders (no organizationId filter, matches aiService.ts pattern)
      const ordersRef = collection(db, 'orders');
      const ordersQuery = query(
        ordersRef, 
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      
      if (ordersSnapshot.empty) {
        setError('No orders found. Add some orders first.');
        setAnomalies([]);
        setLoading(false);
        return;
      }

      const ordersData = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const detectedAnomalies = await detectAnomalies(organizationId, 'order', ordersData);
      setAnomalies(detectedAnomalies);
    } catch (error: any) {
      setError(error.message || 'Failed to detect anomalies.');
      setAnomalies([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCategorySuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get inventory items (no organizationId filter)
      const inventoryRef = collection(db, 'inventory');
      const inventoryQuery = query(inventoryRef, limit(5));
      const inventorySnapshot = await getDocs(inventoryQuery);
      
      if (inventorySnapshot.empty) {
        setError('No inventory items found. Add products to your inventory first.');
        setCategorySuggestions([]);
        setLoading(false);
        return;
      }

      const suggestionPromises = inventorySnapshot.docs.map(doc => {
        const data = doc.data();
        return generateCategorySuggestions(organizationId, 'product', {
          id: doc.id,
          name: data.name,
          description: data.description,
          category: data.category,
          sku: data.sku
        });
      });
      
      const suggestionResults = await Promise.all(suggestionPromises);
      setCategorySuggestions(suggestionResults);
    } catch (error: any) {
      setError(error.message || 'Failed to generate category suggestions.');
      setCategorySuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'insights') {
      loadInsights();
    } else if (activeTab === 'forecasting') {
      loadForecasts();
    } else if (activeTab === 'pricing') {
      loadPricingRecommendations();
    } else if (activeTab === 'anomalies') {
      loadAnomalies();
    } else if (activeTab === 'categorization') {
      loadCategorySuggestions();
    }
  }, [activeTab, organizationId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">AI-Powered Intelligence</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Smart insights and recommendations powered by Gemini AI</p>
        </div>
        <button
          onClick={loadInsights}
          disabled={loading}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg transition-all"
        >
          <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          {loading ? 'Generating...' : 'Refresh Insights'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-8">
          {[
            { id: 'insights', label: 'Business Insights', icon: FiBarChart2 },
            { id: 'forecasting', label: 'Demand Forecasting', icon: FiTrendingUp },
            { id: 'pricing', label: 'Smart Pricing', icon: FiDollarSign },
            { id: 'anomalies', label: 'Anomaly Detection', icon: FiAlertTriangle },
            { id: 'categorization', label: 'Auto-Categorization', icon: FiTag }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow">
        {activeTab === 'insights' && (
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold mb-4">Actionable Business Insights</h3>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <FiAlertTriangle size={24} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">Error Generating Insights</p>
                    <p className="text-sm">{error}</p>
                    <p className="text-sm mt-2 opacity-75">Check browser console (F12) for detailed logs.</p>
                  </div>
                </div>
              </div>
            )}
            
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
                <p className="text-gray-600 dark:text-gray-400 mt-4">AI is analyzing your data...</p>
              </div>
            ) : insights.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <FiBarChart2 size={48} className="mx-auto mb-4 opacity-50" />
                <p>No insights available yet. Click &quot;Refresh Insights&quot; to generate.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {insights.map((insight) => (
                  <div key={insight.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          insight.priority === 'high' ? 'bg-red-100 text-red-800' :
                          insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {insight.priority.toUpperCase()}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {insight.category}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        Confidence: {insight.confidence}%
                      </span>
                    </div>
                    
                    <h4 className="font-semibold text-lg mb-2">{insight.title}</h4>
                    <p className="text-gray-700 dark:text-gray-300 mb-3">{insight.description}</p>
                    
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3 mb-3">
                      <div className="font-medium text-blue-900 dark:text-blue-100 mb-1">Potential Impact</div>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {insight.impact.unit}{insight.impact.value?.toLocaleString() || 'N/A'}
                      </div>
                      <div className="text-sm text-blue-700 dark:text-blue-300">{insight.impact.metric}</div>
                    </div>

                    <div className="space-y-2">
                      <div className="font-medium text-sm text-gray-700 dark:text-gray-300">Recommended Actions:</div>
                      {insight.recommendations.map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <span className="text-blue-600 dark:text-blue-400 mt-1">✓</span>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{rec.action}</div>
                            <div className="text-gray-600 dark:text-gray-400">{rec.expectedOutcome}</div>
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                              rec.effort === 'low' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200' :
                              rec.effort === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {rec.effort} effort
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'forecasting' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Demand Forecasting</h3>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-4">
                <p>{error}</p>
              </div>
            )}
            
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
                <p className="text-gray-600 dark:text-gray-400 mt-4">Generating demand forecasts...</p>
              </div>
            ) : forecasts.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <FiTrendingUp size={48} className="mx-auto mb-4 opacity-50" />
                <p>No forecasts available yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {forecasts.map((forecast) => (
                  <div key={forecast.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-lg">{forecast.productName}</h4>
                        <p className="text-sm text-gray-600">Current Stock: {forecast.currentStock} units</p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Confidence: {forecast.confidence}%
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="bg-orange-50 border border-orange-200 rounded p-3">
                        <div className="text-sm text-gray-600">Recommended Reorder</div>
                        <div className="text-2xl font-bold text-orange-600">{forecast.recommendedReorderQuantity}</div>
                        <div className="text-xs text-gray-500">units</div>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded p-3">
                        <div className="text-sm text-gray-600">Reorder Date</div>
                        <div className="text-lg font-semibold text-purple-600">
                          {new Date(forecast.recommendedReorderDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-700">Key Insights:</div>
                      {forecast.insights.map((insight, idx) => (
                        <div key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-blue-600">•</span>
                          {insight}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Smart Pricing Recommendations</h3>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-4">
                <p>{error}</p>
              </div>
            )}
            
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
                <p className="text-gray-600 mt-4">Analyzing pricing strategies...</p>
              </div>
            ) : pricingRecommendations.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FiDollarSign size={48} className="mx-auto mb-4 opacity-50" />
                <p>No pricing recommendations available yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pricingRecommendations.map((rec) => (
                  <div key={rec.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-lg">{rec.productName}</h4>
                        <p className="text-sm text-gray-600">Current Price: ₹{rec.currentPrice}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                        Confidence: {rec.confidence}%
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div className={`border rounded p-3 ${
                        rec.priceChange > 0 ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="text-sm text-gray-600">Recommended Price</div>
                        <div className={`text-2xl font-bold ${
                          rec.priceChange > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600'
                        }`}>₹{rec.recommendedPrice}</div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <div className="text-sm text-gray-600">Price Change</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {rec.priceChangePercent > 0 ? '+' : ''}{rec.priceChangePercent.toFixed(1)}%
                        </div>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded p-3">
                        <div className="text-sm text-gray-600">Expected Revenue</div>
                        <div className="text-lg font-semibold text-purple-600">
                          +₹{rec.expectedImpact?.revenueIncrease?.toLocaleString() || '0'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 mb-3">
                      <div className="text-sm font-medium text-gray-700">Reasoning:</div>
                      {rec.reasoning.map((reason, idx) => (
                        <div key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-blue-600 dark:text-blue-400">✓</span>
                          {reason}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'anomalies' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Anomaly Detection</h3>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-4">
                <p>{error}</p>
              </div>
            )}
            
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
                <p className="text-gray-600 mt-4">Scanning for anomalies...</p>
              </div>
            ) : anomalies.length === 0 ? (
              <div className="text-center py-12 text-blue-500 dark:text-blue-400">
                <FiAlertTriangle size={48} className="mx-auto mb-4 opacity-50" />
                <p className="font-semibold">No anomalies detected!</p>
                <p className="text-sm text-gray-600 mt-2">Your business operations look normal.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {anomalies.map((anomaly) => (
                  <div key={anomaly.id} className={`border rounded-lg p-4 ${
                    anomaly.severity === 'critical' ? 'border-red-300 bg-red-50' :
                    anomaly.severity === 'high' ? 'border-orange-300 bg-orange-50' :
                    anomaly.severity === 'medium' ? 'border-yellow-300 bg-yellow-50' :
                    'border-blue-300 bg-blue-50'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          anomaly.severity === 'critical' ? 'bg-red-200 text-red-800' :
                          anomaly.severity === 'high' ? 'bg-orange-200 text-orange-800' :
                          anomaly.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                          'bg-blue-200 text-blue-800'
                        }`}>
                          {anomaly.severity.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(anomaly.detectedAt).toLocaleString()}
                      </span>
                    </div>
                    
                    <h4 className="font-semibold text-lg mb-1">{anomaly.title}</h4>
                    <p className="text-gray-700 mb-3">{anomaly.description}</p>

                    <div className="space-y-1 mb-3">
                      <div className="text-sm font-medium text-gray-700">Recommendations:</div>
                      {anomaly.recommendations.map((rec, idx) => (
                        <div key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-orange-600">⚠</span>
                          {rec}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'categorization' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Auto-Categorization Suggestions</h3>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-4">
                <p>{error}</p>
              </div>
            )}
            
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
                <p className="text-gray-600 mt-4">Categorizing items...</p>
              </div>
            ) : categorySuggestions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FiTag size={48} className="mx-auto mb-4 opacity-50" />
                <p>No category suggestions available yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {categorySuggestions.map((suggestion) => (
                  <div key={suggestion.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-lg">{suggestion.entityName}</h4>
                        <p className="text-sm text-gray-600">Current: {suggestion.currentCategory || 'Uncategorized'}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      <div className="text-sm font-medium text-gray-700">Suggested Categories:</div>
                      {suggestion.suggestedCategories.map((cat, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-purple-50 border border-purple-200 rounded">
                          <span className="font-medium">{cat.category}</span>
                          <span className="text-sm text-purple-600">{cat.confidence}% confidence</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-700">Suggested Tags:</div>
                      <div className="flex flex-wrap gap-2">
                        {suggestion.tags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            {tag.tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Usage Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="text-gray-600 dark:text-gray-400 text-sm">Insights Generated</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{insights.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="text-gray-600 dark:text-gray-400 text-sm">Forecasts Created</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{forecasts.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="text-gray-600 dark:text-gray-400 text-sm">Anomalies Detected</div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{anomalies.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="text-gray-600 dark:text-gray-400 text-sm">Auto-Categorized</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{categorySuggestions.length}</div>
        </div>
      </div>
    </div>
  );
}





