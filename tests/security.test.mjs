import { test } from 'node:test';
import assert from 'node:assert';
import { sanitizeInput } from '../js/security.js';
import { FORGE_RUNTIME_SCHEMA, HARMONIZER_RUNTIME_SCHEMA } from '../js/schemas.js';

test('sanitizeInput should strip control characters', () => {
    const input = 'Hello\x00World';
    const expected = 'HelloWorld';
    assert.strictEqual(sanitizeInput(input), expected);
});

test('sanitizeInput should escape HTML', () => {
    const input = '<script>alert("XSS")</script>';
    const expected = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;';
    assert.strictEqual(sanitizeInput(input), expected);
});

test('sanitizeInput should limit length', () => {
    const input = 'a'.repeat(600);
    const output = sanitizeInput(input);
    assert.strictEqual(output.length, 500);
});

test('FORGE_RUNTIME_SCHEMA should validate correct object', () => {
    const valid = {
        name: "Test",
        roots: "Root",
        meaning: "Meaning",
        cluster: "Cluster"
    };
    const result = FORGE_RUNTIME_SCHEMA.safeParse(valid);
    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.data, valid);
});

test('FORGE_RUNTIME_SCHEMA should fail on invalid object', () => {
    const invalid = {
        name: "Test",
        // missing roots, meaning, cluster
    };
    const result = FORGE_RUNTIME_SCHEMA.safeParse(invalid);
    assert.strictEqual(result.success, false);
});

test('HARMONIZER_RUNTIME_SCHEMA should validate correct object', () => {
    const valid = {
        name: "Test",
        valid: true,
        pronunciations: [
            { lang: "en", phonetic: "test" }
        ],
        semanticCheck: "Pass"
    };
    const result = HARMONIZER_RUNTIME_SCHEMA.safeParse(valid);
    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.data, valid);
});

test('HARMONIZER_RUNTIME_SCHEMA should fail on invalid nested object', () => {
    const invalid = {
        name: "Test",
        valid: true,
        pronunciations: [
            { lang: "en" } // missing phonetic
        ],
        semanticCheck: "Pass"
    };
    const result = HARMONIZER_RUNTIME_SCHEMA.safeParse(invalid);
    assert.strictEqual(result.success, false);
});
