/**
 * Phase 7: AI Environmental Assistant - Frontend Types
 */

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: string;
  confidence?: number;
  suggestions?: string[];
}

export interface AssistantContext {
  analysisId?: string;
  comparisonId?: string;
  location?: {
    name: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  ndviData?: {
    mean: number;
    std: number;
    min: number;
    max: number;
    date: string;
    cloudCoverage?: number;
  };
  comparisonData?: {
    earlierMean: number;
    laterMean: number;
    meanChange: number;
    changeDate: string;
    overlapPercent: number;
  };
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface AssistantQuery {
  message: string;
  context?: AssistantContext;
  conversationHistory?: ConversationMessage[];
}

export interface AssistantResponse {
  message: string;
  intent: string;
  confidence: number;
  suggestions?: string[];
  data?: {
    [key: string]: any;
  };
  metadata: {
    processingTime: number;
    contextUsed: boolean;
    patternMatched?: string;
    source?: 'ollama' | 'pattern' | 'fallback';
    ollamaAvailable?: boolean;
  };
}
