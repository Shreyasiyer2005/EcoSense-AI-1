/**
 * Phase 7: AI Environmental Assistant - Type Definitions
 * Deterministic context-aware assistant with pattern-based intent recognition
 */

export interface AssistantQuery {
  message: string;
  context?: AssistantContext;
  conversationHistory?: ConversationMessage[];
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

export enum AssistantIntent {
  GREETING = 'greeting',
  EXPLAIN_NDVI = 'explain_ndvi',
  INTERPRET_RESULTS = 'interpret_results',
  COMPARE_TEMPORAL = 'compare_temporal',
  LOCATION_INFO = 'location_info',
  DATA_QUALITY = 'data_quality',
  ENVIRONMENTAL_INSIGHT = 'environmental_insight',
  HOW_TO_USE = 'how_to_use',
  UNKNOWN = 'unknown'
}

export interface IntentPattern {
  intent: AssistantIntent;
  patterns: RegExp[];
  requiresContext?: boolean;
  priority: number;
}

/**
 * Conversation message for history tracking
 */
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}
