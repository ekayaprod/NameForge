import { test, describe } from 'node:test';
import assert from 'node:assert';
import { debounce, extractJsonObjects } from '../js/utils.js';

describe('debounce', (t) => {
    test('executes after the specified delay', (t) => {
        t.mock.timers.enable();
        let called = false;
        const debounced = debounce(() => { called = true; }, 100);

        debounced();
        assert.strictEqual(called, false);

        t.mock.timers.tick(50);
        assert.strictEqual(called, false);

        t.mock.timers.tick(50);
        assert.strictEqual(called, true);
    });

    test('resets the timer if called again before delay', (t) => {
        t.mock.timers.enable();
        let callCount = 0;
        const debounced = debounce(() => { callCount++; }, 100);

        debounced();
        t.mock.timers.tick(50);
        assert.strictEqual(callCount, 0);

        debounced(); // Reset timer
        t.mock.timers.tick(50);
        assert.strictEqual(callCount, 0);

        t.mock.timers.tick(50);
        assert.strictEqual(callCount, 1);
    });

    test('passes arguments to the debounced function', (t) => {
        t.mock.timers.enable();
        let lastArgs = null;
        const debounced = debounce((...args) => { lastArgs = args; }, 100);

        debounced('arg1', 'arg2');
        t.mock.timers.tick(100);

        assert.deepStrictEqual(lastArgs, ['arg1', 'arg2']);
    });
});

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
