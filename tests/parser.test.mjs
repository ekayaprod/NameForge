import { test } from 'node:test';
import assert from 'node:assert';
import { extractJsonObjects } from '../js/utils.js';

test('extractJsonObjects extracts complete objects from a JSON array string', () => {
    const text = '[{"name": "Name1"}, {"name": "Name2"}]';
    const results = extractJsonObjects(text);
    assert.deepStrictEqual(results, [{name: "Name1"}, {name: "Name2"}]);
});

test('extractJsonObjects extracts objects from partial string', () => {
    const text = '[{"name": "Name1"}, {"name": "Na';
    const results = extractJsonObjects(text);
    assert.deepStrictEqual(results, [{name: "Name1"}]);
});

test('extractJsonObjects handles nested objects', () => {
    const text = '[{"name": "Name1", "meta": {"foo": "bar"}}]';
    const results = extractJsonObjects(text);
    assert.deepStrictEqual(results, [{name: "Name1", meta: {foo: "bar"}}]);
});

test('extractJsonObjects handles escaped quotes', () => {
    const text = '[{"name": "Name\\"1"}]';
    const results = extractJsonObjects(text);
    assert.deepStrictEqual(results, [{name: 'Name"1'}]);
});

test('extractJsonObjects handles multiple partial chunks simulation', () => {
    let text = '[';
    assert.deepStrictEqual(extractJsonObjects(text), []);

    text += '{"name": "A"';
    assert.deepStrictEqual(extractJsonObjects(text), []);

    text += '}';
    assert.deepStrictEqual(extractJsonObjects(text), [{name: "A"}]);

    text += ', {"name": "B"}';
    assert.deepStrictEqual(extractJsonObjects(text), [{name: "A"}, {name: "B"}]);
});
