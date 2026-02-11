import { CONFIG } from './config.js';

export class GeminiService {
  constructor() {
    this.apiKey = "";
    this.model = "models/gemini-1.5-flash";
    this.history = []; // Stores { role: 'user'|'model', parts: [{text: ...}] }
    this.lastContextHash = ""; // To detect if we need to reset history
  }

  /**
   * Configures the service with the user's API key and preferred model.
   * @param {string} apiKey - The Google Gemini API key.
   * @param {string} model - The model identifier (e.g., 'models/gemini-1.5-flash').
   */
  configure(apiKey, model) {
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Clears the conversation history to start a fresh context.
   * Useful when switching modes or changing significant settings.
   */
  resetHistory() {
    this.history = [];
    this.lastContextHash = "";
  }

  /**
   * Generates content using the chat history.
   * @param {string} userPrompt - The user's message.
   * @param {string} systemInstructionText - The static system rules.
   * @param {string} contextHash - A hash/string representing the current settings (langs, themes).
   * @param {object} config - Generation config (temp, etc).
   * @param {AbortSignal} signal - For cancellation.
   */
  async generate(userPrompt, systemInstructionText, contextHash, config = {}, signal) {
    // If the context (settings) changed significantly, we might want to reset history.
    if (this.lastContextHash && this.lastContextHash !== contextHash) {
        console.log("Context changed, resetting history.");
        this.resetHistory();
    }
    this.lastContextHash = contextHash;

    const generationConfig = {
      temperature: config.temperature || 0.8,
      topP: config.topP || 0.9,
      maxOutputTokens: config.maxOutputTokens || 1024,
      responseMimeType: "application/json"
    };

    if (config.responseSchema) {
      generationConfig.responseSchema = config.responseSchema;
    }

    // Construct the request body
    const body = {
      contents: [...this.history, { role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: generationConfig,
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
      ]
    };

    // Add System Instruction if supported (v1beta)
    if (systemInstructionText) {
      body.systemInstruction = { parts: [{ text: systemInstructionText }] };
    }

    const response = await fetch(
      `${CONFIG.API_BASE_URL}${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `API Error ${response.status}`;
      try {
          const errJson = JSON.parse(errorText);
          if (errJson.error?.message) errorMsg = errJson.error.message;
      } catch(e) {}
      throw new Error(errorMsg);
    }

    const data = await response.json();

    // Check for safety blocking
    if (data.promptFeedback?.blockReason) {
      throw new Error(`Request blocked: ${data.promptFeedback.blockReason}`);
    }

    const candidate = data.candidates?.[0];
    if (!candidate) {
       throw new Error("No content generated.");
    }

    if (candidate.finishReason && !['STOP', 'MAX_TOKENS'].includes(candidate.finishReason)) {
        throw new Error(`Generation stopped: ${candidate.finishReason}`);
    }

    const responseText = candidate.content?.parts?.[0]?.text || "";

    // Update History
    this.history.push({ role: "user", parts: [{ text: userPrompt }] });
    this.history.push({ role: "model", parts: [{ text: responseText }] });

    // Prune history if too long to save tokens (keep last 20 turns)
    if (this.history.length > 20) {
        this.history = this.history.slice(this.history.length - 20);
    }

    return responseText;
  }
}

export const geminiService = new GeminiService();
