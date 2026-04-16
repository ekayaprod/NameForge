import { test, describe } from 'node:test';
import assert from 'node:assert';
import { processApiResponse } from '../js/parser.js';

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
