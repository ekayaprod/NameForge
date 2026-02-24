
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

  it('should use configured API key and model in generate calls via headers', async () => {
    const service = new GeminiService();
    const testKey = 'test-api-key-2';
    const testModel = 'models/test-model-2';
    service.configure(testKey, testModel);

    const mockFetch = mock.fn(async (url, options) => {
      assert.ok(!url.includes('key='));
      assert.ok(url.includes(testModel));
      assert.strictEqual(options.headers['x-goog-api-key'], testKey);
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

  it('should retry on 503 error and succeed', async () => {
    const service = new GeminiService();
    let attempt = 0;

    // Mock fetch to fail once with 503 then succeed
    global.fetch = mock.fn(async () => {
      attempt++;
      if (attempt === 1) {
        return {
          ok: false,
          status: 503,
          text: async () => JSON.stringify({ error: { message: "Service Unavailable" } })
        };
      }
      return {
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: { parts: [{ text: "Recovered" }] },
              finishReason: "STOP"
            }
          ]
        })
      };
    });

    // Reduce backoff for test speed by overriding the method wrapper or just ensuring it works
    // To properly test backoff without waiting, we'd need to mock setTimeout, but simple retry check is enough.
    // We can inject a smaller backoff by modifying the call inside if we exposed it, but here we rely on default.
    // Actually, waiting 1s in test is annoying. I'll override _fetchWithRetry for this instance.
    const originalFetchWithRetry = service._fetchWithRetry;
    service._fetchWithRetry = function(url, options, retries, backoff) {
        return originalFetchWithRetry.call(this, url, options, retries, 1); // 1ms backoff
    };

    const result = await service.generate("Hello", "System", "Hash");
    assert.strictEqual(result, "Recovered");
    assert.strictEqual(attempt, 2);
  });

  it('should throw error after max retries', async () => {
    const service = new GeminiService();
    let attempt = 0;

    global.fetch = mock.fn(async () => {
      attempt++;
      return {
        ok: false,
        status: 503,
        text: async () => "Unavailable"
      };
    });

    // Reduce backoff for test speed
    const originalFetchWithRetry = service._fetchWithRetry;
    service._fetchWithRetry = function(url, options, retries, backoff) {
        return originalFetchWithRetry.call(this, url, options, retries, 1);
    };

    await assert.rejects(
      async () => await service.generate("Hello", "System", "Hash"),
      /API Error 503/
    );
    // Initial + 3 retries = 4 attempts
    assert.strictEqual(attempt, 4);
  });
});
