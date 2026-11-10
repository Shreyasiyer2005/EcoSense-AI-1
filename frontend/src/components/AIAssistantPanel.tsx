/**
 * AI Assistant Panel - Compact version for right sidebar
 */

import { useState } from 'react';
import { MessageSquare, Send, Loader } from 'lucide-react';

export default function AIAssistantPanel() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const suggestedQuestions = [
    'What is the current vegetation health in Gonikoppal?',
    'Compare NDVI between two dates',
    'What are the recent changes in this area?'
  ];

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    // Would integrate with actual Ollama service
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setInput('');
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 bg-[#1a2332] border-b border-gray-800">
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare className="w-5 h-5 text-green-500" />
          <h3 className="text-white font-semibold">AI Assistant</h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-green-400">Ollama Connected</span>
        </div>
      </div>

      {/* Assistant Info */}
      <div className="p-4 bg-gradient-to-br from-green-900/20 to-blue-900/20 border-b border-gray-800">
        <div className="text-xs text-gray-300 mb-2">
          <strong className="text-white">Local AI Assistant</strong>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Ollama • qwen2.5:3b • Model context: 8,192 tokens
        </p>
        <p className="text-xs text-gray-500">
          Ask questions about vegetation, land cover, NDVI analysis and environmental trends in Coorg.
        </p>
      </div>

      {/* Suggested Questions */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <div className="text-xs text-gray-400 mb-2">Suggested Questions:</div>
        {suggestedQuestions.map((question, idx) => (
          <button
            key={idx}
            onClick={() => setInput(question)}
            className="w-full text-left p-3 bg-[#1a2332] hover:bg-[#1f2937] border border-gray-700 rounded-lg text-xs text-gray-300 transition-colors"
          >
            {question}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 bg-[#1a2332] border-t border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask a question..."
            className="flex-1 px-3 py-2 bg-[#0f1419] border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
