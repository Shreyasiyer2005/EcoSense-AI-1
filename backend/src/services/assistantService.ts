/**
 * Phase 7.2B: AI Environmental Assistant Service - Hybrid Architecture
 * Combines local Ollama LLM (conversational) with pattern-based fallback (deterministic)
 * Zero external API costs - uses local qwen2.5:3b model when available
 */

import { AssistantQuery, AssistantResponse, AssistantIntent, IntentPattern, AssistantContext, ConversationMessage } from '../types/assistant';
import { OllamaService, OllamaMessage } from './ollamaService';

export class AssistantService {
  private ollamaService: OllamaService;
  private ollamaHealthy: boolean = false;
  private lastHealthCheck: number = 0;
  private healthCheckInterval: number = 60000; // Check health every 60 seconds

  constructor() {
    this.ollamaService = new OllamaService();
    // Initial health check
    this.checkOllamaHealth();
  }

  /**
   * Check Ollama service health with caching
   */
  private async checkOllamaHealth(): Promise<boolean> {
    const now = Date.now();

    // Use cached health status if checked recently
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return this.ollamaHealthy;
    }

    this.lastHealthCheck = now;
    this.ollamaHealthy = await this.ollamaService.isHealthy();

    return this.ollamaHealthy;
  }

  private intentPatterns: IntentPattern[] = [
    {
      intent: AssistantIntent.GREETING,
      patterns: [
        /^(hi|hello|hey|greetings)/i,
        /^good (morning|afternoon|evening)/i,
        /^what (can|could) you (do|help)/i,
        /^how does this work/i
      ],
      priority: 1
    },
    {
      intent: AssistantIntent.EXPLAIN_NDVI,
      patterns: [
        /what (is|does) ndvi/i,
        /explain ndvi/i,
        /ndvi (mean|definition|calculation)/i,
        /normalized difference vegetation index/i,
        /how (is|does) ndvi (work|calculated)/i
      ],
      priority: 2
    },
    {
      intent: AssistantIntent.INTERPRET_RESULTS,
      patterns: [
        /what (does|do) (this|these|the) (result|number|value)s? mean/i,
        /interpret (this|these|the) (result|data|analysis)/i,
        /is (this|that) (good|bad|normal|healthy)/i,
        /vegetation (health|status|condition)/i,
        /how healthy is/i
      ],
      requiresContext: true,
      priority: 3
    },
    {
      intent: AssistantIntent.COMPARE_TEMPORAL,
      patterns: [
        /(compare|comparison|change|difference)/i,
        /what changed/i,
        /(has|did) (it|vegetation|ndvi) (changed|improved|degraded)/i,
        /temporal (analysis|trend)/i,
        /(increase|decrease|trend)/i
      ],
      requiresContext: true,
      priority: 3
    },
    {
      intent: AssistantIntent.DATA_QUALITY,
      patterns: [
        /(cloud|quality|reliable|accurate)/i,
        /can (i|we) trust/i,
        /how (good|accurate|reliable) is (this|the) data/i,
        /data quality/i,
        /confidence/i
      ],
      requiresContext: true,
      priority: 2
    },
    {
      intent: AssistantIntent.LOCATION_INFO,
      patterns: [
        /where (is|was) this/i,
        /(location|place|area|region)/i,
        /tell me about (this|the) location/i
      ],
      requiresContext: true,
      priority: 2
    },
    {
      intent: AssistantIntent.ENVIRONMENTAL_INSIGHT,
      patterns: [
        /environmental (impact|concern|issue)/i,
        /(deforestation|drought|stress)/i,
        /what (caused|causes) (this|that)/i,
        /(recommendation|suggest|advice)/i
      ],
      requiresContext: true,
      priority: 3
    },
    {
      intent: AssistantIntent.HOW_TO_USE,
      patterns: [
        /how (do i|to) (use|analyze|compare)/i,
        /next steps/i,
        /what should i do/i,
        /help me/i
      ],
      priority: 1
    }
  ];

  /**
   * Process user query with hybrid approach: Ollama first, pattern-based fallback
   */
  async processQuery(query: AssistantQuery): Promise<AssistantResponse> {
    const startTime = Date.now();

    // Validate input
    if (!query.message || typeof query.message !== 'string') {
      throw new Error('Invalid query message');
    }

    // Validate conversation history if provided
    if (query.conversationHistory) {
      this.validateConversationHistory(query.conversationHistory);
    }

    // Check if Ollama is available
    const ollamaAvailable = await this.checkOllamaHealth();

    // Try Ollama first if available
    if (ollamaAvailable) {
      try {
        const ollamaResponse = await this.processWithOllama(query);

        // Validate response against context to prevent hallucinations
        if (query.context) {
          const validation = this.ollamaService.validateResponse(ollamaResponse.message, query.context);

          if (!validation.isValid) {
            console.warn('Ollama response validation failed:', validation.warning);
            console.warn('Falling back to pattern-based assistant');
            // Fall through to pattern-based
          } else {
            const processingTime = Date.now() - startTime;
            return {
              message: ollamaResponse.message,
              intent: ollamaResponse.intent,
              confidence: ollamaResponse.confidence,
              suggestions: ollamaResponse.suggestions,
              data: ollamaResponse.data,
              metadata: {
                processingTime,
                contextUsed: !!query.context,
                source: 'ollama' as const,
                ollamaAvailable: true
              }
            };
          }
        } else {
          // No context to validate against, trust Ollama
          const processingTime = Date.now() - startTime;
          return {
            message: ollamaResponse.message,
            intent: ollamaResponse.intent,
            confidence: ollamaResponse.confidence,
            suggestions: ollamaResponse.suggestions,
            data: ollamaResponse.data,
            metadata: {
              processingTime,
              contextUsed: !!query.context,
              source: 'ollama' as const,
              ollamaAvailable: true
            }
          };
        }
      } catch (error: any) {
        console.error('Ollama processing failed:', error.message);
        console.log('Falling back to pattern-based assistant');
        // Fall through to pattern-based
      }
    }

    // Fallback to pattern-based assistant
    const intent = this.detectIntent(query.message, query.context);
    const response = this.generateResponse(intent, query.message, query.context);
    const processingTime = Date.now() - startTime;

    return {
      ...response,
      intent: intent.intent,
      metadata: {
        processingTime,
        contextUsed: !!query.context,
        patternMatched: intent.patternMatched,
        source: ollamaAvailable ? 'fallback' : 'pattern',
        ollamaAvailable
      }
    };
  }

  /**
   * Process query using Ollama conversational AI
   */
  private async processWithOllama(query: AssistantQuery): Promise<Omit<AssistantResponse, 'metadata' | 'intent'> & { intent: string }> {
    const messages: OllamaMessage[] = [];

    // Build system prompt with context if available
    if (query.context) {
      const systemPrompt = this.ollamaService.buildSystemPrompt(query.context);
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    } else {
      // Generic system prompt for general conversation
      messages.push({
        role: 'system',
        content: `You are a helpful AI assistant with broad knowledge across many domains. You have particular expertise in environmental science, satellite remote sensing, and vegetation monitoring as you are integrated into EcoSense AI, a platform for NDVI analysis.

You can help with general conversations, science, technology, programming, mathematics, environmental topics, and more. Answer questions directly and naturally without unnecessarily introducing environmental topics into unrelated conversations.

Be conversational, accurate, and helpful. If you don't know something, say so honestly.`
      });
    }

    // Add conversation history if provided
    if (query.conversationHistory && query.conversationHistory.length > 0) {
      // Add last 5 messages for context (to avoid token limits)
      const recentHistory = query.conversationHistory.slice(-5);

      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        }
      }
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: query.message
    });

    // Get response from Ollama
    const responseText = await this.ollamaService.chat(messages);

    // Detect intent for metadata (using pattern matching)
    const intent = this.detectIntent(query.message, query.context);

    // Generate contextual suggestions
    const suggestions = this.generateContextualSuggestions(query.context, intent.intent);

    return {
      message: responseText,
      intent: intent.intent,
      confidence: 0.85, // Ollama responses have good confidence
      suggestions,
      data: undefined
    };
  }

  /**
   * Validate conversation history format
   */
  private validateConversationHistory(history: ConversationMessage[]): void {
    if (!Array.isArray(history)) {
      throw new Error('Conversation history must be an array');
    }

    if (history.length > 20) {
      throw new Error('Conversation history exceeds maximum length of 20 messages');
    }

    for (const msg of history) {
      if (!msg.role || !msg.content) {
        throw new Error('Invalid conversation message format');
      }

      if (!['user', 'assistant', 'system'].includes(msg.role)) {
        throw new Error('Invalid message role: must be user, assistant, or system');
      }

      if (typeof msg.content !== 'string' || msg.content.length > 2000) {
        throw new Error('Invalid message content: must be string under 2000 characters');
      }
    }
  }

  /**
   * Generate contextual suggestions based on context and intent
   */
  private generateContextualSuggestions(context?: AssistantContext, intent?: string): string[] {
    const suggestions: string[] = [];

    if (context?.ndviData && !context.comparisonData) {
      suggestions.push('Compare with historical data');
      suggestions.push('Get environmental insights');
    }

    if (context?.comparisonData) {
      suggestions.push('What caused these changes?');
      suggestions.push('Is this trend concerning?');
    }

    if (context?.ndviData?.cloudCoverage && context.ndviData.cloudCoverage > 20) {
      suggestions.push('Check data quality');
    }

    // Add generic suggestions
    if (suggestions.length < 3) {
      const generic = [
        'What is NDVI?',
        'How do I interpret my results?',
        'Explain in simple terms',
        'What should I do next?'
      ];

      for (const s of generic) {
        if (suggestions.length < 4 && !suggestions.includes(s)) {
          suggestions.push(s);
        }
      }
    }

    return suggestions.slice(0, 4);
  }

  /**
   * Detect user intent using pattern matching
   */
  private detectIntent(message: string, context?: AssistantContext): { intent: AssistantIntent; patternMatched?: string } {
    const normalizedMessage = message.trim().toLowerCase();

    // Sort patterns by priority (higher priority first)
    const sortedPatterns = [...this.intentPatterns].sort((a, b) => b.priority - a.priority);

    for (const intentPattern of sortedPatterns) {
      // Skip if context required but not provided
      if (intentPattern.requiresContext && !context) {
        continue;
      }

      for (const pattern of intentPattern.patterns) {
        if (pattern.test(normalizedMessage)) {
          return {
            intent: intentPattern.intent,
            patternMatched: pattern.toString()
          };
        }
      }
    }

    return { intent: AssistantIntent.UNKNOWN };
  }

  /**
   * Generate response based on detected intent and context
   */
  private generateResponse(
    intentData: { intent: AssistantIntent; patternMatched?: string },
    message: string,
    context?: AssistantContext
  ): Omit<AssistantResponse, 'intent' | 'metadata'> {
    const { intent } = intentData;

    switch (intent) {
      case AssistantIntent.GREETING:
        return this.generateGreetingResponse();

      case AssistantIntent.EXPLAIN_NDVI:
        return this.generateNDVIExplanationResponse();

      case AssistantIntent.INTERPRET_RESULTS:
        return this.generateInterpretationResponse(context);

      case AssistantIntent.COMPARE_TEMPORAL:
        return this.generateComparisonResponse(context);

      case AssistantIntent.DATA_QUALITY:
        return this.generateDataQualityResponse(context);

      case AssistantIntent.LOCATION_INFO:
        return this.generateLocationInfoResponse(context);

      case AssistantIntent.ENVIRONMENTAL_INSIGHT:
        return this.generateEnvironmentalInsightResponse(context);

      case AssistantIntent.HOW_TO_USE:
        return this.generateHowToUseResponse();

      case AssistantIntent.UNKNOWN:
      default:
        return this.generateUnknownResponse(message);
    }
  }

  private generateGreetingResponse(): Omit<AssistantResponse, 'intent' | 'metadata'> {
    return {
      message: "Hello! I'm your AI Environmental Assistant. I can help you understand NDVI vegetation analysis, interpret satellite data, and track environmental changes over time. What would you like to know?",
      confidence: 1.0,
      suggestions: [
        "What is NDVI?",
        "Interpret my NDVI results",
        "Compare changes over time",
        "How do I use this tool?"
      ]
    };
  }

  private generateNDVIExplanationResponse(): Omit<AssistantResponse, 'intent' | 'metadata'> {
    return {
      message: "**NDVI (Normalized Difference Vegetation Index)** measures vegetation health using satellite data.\n\n" +
        "**How it works:**\n" +
        "- Healthy vegetation reflects more near-infrared (NIR) light and absorbs red light\n" +
        "- NDVI = (NIR - Red) / (NIR + Red)\n" +
        "- Uses Sentinel-2 bands: B08 (NIR) and B04 (Red)\n\n" +
        "**NDVI ranges:**\n" +
        "- **0.6 to 1.0**: Dense, healthy vegetation (forests, croplands)\n" +
        "- **0.3 to 0.6**: Moderate vegetation (grasslands, shrubs)\n" +
        "- **0.0 to 0.3**: Sparse vegetation or bare soil\n" +
        "- **Below 0.0**: Water bodies, clouds, or snow",
      confidence: 1.0,
      suggestions: [
        "Interpret my current results",
        "What factors affect NDVI?",
        "How is data quality assessed?"
      ]
    };
  }

  private generateInterpretationResponse(context?: AssistantContext): Omit<AssistantResponse, 'intent' | 'metadata'> {
    if (!context?.ndviData) {
      return {
        message: "I'd be happy to interpret your NDVI results, but I need an analysis to reference. Please run an NDVI analysis first, then ask me to interpret the results.",
        confidence: 0.5,
        suggestions: [
          "Search for a location",
          "Run NDVI analysis",
          "Learn about NDVI"
        ]
      };
    }

    const { mean, std, min, max, date, cloudCoverage } = context.ndviData;
    const location = context.location?.name || "this location";

    let healthAssessment = "";
    let interpretation = "";

    if (mean >= 0.6) {
      healthAssessment = "**Excellent vegetation health** 🌳";
      interpretation = "Dense, healthy vegetation cover typical of forests or thriving croplands.";
    } else if (mean >= 0.4) {
      healthAssessment = "**Good vegetation health** 🌱";
      interpretation = "Moderate to healthy vegetation, typical of grasslands, agricultural areas, or mixed landscapes.";
    } else if (mean >= 0.2) {
      healthAssessment = "**Sparse vegetation** 🏜️";
      interpretation = "Limited vegetation cover, possibly dry grasslands, degraded areas, or areas with bare soil.";
    } else {
      healthAssessment = "**Very sparse or no vegetation** 🪨";
      interpretation = "Minimal vegetation, typical of arid regions, urban areas, or water bodies.";
    }

    const variabilityNote = std > 0.2
      ? "High variability suggests a diverse landscape with mixed vegetation types."
      : "Low variability indicates relatively uniform vegetation cover.";

    const cloudNote = cloudCoverage && cloudCoverage > 10
      ? `\n\n⚠️ **Note**: ${cloudCoverage.toFixed(1)}% cloud coverage detected. Results may be affected in cloudy areas.`
      : "";

    return {
      message: `**NDVI Analysis for ${location}**\n` +
        `*Date: ${date}*\n\n` +
        `${healthAssessment}\n\n` +
        `**Key metrics:**\n` +
        `- Mean NDVI: **${mean.toFixed(3)}**\n` +
        `- Range: ${min.toFixed(3)} to ${max.toFixed(3)}\n` +
        `- Standard deviation: ${std.toFixed(3)}\n\n` +
        `**Interpretation:**\n${interpretation} ${variabilityNote}${cloudNote}`,
      confidence: 0.9,
      data: {
        healthCategory: mean >= 0.6 ? 'excellent' : mean >= 0.4 ? 'good' : mean >= 0.2 ? 'sparse' : 'minimal',
        meanNDVI: mean,
        variability: std > 0.2 ? 'high' : 'low'
      },
      suggestions: [
        "Compare with historical data",
        "Check data quality",
        "Get environmental insights"
      ]
    };
  }

  private generateComparisonResponse(context?: AssistantContext): Omit<AssistantResponse, 'intent' | 'metadata'> {
    if (!context?.comparisonData) {
      return {
        message: "To compare vegetation changes over time, please run a historical NDVI comparison first. This requires selecting two different dates for the same location.",
        confidence: 0.5,
        suggestions: [
          "Run historical comparison",
          "Learn about temporal analysis",
          "View current NDVI analysis"
        ]
      };
    }

    const { earlierMean, laterMean, meanChange, changeDate, overlapPercent } = context.comparisonData;
    const location = context.location?.name || "this location";

    let changeAssessment = "";
    let interpretation = "";
    let icon = "";

    if (meanChange > 0.05) {
      changeAssessment = "**Significant vegetation increase** 📈";
      interpretation = "Greening trend detected. This could indicate vegetation growth, agricultural activity, or improved rainfall.";
      icon = "🌱✨";
    } else if (meanChange > 0.01) {
      changeAssessment = "**Slight vegetation increase** ↗️";
      interpretation = "Minor greening trend. Vegetation is slightly improving or growing.";
      icon = "🌿";
    } else if (meanChange > -0.01) {
      changeAssessment = "**Stable vegetation** ➡️";
      interpretation = "Vegetation remains relatively stable with minimal changes.";
      icon = "🌲";
    } else if (meanChange > -0.05) {
      changeAssessment = "**Slight vegetation decrease** ↘️";
      interpretation = "Minor browning trend. Could be seasonal changes or early stress indicators.";
      icon = "🍂";
    } else {
      changeAssessment = "**Significant vegetation decrease** 📉";
      interpretation = "Browning trend detected. Possible causes: drought, deforestation, seasonal dieback, or land use changes.";
      icon = "⚠️";
    }

    const overlapNote = overlapPercent < 95
      ? `\n\n⚠️ **Coverage**: ${overlapPercent.toFixed(1)}% spatial overlap between observations.`
      : "";

    return {
      message: `**Temporal Comparison for ${location}** ${icon}\n` +
        `*Period: ${changeDate}*\n\n` +
        `${changeAssessment}\n\n` +
        `**Change metrics:**\n` +
        `- Earlier NDVI: **${earlierMean.toFixed(3)}**\n` +
        `- Later NDVI: **${laterMean.toFixed(3)}**\n` +
        `- Mean change: **${meanChange > 0 ? '+' : ''}${meanChange.toFixed(3)}** (${((meanChange / earlierMean) * 100).toFixed(1)}%)\n\n` +
        `**Analysis:**\n${interpretation}${overlapNote}`,
      confidence: 0.85,
      data: {
        changeCategory: meanChange > 0.05 ? 'significant_increase' :
                        meanChange > 0.01 ? 'slight_increase' :
                        meanChange > -0.01 ? 'stable' :
                        meanChange > -0.05 ? 'slight_decrease' : 'significant_decrease',
        meanChange,
        percentChange: (meanChange / earlierMean) * 100
      },
      suggestions: [
        "Get environmental insights",
        "Check data quality",
        "Interpret individual results"
      ]
    };
  }

  private generateDataQualityResponse(context?: AssistantContext): Omit<AssistantResponse, 'intent' | 'metadata'> {
    if (!context?.ndviData) {
      return {
        message: "Data quality assessment requires an active NDVI analysis. Please run an analysis first.",
        confidence: 0.5,
        suggestions: ["Run NDVI analysis", "Learn about Sentinel-2 data"]
      };
    }

    const { cloudCoverage, date } = context.ndviData;

    let qualityAssessment = "";
    let confidence = 0.9;

    if (!cloudCoverage || cloudCoverage < 5) {
      qualityAssessment = "**Excellent data quality** ✅\n\n" +
        "- Minimal or no cloud coverage\n" +
        "- Clear satellite observations\n" +
        "- High confidence in NDVI measurements";
    } else if (cloudCoverage < 20) {
      qualityAssessment = "**Good data quality** ✓\n\n" +
        `- ${cloudCoverage.toFixed(1)}% cloud coverage\n` +
        "- Most of the area has clear observations\n" +
        "- Reliable NDVI measurements for cloud-free pixels";
      confidence = 0.8;
    } else if (cloudCoverage < 50) {
      qualityAssessment = "**Moderate data quality** ⚠️\n\n" +
        `- ${cloudCoverage.toFixed(1)}% cloud coverage\n` +
        "- Significant cloud interference\n" +
        "- Results may be less reliable in affected areas";
      confidence = 0.6;
    } else {
      qualityAssessment = "**Limited data quality** ❌\n\n" +
        `- ${cloudCoverage.toFixed(1)}% cloud coverage\n` +
        "- Heavy cloud interference\n" +
        "- Consider selecting a different date for better results";
      confidence = 0.4;
    }

    return {
      message: `**Data Quality Assessment**\n*Date: ${date}*\n\n${qualityAssessment}\n\n` +
        "**Data source:** Sentinel-2 satellite (ESA)\n" +
        "**Spatial resolution:** 10m per pixel\n" +
        "**Bands used:** B04 (Red), B08 (NIR)\n\n" +
        "**Limitations:**\n" +
        "- Cloud and shadow pixels are masked but may affect coverage\n" +
        "- Atmospheric conditions can influence measurements\n" +
        "- Seasonal variations affect NDVI values naturally",
      confidence,
      suggestions: [
        "View analysis results",
        "Try a different date",
        "Learn about NDVI"
      ]
    };
  }

  private generateLocationInfoResponse(context?: AssistantContext): Omit<AssistantResponse, 'intent' | 'metadata'> {
    if (!context?.location) {
      return {
        message: "Please select a location to get information about it.",
        confidence: 0.5,
        suggestions: ["Search for a location", "How do I use this tool?"]
      };
    }

    const { name, coordinates } = context.location;

    return {
      message: `**Location Information**\n\n` +
        `**Name:** ${name}\n` +
        `**Coordinates:** ${coordinates.latitude.toFixed(4)}°N, ${Math.abs(coordinates.longitude).toFixed(4)}°${coordinates.longitude >= 0 ? 'E' : 'W'}\n\n` +
        "This analysis covers a 1km × 1km area (100 hectares) centered on these coordinates.\n\n" +
        "**Available analysis:**\n" +
        "- Current vegetation health (NDVI)\n" +
        "- Historical comparisons\n" +
        "- Temporal trend analysis",
      confidence: 0.95,
      data: {
        location: name,
        coordinates
      },
      suggestions: [
        "Run NDVI analysis",
        "Compare historical data",
        "Interpret results"
      ]
    };
  }

  private generateEnvironmentalInsightResponse(context?: AssistantContext): Omit<AssistantResponse, 'intent' | 'metadata'> {
    if (!context?.ndviData && !context?.comparisonData) {
      return {
        message: "Environmental insights require NDVI analysis data. Please run an analysis first.",
        confidence: 0.5,
        suggestions: ["Run NDVI analysis", "What is NDVI?"]
      };
    }

    let insights = "**Environmental Insights**\n\n";

    if (context.comparisonData) {
      const { meanChange } = context.comparisonData;

      insights += "**Temporal change analysis:**\n";

      if (meanChange < -0.05) {
        insights += "⚠️ **Significant vegetation loss detected**\n\n" +
          "**Possible causes:**\n" +
          "- Deforestation or land clearing\n" +
          "- Drought or water stress\n" +
          "- Agricultural harvesting\n" +
          "- Seasonal dieback\n" +
          "- Urban development\n\n" +
          "**Recommendations:**\n" +
          "- Monitor the area for continued degradation\n" +
          "- Investigate recent land use changes\n" +
          "- Compare with longer time series\n" +
          "- Consider ground truthing if accessible";
      } else if (meanChange > 0.05) {
        insights += "✅ **Positive vegetation growth detected**\n\n" +
          "**Possible causes:**\n" +
          "- Reforestation or afforestation efforts\n" +
          "- Increased rainfall or improved irrigation\n" +
          "- Agricultural crop growth\n" +
          "- Seasonal greening\n\n" +
          "**Recommendations:**\n" +
          "- Continue monitoring to track sustained growth\n" +
          "- Document successful environmental initiatives\n" +
          "- Compare with regional trends";
      } else {
        insights += "➡️ **Stable vegetation conditions**\n\n" +
          "**Interpretation:**\n" +
          "- No significant environmental changes\n" +
          "- Ecosystem appears balanced\n" +
          "- Seasonal variations within normal range\n\n" +
          "**Recommendations:**\n" +
          "- Maintain current monitoring schedule\n" +
          "- Use as baseline for future comparisons";
      }
    } else if (context.ndviData) {
      const { mean } = context.ndviData;

      insights += "**Current vegetation status:**\n";

      if (mean < 0.3) {
        insights += "⚠️ **Low vegetation cover**\n\n" +
          "**Considerations:**\n" +
          "- May be naturally arid or degraded\n" +
          "- Vulnerable to erosion\n" +
          "- Limited carbon sequestration\n\n" +
          "**Recommendations:**\n" +
          "- Assess restoration potential\n" +
          "- Monitor for further degradation\n" +
          "- Compare with historical data";
      } else if (mean >= 0.6) {
        insights += "✅ **Healthy vegetation cover**\n\n" +
          "**Benefits:**\n" +
          "- Strong carbon sequestration\n" +
          "- Good biodiversity potential\n" +
          "- Soil erosion protection\n\n" +
          "**Recommendations:**\n" +
          "- Monitor to maintain health\n" +
          "- Use as reference for nearby areas";
      }
    }

    return {
      message: insights,
      confidence: 0.75,
      suggestions: [
        "Compare with historical data",
        "Check data quality",
        "View detailed results"
      ]
    };
  }

  private generateHowToUseResponse(): Omit<AssistantResponse, 'intent' | 'metadata'> {
    return {
      message: "**How to Use EcoSense AI**\n\n" +
        "**1. Search for a location** 🗺️\n" +
        "   - Enter a place name (city, region, landmark)\n" +
        "   - Or enter coordinates (latitude, longitude)\n\n" +
        "**2. Run NDVI Analysis** 🛰️\n" +
        "   - Select a satellite observation date\n" +
        "   - View vegetation health map and statistics\n" +
        "   - Get AI interpretation of results\n\n" +
        "**3. Compare Over Time** 📊\n" +
        "   - Select two different dates\n" +
        "   - Detect changes in vegetation\n" +
        "   - Understand temporal trends\n\n" +
        "**4. Ask Questions** 💬\n" +
        "   - \"What do these results mean?\"\n" +
        "   - \"What changed between dates?\"\n" +
        "   - \"Is the data reliable?\"\n" +
        "   - \"Give me environmental insights\"\n\n" +
        "**Tips:**\n" +
        "- Choose dates with low cloud cover for best results\n" +
        "- Compare similar seasons for meaningful trends\n" +
        "- Use the chat to understand your analysis at any time",
      confidence: 1.0,
      suggestions: [
        "What is NDVI?",
        "Search for a location",
        "Explain data quality"
      ]
    };
  }

  private generateUnknownResponse(message: string): Omit<AssistantResponse, 'intent' | 'metadata'> {
    return {
      message: "I'm not sure I understand that question. I'm specialized in helping with NDVI vegetation analysis and satellite data interpretation.\n\n" +
        "**I can help you with:**\n" +
        "- Understanding NDVI and vegetation indices\n" +
        "- Interpreting your analysis results\n" +
        "- Comparing vegetation changes over time\n" +
        "- Assessing data quality\n" +
        "- Providing environmental insights\n" +
        "- Learning how to use this tool\n\n" +
        "Could you rephrase your question or ask about one of these topics?",
      confidence: 0.3,
      suggestions: [
        "What is NDVI?",
        "Interpret my results",
        "How do I use this?",
        "Compare vegetation changes"
      ]
    };
  }
}

export const assistantService = new AssistantService();
