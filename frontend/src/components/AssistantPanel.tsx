/**
 * Phase 7.2C: AI Environmental Assistant Panel - Conversational UI
 * Chat interface with Ollama integration, conversation history, and context awareness
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, Trash2, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import apiService from '../services/api';
import { AssistantMessage, AssistantContext, ConversationMessage } from '../types/assistant';

interface AssistantPanelProps {
  context?: AssistantContext;
}

export const AssistantPanel: React.FC<AssistantPanelProps> = ({ context }) => {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: '0',
      role: 'assistant',
      content: "Hello! I'm your AI Environmental Assistant powered by local AI. I can help you understand NDVI vegetation analysis, interpret satellite data, and answer environmental questions naturally. What would you like to know?",
      timestamp: new Date(),
      confidence: 1.0,
      suggestions: [
        "What is NDVI?",
        "Explain vegetation monitoring",
        "How does satellite analysis work?",
        "Interpret my results"
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseSource, setResponseSource] = useState<'ollama' | 'pattern' | 'fallback' | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
  }, [input]);

  const buildConversationHistory = (): ConversationMessage[] => {
    // Get last 10 messages (5 exchanges) for context, excluding initial greeting
    const relevantMessages = messages.filter(m => m.id !== '0').slice(-10);

    return relevantMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp
    }));
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: AssistantMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    setResponseSource(null);

    try {
      // Build conversation history
      const conversationHistory = buildConversationHistory();

      const response = await apiService.queryAssistant({
        message: userMessage.content,
        context,
        conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined
      });

      const assistantMessage: AssistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        intent: response.intent,
        confidence: response.confidence,
        suggestions: response.suggestions
      };

      setMessages(prev => [...prev, assistantMessage]);
      setResponseSource(response.metadata.source || null);

    } catch (error: any) {
      console.error('Error querying assistant:', error);

      let errorContent = "I'm sorry, I encountered an error processing your question. ";

      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorContent += "The request timed out. The AI model might be processing or unavailable. Please try a shorter question or try again.";
      } else if (error.response?.status === 400) {
        errorContent += "Your message couldn't be processed. Please rephrase and try again.";
      } else if (error.response?.status >= 500) {
        errorContent += "The server encountered an error. Please try again in a moment.";
      } else {
        errorContent += "Please try again.";
      }

      const errorMessage: AssistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
        confidence: 0
      };

      setMessages(prev => [...prev, errorMessage]);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    if (window.confirm('Clear all messages? This cannot be undone.')) {
      setMessages([
        {
          id: '0',
          role: 'assistant',
          content: "Chat cleared. I'm ready to help! What would you like to know about vegetation analysis and environmental monitoring?",
          timestamp: new Date(),
          confidence: 1.0,
          suggestions: [
            "What is NDVI?",
            "Explain my results",
            "Compare vegetation changes",
            "Environmental insights"
          ]
        }
      ]);
      setError(null);
      setResponseSource(null);
    }
  };

  const getSourceBadge = (source?: string | null) => {
    if (!source) return null;

    const badges = {
      ollama: { text: 'AI', color: 'bg-purple-100 text-purple-700', icon: '🤖' },
      pattern: { text: 'Pattern', color: 'bg-blue-100 text-blue-700', icon: '🔍' },
      fallback: { text: 'Fallback', color: 'bg-yellow-100 text-yellow-700', icon: '⚡' }
    };

    const badge = badges[source as keyof typeof badges];
    if (!badge) return null;

    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color} font-medium`}>
        {badge.icon} {badge.text}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#1a2332] rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#0f1419]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-green-500" />
          <div>
            <h2 className="text-lg font-semibold text-white">AI Environmental Assistant</h2>
            <p className="text-xs text-gray-400">
              Conversational AI • Local Inference
            </p>
          </div>
        </div>
        <button
          onClick={handleClearChat}
          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
          title="Clear conversation"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Context Indicator */}
      {context && (
        <div className="px-4 py-2 bg-green-900/20 border-b border-green-800/50">
          <div className="flex items-center gap-2 text-xs text-green-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="font-medium">Context Active:</span>
            <span>
              {context.location?.name || 'Location'}
              {context.ndviData && ' • NDVI Analysis'}
              {context.comparisonData && ' • Temporal Comparison'}
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0f1419]">
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-4 shadow-sm ${
                message.role === 'user'
                  ? 'bg-green-900/30 text-white border border-green-800'
                  : 'bg-[#1a2332] text-gray-100 border border-gray-800'
              }`}
            >
              {message.role === 'assistant' ? (
                <div className="text-sm prose prose-sm max-w-none prose-headings:text-white prose-p:text-gray-300 prose-strong:text-white prose-li:text-gray-300 prose-a:text-green-400">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              )}

              {/* Suggestions */}
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
                  <p className="text-xs font-semibold text-gray-400">💡 Try asking:</p>
                  <div className="flex flex-wrap gap-2">
                    {message.suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(suggestion)}
                        disabled={isLoading}
                        className="text-xs px-3 py-1.5 bg-[#0f1419] border border-gray-700 rounded-full hover:bg-green-900/20 hover:border-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-300"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="mt-2 flex items-center gap-2 text-xs opacity-70 text-gray-400">
                <span>{message.timestamp.toLocaleTimeString()}</span>
                {message.confidence !== undefined && message.confidence < 0.5 && (
                  <span className="text-yellow-400">⚠️ Low confidence</span>
                )}
                {index === messages.length - 1 && message.role === 'assistant' && responseSource && (
                  getSourceBadge(responseSource)
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#1a2332] border border-gray-800 rounded-lg p-4 shadow-sm flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-green-500" />
                <span className="text-sm text-gray-300 font-medium">AI is thinking...</span>
              </div>
              <p className="text-xs text-gray-400">
                {context ?
                  'Analyzing your NDVI data and context...' :
                  'Generating response (this may take 15-60 seconds for natural language)...'
                }
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex justify-center">
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 flex items-start gap-2 max-w-md">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-red-300">
                <p className="font-medium">Connection issue</p>
                <p className="mt-1 text-gray-400">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-800 bg-[#0f1419]">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about NDVI, vegetation health, temporal changes, or any environmental question..."
            className="flex-1 px-4 py-3 bg-[#1a2332] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none max-h-32 overflow-y-auto"
            disabled={isLoading}
            rows={1}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className="px-5 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center gap-2 self-end"
            title="Send message (Enter)"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>

        {/* Tips */}
        <div className="mt-3 flex items-start gap-2 text-xs text-gray-400">
          <div className="flex-1">
            <p>
              <strong className="text-gray-300">💬 Natural conversations:</strong> Ask follow-up questions, I'll remember our chat!
            </p>
            {messages.length > 2 && (
              <p className="mt-1">
                <strong className="text-gray-300">📜 History:</strong> {messages.length - 1} messages in conversation
              </p>
            )}
          </div>
          <div className="text-right text-gray-500">
            <p><strong className="text-gray-400">Press Enter</strong> to send</p>
            <p><strong className="text-gray-400">Shift+Enter</strong> for new line</p>
          </div>
        </div>

        {/* Source indicator */}
        {responseSource && (
          <div className="mt-2 text-xs text-center text-gray-400">
            {responseSource === 'ollama' && '🤖 Powered by local Ollama AI (qwen2.5:3b)'}
            {responseSource === 'pattern' && '🔍 Pattern-based assistant'}
            {responseSource === 'fallback' && '⚡ Quick fallback response'}
          </div>
        )}
      </div>
    </div>
  );
};
