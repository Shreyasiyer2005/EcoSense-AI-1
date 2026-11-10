/**
 * Phase 7.3B: Ollama Local LLM Service
 * Provides conversational AI capabilities using local Ollama installation
 * Model: qwen2.5:3b (3B parameters) - faster and more efficient
 * Fallback: llava:latest (7B parameters) - multimodal capability
 * Cost: ₹0 (local inference, no API charges)
 */

import { AssistantContext } from '../types/assistant';

/**
 * Message format for conversation history
 */
export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Ollama API response format
 */
interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_duration?: number;
  eval_duration?: number;
  eval_count?: number;
}

/**
 * Ollama chat API response format
 */
interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  eval_count?: number;
}

/**
 * Ollama health check response
 */
interface OllamaHealthResponse {
  status: string;
}

/**
 * Service for interacting with local Ollama LLM
 */
export class OllamaService {
  private readonly baseURL: string;
  private readonly model: string;
  private readonly timeout: number;
  private readonly maxTokens: number;

  constructor(
    baseURL: string = 'http://localhost:11434',
    model: string = 'qwen2.5:3b',
    timeout: number = 90000,
    maxTokens: number = 500
  ) {
    this.baseURL = baseURL;
    this.model = model;
    this.timeout = timeout;
    this.maxTokens = maxTokens;
  }

