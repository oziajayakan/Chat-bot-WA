import { logger } from './logger.js';

/**
 * OpenRouter Service - Multi-model LLM provider
 */
class OpenRouterService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    this.defaultModel = process.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-3.5-sonnet';

    // Daftar model yang tersedia (bisa di-fetch dinamis juga)
    this.availableModels = [
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
      { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic' },
      { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
      { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
      { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', provider: 'Google' },
      { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'Meta' },
      { id: 'mistralai/mistral-large', name: 'Mistral Large', provider: 'Mistral' },
      { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B', provider: 'Qwen' }
    ];
  }

  async chat(messages, options = {}) {
    const {
      model = this.defaultModel,
      temperature = 0.7,
      maxTokens = 2000,
      stream = false,
      userId = 'unknown'
    } = options;

    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY belum diset di .env');
    }

    const systemPrompt = {
      role: 'system',
      content: process.env.SYSTEM_PROMPT || 'Kamu adalah asisten AI yang ramah dan helpful.'
    };

    const payload = {
      model,
      messages: [systemPrompt, ...messages],
      temperature,
      max_tokens: maxTokens,
      stream,
      // Optional: routing preference
      // provider: { order: ['Anthropic', 'OpenAI'] }
    };

    const startTime = Date.now();
    logger.info('OpenRouter', `Request → ${model} | user=${userId}`, {
      msgCount: messages.length,
      stream
    });

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.CORS_ORIGIN || 'http://localhost:3000',
          'X-Title': 'Chatbot Assistant'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        logger.error('OpenRouter', `HTTP ${response.status}: ${errText}`);
        throw new Error(`OpenRouter error: ${response.status}`);
      }

      if (stream) {
        return this._handleStream(response, model, userId, startTime);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;
      const reply = data.choices[0]?.message?.content || '';
      const tokens = data.usage?.total_tokens || 0;

      logger.info('OpenRouter', `Response ← ${model} | ${duration}ms | ${tokens} tokens`, {
        finishReason: data.choices[0]?.finish_reason
      });

      return {
        content: reply,
        model: data.model,
        tokens,
        duration,
        usage: data.usage
      };
    } catch (err) {
      logger.error('OpenRouter', `Failed: ${err.message}`);
      throw err;
    }
  }

  async *_handleStream(response, model, userId, startTime) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let totalTokens = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const json = JSON.parse(trimmed.slice(6));
            const delta = json.choices?.[0]?.delta?.content || '';
            if (delta) {
              fullContent += delta;
              yield { type: 'delta', content: delta, model: json.model };
            }
            if (json.usage) totalTokens = json.usage.total_tokens || totalTokens;
          } catch (_) { /* skip parse error */ }
        }
      }

      const duration = Date.now() - startTime;
      logger.info('OpenRouter', `Stream complete ← ${model} | ${duration}ms | ${totalTokens} tokens`);
      yield { type: 'done', content: fullContent, model, tokens: totalTokens, duration };
    } finally {
      reader.releaseLock();
    }
  }

  getModels() {
    return this.availableModels;
  }
}

export const openrouter = new OpenRouterService();
