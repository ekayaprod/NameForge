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

    test('returns the correct lastIndex when returnIndex is true', () => {
        const text = '[{"name": "A"}, {"name": "B"}] , {"name": "C';
        const { results, lastIndex } = extractJsonObjects(text, true);

        assert.deepStrictEqual(results, [{name: "A"}, {name: "B"}]);
        // The last consumed character is the '}' of the second object.
        // '[{"name": "A"}, {"name": "B"}]' -> length is 30
        // Wait, the utility extracts objects { ... }, so it should find {"name": "A"} and {"name": "B"}
        // let's trace:
        // [ { " n a m e " :   " A " } ,   { " n a m e " :   " B " } ]   ,   { " n a m e " :   " C
        // 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
        //                     ^13                 ^28
        // So results should have two objects, and lastIndex should be 29 (index after the '}' of the second object).
        assert.strictEqual(lastIndex, 29);
    });
});
