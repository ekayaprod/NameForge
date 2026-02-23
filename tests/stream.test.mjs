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

    it('should yield chunks from streamGenerate', async () => {
        const service = new GeminiService();
        service.configure('key', 'model');

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

        global.fetch = mock.fn(async () => {
            return {
                ok: true,
                body: mockStream
            };
        });

        const stream = service.streamGenerate("prompt", "system", "hash");
        let result = "";
        for await (const chunk of stream) {
            result += chunk;
        }

        assert.strictEqual(result, "Chunk 1Chunk 2");
    });
});
