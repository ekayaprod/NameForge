
import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { GeminiService } from '../js/api.js';

describe('GeminiService', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should throw an error when content is blocked for safety reasons', async () => {
    const service = new GeminiService();

    // Mock fetch to simulate safety block
    global.fetch = mock.fn(async () => {
      return {
        ok: true,
        json: async () => ({
          promptFeedback: {
            blockReason: "SAFETY"
          }
        })
      };
    });

    await assert.rejects(
      async () => {
        await service.generate("Hello", "System Instruction", "ContextHash");
      },
      {
        message: "Request blocked: SAFETY"
      }
    );
  });

  it('should generate content successfully when not blocked', async () => {
    const service = new GeminiService();
    const expectedContent = "Generated content";

    // Mock fetch to simulate success
    global.fetch = mock.fn(async () => {
      return {
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: { parts: [{ text: expectedContent }] },
              finishReason: "STOP"
            }
          ]
        })
      };
    });

    const result = await service.generate("Hello", "System Instruction", "ContextHash");
    assert.strictEqual(result, expectedContent);
  });
});
