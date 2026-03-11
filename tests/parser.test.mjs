import { test, describe } from 'node:test';
import assert from 'node:assert';
import { extractJsonObjects } from '../js/utils.js';
import { parseApiResponse, processApiResponse } from '../js/parser.js';

describe('extractJsonObjects', () => {
    test('extracts complete objects from a JSON array string', () => {
        const text = '[{"name": "Name1"}, {"name": "Name2"}]';
        const results = extractJsonObjects(text);
        assert.deepStrictEqual(results, [{name: "Name1"}, {name: "Name2"}]);
    });

    test('extracts objects from partial string', () => {
        const text = '[{"name": "Name1"}, {"name": "Na';
        const results = extractJsonObjects(text);
        assert.deepStrictEqual(results, [{name: "Name1"}]);
    });

    test('handles nested objects', () => {
        const text = '[{"name": "Name1", "meta": {"foo": "bar"}}]';
        const results = extractJsonObjects(text);
        assert.deepStrictEqual(results, [{name: "Name1", meta: {foo: "bar"}}]);
    });

    test('handles escaped quotes', () => {
        const text = '[{"name": "Name\\\"1"}]';
        const results = extractJsonObjects(text);
        assert.deepStrictEqual(results, [{name: 'Name"1'}]);
    });

    test('handles multiple partial chunks simulation', () => {
        let text = '[';
        assert.deepStrictEqual(extractJsonObjects(text), []);

        text += '{"name": "A"';
        assert.deepStrictEqual(extractJsonObjects(text), []);

        text += '}';
        assert.deepStrictEqual(extractJsonObjects(text), [{name: "A"}]);

        text += ', {"name": "B"}';
        assert.deepStrictEqual(extractJsonObjects(text), [{name: "A"}, {name: "B"}]);
    });
});

describe('parseApiResponse', () => {
    test('parses perfectly formed JSON array', () => {
        const json = '[{"name": "test", "roots": "test", "meaning": "test", "cluster": "test"}]';
        const result = parseApiResponse(json, 'forge');
        assert.deepStrictEqual(result, [{"name": "test", "roots": "test", "meaning": "test", "cluster": "test"}]);
    });

    test('recovers from markdown formatting', () => {
        const json = '```json\n[{"name": "test", "roots": "test", "meaning": "test", "cluster": "test"}]\n```';
        const result = parseApiResponse(json, 'forge');
        assert.deepStrictEqual(result, [{"name": "test", "roots": "test", "meaning": "test", "cluster": "test"}]);
    });

    test('returns empty array for completely invalid string', () => {
        const result = parseApiResponse('not a json string at all', 'forge');
        assert.deepStrictEqual(result, []);
    });

    test('gracefully handles hallucinated keys and malformed JSON', () => {
        const malformed = '[{"name": "test", "roots": "test", "meaning": "test", "cluster": "test"}, {"id": "not-a-name", "extra_key": "hallucination"}]';
        const result = parseApiResponse(malformed, 'forge');
        assert.deepStrictEqual(result, []); // the parser completely fails the strict validation
    });

    test('parses perfectly formed JSON array for harmonizer', () => {
        const json = '[{"name": "test", "valid": true, "pronunciations": [{"lang": "en", "phonetic": "test"}], "semanticCheck": "Pass"}]';
        const result = parseApiResponse(json, 'harmonizer');
        assert.deepStrictEqual(result, [{"name": "test", "valid": true, "pronunciations": [{"lang": "en", "phonetic": "test"}], "semanticCheck": "Pass"}]);
    });
});

describe('processApiResponse', () => {
    test('validates perfectly formed Forge mode objects', () => {
        const raw = [{ name: "ValidName", roots: "A + B", meaning: "Test meaning", cluster: "Test Cluster" }];
        const result = processApiResponse(raw, 'forge');
        assert.deepStrictEqual(result, raw);
    });

    test('gracefully handles and filters out hallucinated keys and malformed objects', () => {
        const raw = [
            { name: "ValidName", roots: "A + B", meaning: "Test", cluster: "Test" }, // Valid
            { name: "InvalidName" }, // Missing required fields
            { not_a_name: "Hallucination" } // Completely wrong structure
        ];
        const result = processApiResponse(raw, 'forge');
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].name, "ValidName");
    });

    test('validates Harmonizer mode objects correctly', () => {
        const raw = [{
            name: "HarmonizerName",
            valid: true,
            pronunciations: [{ lang: "en", phonetic: "test" }],
            semanticCheck: "Pass"
        }];
        const result = processApiResponse(raw, 'harmonizer');
        assert.deepStrictEqual(result, raw);
    });

    test('applies blacklist securely', () => {
        const raw = [
            { name: "BadName", roots: "A", meaning: "A", cluster: "A" },
            { name: "GoodName", roots: "B", meaning: "B", cluster: "B" }
        ];
        const result = processApiResponse(raw, 'forge', ["bad"]);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].name, "GoodName");
    });
});
