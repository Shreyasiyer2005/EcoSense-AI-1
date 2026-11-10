/**
 * Phase 7: AI Environmental Assistant - API Routes
 * Endpoint for processing user queries with context awareness
 */

import express, { Request, Response } from 'express';
import { assistantService } from '../services/assistantService';
import { AssistantQuery } from '../types/assistant';

const router = express.Router();

/**
 * POST /api/v1/assistant/query
 * Process a user query and return contextual response
 *
 * Request body:
 * {
 *   message: string,
 *   context?: {
 *     analysisId?: string,
 *     comparisonId?: string,
 *     location?: { name: string, coordinates: { latitude: number, longitude: number } },
 *     ndviData?: { mean: number, std: number, min: number, max: number, date: string, cloudCoverage?: number },
 *     comparisonData?: { earlierMean: number, laterMean: number, meanChange: number, changeDate: string, overlapPercent: number }
 *   },
 *   conversationHistory?: Array<{ role: 'user' | 'assistant', content: string, timestamp: string }>
 * }
 *
 * Response:
 * {
 *   message: string,
 *   intent: string,
 *   confidence: number,
 *   suggestions?: string[],
 *   data?: object,
 *   metadata: {
 *     processingTime: number,
 *     contextUsed: boolean,
 *     patternMatched?: string,
 *     source?: 'ollama' | 'pattern' | 'fallback',
 *     ollamaAvailable?: boolean
 *   }
 * }
 */
router.post('/query', async (req: Request, res: Response) => {
  try {
    const query: AssistantQuery = req.body;

    // Validate request
    if (!query.message || typeof query.message !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Query message is required and must be a string'
      });
    }

    if (query.message.length > 500) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Query message exceeds maximum length of 500 characters'
      });
    }

    // Validate conversation history if provided
    if (query.conversationHistory) {
      if (!Array.isArray(query.conversationHistory)) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Conversation history must be an array'
        });
      }

      if (query.conversationHistory.length > 20) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Conversation history exceeds maximum length of 20 messages'
        });
      }

      // Validate each message
      for (const msg of query.conversationHistory) {
        if (!msg.role || !msg.content) {
          return res.status(400).json({
            error: 'Invalid request',
            message: 'Each conversation message must have role and content'
          });
        }

        if (!['user', 'assistant', 'system'].includes(msg.role)) {
          return res.status(400).json({
            error: 'Invalid request',
            message: 'Message role must be user, assistant, or system'
          });
        }
      }
    }

    // Process query through assistant service
    const response = await assistantService.processQuery(query);

    return res.json(response);

  } catch (error: any) {
    console.error('Error processing assistant query:', error);

    // Return user-friendly error messages
    if (error.message.includes('Invalid')) {
      return res.status(400).json({
        error: 'Invalid request',
        message: error.message
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process query'
    });
  }
});

/**
 * GET /api/v1/assistant/capabilities
 * Return information about assistant capabilities
 */
router.get('/capabilities', (req: Request, res: Response) => {
  res.json({
    name: 'EcoSense AI Environmental Assistant',
    version: '2.0.0',
    type: 'hybrid',
    description: 'Conversational AI (Ollama qwen2.5:3b) with deterministic fallback',
    capabilities: [
      'Natural language conversations',
      'Follow-up questions with context',
      'NDVI explanation and education',
      'Analysis result interpretation',
      'Temporal comparison analysis',
      'Data quality assessment',
      'Location information',
      'Environmental insights and recommendations',
      'Usage guidance'
    ],
    intents: [
      'greeting',
      'explain_ndvi',
      'interpret_results',
      'compare_temporal',
      'location_info',
      'data_quality',
      'environmental_insight',
      'how_to_use',
      'conversational'
    ],
    features: {
      conversationHistory: true,
      contextAware: true,
      hallucinationPrevention: true,
      gracefulFallback: true
    },
    models: {
      primary: 'ollama/qwen2.5:3b (3B, local, fast)',
      fallback: 'pattern-based (deterministic)'
    },
    externalAPIs: false,
    cost: '₹0 (local inference only)'
  });
});

export default router;
