
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

  it('should correctly configure API key and model', () => {
    const service = new GeminiService();
    const testKey = 'test-api-key';
    const testModel = 'models/test-model';

    service.configure(testKey, testModel);

    assert.strictEqual(service.apiKey, testKey);
    assert.strictEqual(service.model, testModel);
  });

  it('should reset history and context hash', () => {
    const service = new GeminiService();
    service.history = [{ role: 'user', parts: [{ text: 'hi' }] }];
    service.lastContextHash = 'some-hash';

    service.resetHistory();

    assert.strictEqual(service.history.length, 0);
    assert.strictEqual(service.lastContextHash, '');
  });

  it('should use configured API key and model in generate calls', async () => {
    const service = new GeminiService();
    const testKey = 'test-api-key-2';
    const testModel = 'models/test-model-2';
    service.configure(testKey, testModel);

    const mockFetch = mock.fn(async (url) => {
      assert.ok(url.includes(`key=${testKey}`));
      assert.ok(url.includes(testModel));
      return {
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "response" }] }, finishReason: "STOP" }]
        })
      };
    });
    global.fetch = mockFetch;

    await service.generate("Hello", "System Instruction", "ContextHash");
    assert.strictEqual(mockFetch.mock.callCount(), 1);
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
