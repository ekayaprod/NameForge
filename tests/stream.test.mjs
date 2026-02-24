import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { GeminiService } from '../js/api.js';

describe('GeminiService Stream', () => {
    let originalFetch;

    beforeEach(() => {
        originalFetch = global.fetch;
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('should yield chunks from streamGenerate and use headers for API key', async () => {
        const service = new GeminiService();
        const testKey = 'test-stream-key';
        service.configure(testKey, 'model');

        // Simulate a stream of JSON objects as bytes
        const mockStream = new ReadableStream({
            start(controller) {
                const chunks = [
                    JSON.stringify({ candidates: [{ content: { parts: [{ text: "Chunk 1" }] } }] }),
                    JSON.stringify({ candidates: [{ content: { parts: [{ text: "Chunk 2" }] } }] })
                ];

                const encoder = new TextEncoder();
                chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk)));
                controller.close();
            }
        });

        const mockFetch = mock.fn(async (url, options) => {
            assert.ok(!url.includes('key='));
            assert.strictEqual(options.headers['x-goog-api-key'], testKey);
            return {
                ok: true,
                body: mockStream
            };
        });
        global.fetch = mockFetch;

        const stream = service.streamGenerate("prompt", "system", "hash");
        let result = "";
        for await (const chunk of stream) {
            result += chunk;
        }

        assert.strictEqual(result, "Chunk 1Chunk 2");
    });
});
