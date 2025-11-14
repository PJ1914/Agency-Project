/**
 * AI Chatbot with CRUD Operations
 * 
 * This chatbot can perform real CRUD operations on your data:
 * - CREATE: "Add a new product called iPhone 15 with price 999 and stock 50"
 * - READ: "Show me all orders from last week" or "What items are low in stock?"
 * - UPDATE: "Update product iPhone 15 stock to 75"
 * - DELETE: "Delete product with ID abc123" (requires confirmation)
 * 
 * Supported entities: inventory, customers, orders
 * The AI will automatically detect your intent and perform the appropriate action.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { generateChatbotResponse } from '@/lib/aiService';
import { processAIAction, confirmDeleteAction, AIActionResult } from '@/lib/aiActions';
import { FiSend, FiRefreshCw, FiStar, FiCopy, FiCheck, FiAlertTriangle } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actionResult?: AIActionResult;
  isAction?: boolean;
}

export default function AIChatbotPage() {
  const { currentOrganization } = useOrganization();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<AIActionResult | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    if (currentOrganization?.id) {
      const storageKey = `chat_history_${currentOrganization.id}`;
      const savedChat = localStorage.getItem(storageKey);
      if (savedChat) {
        try {
          const parsed = JSON.parse(savedChat);
          // Convert timestamp strings back to Date objects
          const messagesWithDates = parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setChatMessages(messagesWithDates);
        } catch (error) {
          console.error('Error loading chat history:', error);
        }
      }
    }
  }, [currentOrganization?.id]);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    if (currentOrganization?.id && chatMessages.length > 0) {
      const storageKey = `chat_history_${currentOrganization.id}`;
      localStorage.setItem(storageKey, JSON.stringify(chatMessages));
    }
  }, [chatMessages, currentOrganization?.id]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px';
    }
  }, [chatInput]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading || !currentOrganization?.id) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    
    // Add user message to chat
    setChatMessages(prev => [...prev, { 
      role: 'user', 
      content: userMessage, 
      timestamp: new Date() 
    }]);

    setIsChatLoading(true);
    
    try {
      // First, try to process as an AI action (CRUD operation)
      const actionResult = await processAIAction(userMessage, currentOrganization.id);
      
      if (actionResult.requiresConfirmation) {
        // Store pending confirmation
        setPendingConfirmation(actionResult);
        
        // Add confirmation message
        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
          content: actionResult.message,
          timestamp: new Date(),
          actionResult,
          isAction: true
        }]);
      } else if (actionResult.action !== 'none' && actionResult.success) {
        // Action was successful, show result
        let resultMessage = actionResult.message;
        
        // Add data details if available
        if (actionResult.data) {
          if (Array.isArray(actionResult.data)) {
            resultMessage += `\n\n**Results:**\n${JSON.stringify(actionResult.data, null, 2)}`;
          } else {
            resultMessage += `\n\n**Details:**\n${JSON.stringify(actionResult.data, null, 2)}`;
          }
        }
        
        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
          content: resultMessage,
          timestamp: new Date(),
          actionResult,
          isAction: true
        }]);
      } else if (actionResult.action !== 'none' && !actionResult.success) {
        // Action failed, show error
        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
          content: actionResult.message,
          timestamp: new Date(),
          actionResult,
          isAction: true
        }]);
      } else {
        // No action detected, treat as regular question
        const response = await generateChatbotResponse(userMessage, {}, currentOrganization.id);
        
        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
          content: response, 
          timestamp: new Date() 
        }]);
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '❌ Sorry, I encountered an error. Please try again.', 
        timestamp: new Date() 
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleConfirmAction = async (confirm: boolean) => {
    if (!pendingConfirmation || !currentOrganization?.id) return;

    if (confirm) {
      setIsChatLoading(true);
      try {
        const result = await confirmDeleteAction(
          pendingConfirmation.entity,
          pendingConfirmation.confirmationData,
          currentOrganization.id
        );
        
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: result.message,
          timestamp: new Date(),
          actionResult: result,
          isAction: true
        }]);
      } catch (error) {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: '❌ Failed to complete the action.',
          timestamp: new Date()
        }]);
      } finally {
        setIsChatLoading(false);
        setPendingConfirmation(null);
      }
    } else {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: '✋ Action cancelled.',
        timestamp: new Date()
      }]);
      setPendingConfirmation(null);
    }
  };

  const clearChat = () => {
    setChatMessages([]);
    if (currentOrganization?.id) {
      const storageKey = `chat_history_${currentOrganization.id}`;
      localStorage.removeItem(storageKey);
    }
  };

  const copyToClipboard = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const suggestionPrompts = [
    { icon: '📊', title: 'Sales Analysis', prompt: 'Show me my sales summary and trends' },
    { icon: '📦', title: 'Inventory Check', prompt: 'What items are low in stock?' },
    { icon: '➕', title: 'Add Product', prompt: 'Add a new product called Wireless Mouse with price $25 and stock 100' },
    { icon: '👥', title: 'Customer Insights', prompt: 'Tell me about my top customers' },
    { icon: '📝', title: 'Create Order', prompt: 'Create a new order for customer John with total amount $150' },
    { icon: '💡', title: 'Growth Tips', prompt: 'How can I increase my revenue?' },
  ];

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      {/* Modern Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <FiStar className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">AI Business Assistant</h1>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">CodeTapasya AI 1.0</p>
              </div>
            </div>
            
            {chatMessages.length > 0 && (
              <button
                onClick={clearChat}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all flex-shrink-0"
              >
                <FiRefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">New Chat</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
          {chatMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-250px)] sm:min-h-[calc(100vh-300px)] space-y-6 sm:space-y-8 px-4">
              {/* Hero Section */}
              <div className="text-center space-y-2 sm:space-y-3 animate-fade-in">
                <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-2xl shadow-blue-500/30 mb-2 sm:mb-4">
                  <FiStar className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent px-4">
                  How can I help you today?
                </h2>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-md mx-auto px-4">
                  Ask me anything about your business, inventory, sales, or get personalized recommendations
                </p>
              </div>

              {/* Suggestion Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 w-full max-w-5xl">
                {suggestionPrompts.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setChatInput(suggestion.prompt);
                      inputRef.current?.focus();
                    }}
                    className="group relative p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 text-left"
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <span className="text-xl sm:text-2xl flex-shrink-0">{suggestion.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white mb-1 text-xs sm:text-sm">
                          {suggestion.title}
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          "{suggestion.prompt}"
                        </div>
                      </div>
                    </div>
                    <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2 sm:gap-3 md:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {msg.role === 'assistant' ? (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
                        <FiStar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 dark:from-gray-600 dark:to-gray-800 flex items-center justify-center shadow-md">
                        <span className="text-white text-xs sm:text-sm font-medium">
                          {currentOrganization?.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Message Content */}
                  <div className={`flex-1 min-w-0 ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
                    <div className={`inline-block max-w-full sm:max-w-[90%] md:max-w-[85%] ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                      <div
                        className={`rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-3 ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm border border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {msg.role === 'user' ? (
                          <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                            {msg.content}
                          </div>
                        ) : (
                          <div className="text-[15px] leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-1 prose-headings:font-semibold prose-headings:text-gray-900 dark:prose-headings:text-white prose-strong:text-gray-900 dark:prose-strong:text-white prose-strong:font-semibold prose-code:bg-gray-100 dark:prose-code:bg-gray-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-gray-100 dark:prose-pre:bg-gray-700 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-600">
                            <ReactMarkdown
                              components={{
                                p: ({ node, ...props }) => <p className="my-2" {...props} />,
                                ul: ({ node, ...props }) => <ul className="my-2 ml-4 space-y-1" {...props} />,
                                ol: ({ node, ...props }) => <ol className="my-2 ml-4 space-y-1" {...props} />,
                                li: ({ node, ...props }) => <li className="my-1" {...props} />,
                                strong: ({ node, ...props }) => <strong className="font-semibold text-gray-900 dark:text-white" {...props} />,
                                em: ({ node, ...props }) => <em className="italic" {...props} />,
                                code: ({ node, className, children, ...props }) => {
                                  const match = /language-(\w+)/.exec(className || '');
                                  return !match ? (
                                    <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                                      {children}
                                    </code>
                                  ) : (
                                    <code className={className} {...props}>
                                      {children}
                                    </code>
                                  );
                                },
                                h1: ({ node, ...props }) => <h1 className="text-xl font-semibold mt-4 mb-2" {...props} />,
                                h2: ({ node, ...props }) => <h2 className="text-lg font-semibold mt-3 mb-2" {...props} />,
                                h3: ({ node, ...props }) => <h3 className="text-base font-semibold mt-3 mb-1" {...props} />,
                                blockquote: ({ node, ...props }) => (
                                  <blockquote className="border-l-4 border-blue-500 pl-4 italic my-2 text-gray-700 dark:text-gray-300" {...props} />
                                ),
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                      
                      {/* Confirmation Buttons for Actions */}
                      {msg.actionResult?.requiresConfirmation && pendingConfirmation && (
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => handleConfirmAction(true)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            <FiAlertTriangle className="w-4 h-4" />
                            Yes, Delete
                          </button>
                          <button
                            onClick={() => handleConfirmAction(false)}
                            className="px-3 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                      
                      {/* Action Success Badge */}
                      {msg.isAction && msg.actionResult && !msg.actionResult.requiresConfirmation && (
                        <div className={`mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
                          msg.actionResult.success 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        }`}>
                          {msg.actionResult.success ? '✅' : '❌'} 
                          {msg.actionResult.action} {msg.actionResult.entity}
                        </div>
                      )}
                      
                      {/* Message Footer */}
                      <div className={`flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {msg.role === 'assistant' && (
                          <button
                            onClick={() => copyToClipboard(msg.content, idx)}
                            className="flex items-center gap-1 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          >
                            {copiedIndex === idx ? (
                              <>
                                <FiCheck className="w-3 h-3" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <FiCopy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {isChatLoading && (
                <div className="flex gap-2 sm:gap-3 md:gap-4 animate-fade-in">
                  <div className="flex-shrink-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
                      <FiStar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="inline-block bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-3 shadow-sm border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-purple-600 animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-600 animate-bounce"></div>
                        </div>
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}
        </div>
      </div>
        
      {/* Modern Input Section */}
      <div className="sticky bottom-0 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-t border-gray-200/50 dark:border-gray-700/50">
        <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4">
          <form onSubmit={handleChatSubmit} className="relative w-full">
            <div className="relative flex items-end gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-lg border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500 transition-all w-full">
              <textarea
                ref={inputRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleChatSubmit(e);
                  }
                }}
                placeholder="Ask me anything..."
                disabled={isChatLoading}
                rows={1}
                className="flex-1 min-w-0 bg-transparent border-none focus:outline-none focus:ring-0 resize-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 px-2 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-[15px] leading-6 max-h-[200px] disabled:opacity-50"
                style={{ scrollbarWidth: 'thin' }}
              />
              
              <button
                type="submit"
                disabled={!chatInput.trim() || isChatLoading}
                className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 disabled:shadow-none transition-all duration-200 disabled:cursor-not-allowed group"
              >
                <FiSend className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${!chatInput.trim() || isChatLoading ? '' : 'group-hover:translate-x-0.5 group-hover:-translate-y-0.5'}`} />
              </button>
            </div>
            
            {/* Helper Text */}
            <div className="hidden sm:flex items-center justify-center mt-3 text-xs text-gray-500 dark:text-gray-400 gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">Enter</kbd>
                to send
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">Shift + Enter</kbd>
                for new line
              </span>
            </div>
          </form>
          
          <p className="text-center text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-2 sm:mt-3 px-2">
            AI responses are generated based on your real business data. Always verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
