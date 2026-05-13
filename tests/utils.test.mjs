import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { el, debounce, extractJsonObjects } from '../js/utils.js';

describe('el', () => {
    let originalDocument;

    beforeEach(() => {
        originalDocument = global.document;
        global.document = {
            createElement: (tag) => ({
                tagName: tag.toUpperCase(),
                className: ''
            })
        };
    });

    afterEach(() => {
        global.document = originalDocument;
    });

    test('creates an element with the correct tag', () => {
        const div = el('div');
        assert.strictEqual(div.tagName, 'DIV');
        assert.strictEqual(div.className, '');
    });

    test('creates an element with a class name', () => {
        const span = el('span', 'foo');
        assert.strictEqual(span.tagName, 'SPAN');
        assert.strictEqual(span.className, 'foo');
    });

    test('handles empty class name', () => {
        const p = el('p', '');
        assert.strictEqual(p.tagName, 'P');
        assert.strictEqual(p.className, '');
    });
});

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

    test('supports incremental parsing with startIndex', () => {
        const text = '{"name": "A"} {"name": "B"}';
        // When using returnIndex=true, we expect EXACTLY what was found since startIndex
        const { results, lastIndex } = extractJsonObjects(text, 0, true);
        assert.deepStrictEqual(results, [{name: "A"}, {name: "B"}]);
        assert.strictEqual(lastIndex, 27);

        const { results: results2, lastIndex: lastIndex2 } = extractJsonObjects(text, 13, true);
        assert.deepStrictEqual(results2, [{name: "B"}]);
        assert.strictEqual(lastIndex2, 27);
    });
});