  /**
   * Check if Ollama service is available and healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second health check timeout

      const response = await fetch(`${this.baseURL}/api/version`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate a conversational response using the chat API
   * Supports conversation history for follow-up questions
   */
  async chat(messages: OllamaMessage[]): Promise<string> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const requestBody = {
        model: this.model,
        messages: messages,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: this.maxTokens,
          top_p: 0.9,
          top_k: 40
        }
      };

      const response = await fetch(`${this.baseURL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error (${response.status}): ${errorText}`);
      }

      const data = await response.json() as OllamaChatResponse;

      if (!data.message || !data.message.content) {
        throw new Error('Invalid response format from Ollama');
      }

      return data.message.content.trim();

    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Ollama request timed out. The service may be slow or unavailable.');
      }
      throw error;
    }
  }

  /**
   * Generate a response using the simpler generate API (no conversation history)
   */
  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const fullPrompt = systemPrompt
        ? `${systemPrompt}\n\nUser: ${prompt}\n\nAssistant:`
        : prompt;

      const requestBody = {
        model: this.model,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: this.maxTokens,
          top_p: 0.9,
          top_k: 40
        }
      };

      const response = await fetch(`${this.baseURL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error (${response.status}): ${errorText}`);
      }

      const data = await response.json() as OllamaGenerateResponse;

      if (!data.response) {
        throw new Error('Invalid response format from Ollama');
      }

      return data.response.trim();

    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Ollama request timed out. The service may be slow or unavailable.');
      }
      throw error;
    }
  }

  /**
   * Build a system prompt that includes EcoSense AI context
   */
  buildSystemPrompt(context?: AssistantContext): string {
    let systemPrompt = `You are a helpful AI assistant with broad knowledge across many domains. You have particular expertise in environmental science, satellite remote sensing, and vegetation monitoring as you are integrated into EcoSense AI, a platform for NDVI analysis.

You can help with:
- General conversations, questions, and explanations on any topic
- Science, technology, mathematics, and education
- Programming, coding, and technical questions
- Environmental science and ecology
- Satellite imagery and remote sensing
- NDVI (Normalized Difference Vegetation Index) analysis
- Vegetation health monitoring
- Guidance on using the EcoSense AI platform

Important guidelines:
- Answer the user's actual question directly without unnecessarily introducing unrelated topics
- Be conversational, clear, and naturally helpful
- Use markdown formatting for readability when appropriate
- For NDVI analysis questions, cite the specific data values provided in the context
- Never fabricate measurements, satellite observations, or research findings
- If you don't have information or cannot answer, say so honestly
- Maintain a friendly, professional, and approachable tone
- When discussing EcoSense AI features, only mention capabilities that exist`;

    if (context) {
      systemPrompt += '\n\n**Current EcoSense AI Analysis Context:**';

      if (context.location) {
        systemPrompt += `\n- Location: ${context.location.name}`;
        systemPrompt += `\n- Coordinates: ${context.location.coordinates.latitude.toFixed(4)}°N, ${context.location.coordinates.longitude.toFixed(4)}°E`;
      }

      if (context.ndviData) {
        systemPrompt += `\n- NDVI Analysis Results:`;
        systemPrompt += `\n  * Mean NDVI: ${context.ndviData.mean.toFixed(3)}`;
        systemPrompt += `\n  * Range: ${context.ndviData.min.toFixed(3)} to ${context.ndviData.max.toFixed(3)}`;
        systemPrompt += `\n  * Standard Deviation: ${context.ndviData.std.toFixed(3)}`;
        systemPrompt += `\n  * Observation Date: ${context.ndviData.date}`;
        if (context.ndviData.cloudCoverage !== undefined) {
          systemPrompt += `\n  * Cloud Coverage: ${context.ndviData.cloudCoverage.toFixed(1)}%`;
        }

        // Add health assessment context
        const mean = context.ndviData.mean;
        let health = '';
        if (mean >= 0.6) health = 'Excellent (dense, healthy vegetation)';
        else if (mean >= 0.4) health = 'Good (moderate vegetation cover)';
        else if (mean >= 0.2) health = 'Fair (sparse vegetation)';
        else health = 'Poor (minimal or no vegetation)';
        systemPrompt += `\n  * Vegetation Health: ${health}`;
      }

      if (context.comparisonData) {
        systemPrompt += `\n- Historical Comparison Data:`;
        systemPrompt += `\n  * Earlier NDVI: ${context.comparisonData.earlierMean.toFixed(3)}`;
        systemPrompt += `\n  * Later NDVI: ${context.comparisonData.laterMean.toFixed(3)}`;
        systemPrompt += `\n  * Change: ${context.comparisonData.meanChange > 0 ? '+' : ''}${context.comparisonData.meanChange.toFixed(3)} (${((context.comparisonData.meanChange / context.comparisonData.earlierMean) * 100).toFixed(1)}%)`;
        systemPrompt += `\n  * Time Period: ${context.comparisonData.changeDate}`;
        systemPrompt += `\n  * Spatial Overlap: ${context.comparisonData.overlapPercent.toFixed(1)}%`;
      }

      systemPrompt += '\n\nWhen answering questions about this analysis, reference these specific values. Do not make up or estimate any measurements.';

      if (!context.ndviData && !context.comparisonData) {
        systemPrompt += '\n\n**Note:** No NDVI analysis data is currently available. If the user asks about their results, guide them to run an analysis first using the EcoSense AI platform.';
      }
    } else {
      // No context provided - general conversation mode
      systemPrompt += `\n\n**EcoSense AI Platform Features:**
- Location search and geocoding
- Sentinel-2 satellite imagery search
- NDVI analysis and visualization
- Historical temporal comparison (two dates)
- AI assistant (this conversation)

When users ask about EcoSense AI features, reference only these actual capabilities.`;
    }

    return systemPrompt;
  }

  /**
   * Validate that the response doesn't contain hallucinated NDVI values
   */
  validateResponse(response: string, context?: AssistantContext): { isValid: boolean; warning?: string } {
    if (!context?.ndviData && !context?.comparisonData) {
      return { isValid: true };
    }

    // Extract numbers that look like NDVI values (0.xxx format)
    const ndviPattern = /\b0\.\d{1,3}\b/g;
    const extractedValues = response.match(ndviPattern)?.map(v => parseFloat(v)) || [];

    if (extractedValues.length === 0) {
      return { isValid: true };
    }

    // Build list of valid NDVI values from context
    const validValues: number[] = [];
    if (context.ndviData) {
      validValues.push(
        context.ndviData.mean,
        context.ndviData.std,
        context.ndviData.min,
        context.ndviData.max
      );
    }
    if (context.comparisonData) {
      validValues.push(
        context.comparisonData.earlierMean,
        context.comparisonData.laterMean,
        Math.abs(context.comparisonData.meanChange)
      );
    }

    // Check if any extracted value is suspicious (not in valid values, with tolerance)
    const tolerance = 0.005;
    const suspiciousValues = extractedValues.filter(extracted => {
      return !validValues.some(valid => Math.abs(extracted - valid) < tolerance);
    });

    if (suspiciousValues.length > 0) {
      return {
        isValid: false,
        warning: `Response contains potentially hallucinated NDVI values: ${suspiciousValues.join(', ')}`
      };
    }

    return { isValid: true };
  }

  /**
   * Get the current model name
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Get the base URL
   */
  getBaseURL(): string {
    return this.baseURL;
  }
}

// Export singleton instance with default configuration
export const ollamaService = new OllamaService();
