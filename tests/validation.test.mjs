import { describe, it } from 'node:test';
import assert from 'node:assert';
import { z } from '../js/validation.js';

describe('Validation Library', () => {
  describe('z.string()', () => {
    it('should parse valid strings', () => {
      const schema = z.string();
      assert.strictEqual(schema.parse('hello'), 'hello');
      assert.strictEqual(schema.parse(''), '');
    });

    it('should throw error for non-string values', () => {
      const schema = z.string();
      assert.throws(() => schema.parse(123), /Expected string/);
      assert.throws(() => schema.parse(null), /Expected string/);
      assert.throws(() => schema.parse(undefined), /Expected string/);
      assert.throws(() => schema.parse({}), /Expected string/);
      assert.throws(() => schema.parse([]), /Expected string/);
      assert.throws(() => schema.parse(true), /Expected string/);
    });

    it('should safeParse valid strings', () => {
      const schema = z.string();
      const result = schema.safeParse('hello');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data, 'hello');
    });

    it('should safeParse invalid values', () => {
      const schema = z.string();
      const result = schema.safeParse(123);
      assert.strictEqual(result.success, false);
      assert.ok(result.error instanceof Error);
      assert.match(result.error.message, /Expected string/);
    });
  });

  describe('z.boolean()', () => {
    it('should parse valid booleans', () => {
      const schema = z.boolean();
      assert.strictEqual(schema.parse(true), true);
      assert.strictEqual(schema.parse(false), false);
    });

    it('should throw error for non-boolean values', () => {
      const schema = z.boolean();
      assert.throws(() => schema.parse('true'), /Expected boolean/);
      assert.throws(() => schema.parse(1), /Expected boolean/);
      assert.throws(() => schema.parse(null), /Expected boolean/);
    });
  });

  describe('z.array()', () => {
    it('should parse valid arrays', () => {
      const schema = z.array(z.string());
      assert.deepStrictEqual(schema.parse(['a', 'b']), ['a', 'b']);
      assert.deepStrictEqual(schema.parse([]), []);
    });

    it('should throw error for non-array values', () => {
      const schema = z.array(z.string());
      assert.throws(() => schema.parse('not an array'), /Expected array/);
    });

    it('should throw error if any item fails validation', () => {
      const schema = z.array(z.string());
      assert.throws(() => schema.parse(['a', 1]), /Array item at index 1: Expected string/);
    });
  });

  describe('z.object()', () => {
    it('should parse valid objects', () => {
      const schema = z.object({
        name: z.string(),
        age: z.boolean() // using boolean just to test
      });
      const input = { name: 'test', age: true };
      assert.deepStrictEqual(schema.parse(input), input);
    });

    it('should throw error for non-object values', () => {
      const schema = z.object({ name: z.string() });
      assert.throws(() => schema.parse('not an object'), /Expected object/);
      assert.throws(() => schema.parse(null), /Expected object, received null/);
      assert.throws(() => schema.parse([]), /Expected object, received object/); // Array is type object in JS, but z.object check excludes it
    });

    it('should throw error if any property fails validation', () => {
      const schema = z.object({ name: z.string() });
      assert.throws(() => schema.parse({ name: 123 }), /Property 'name': Expected string/);
    });

    it('should ignore extra properties not in schema', () => {
      const schema = z.object({ name: z.string() });
      const input = { name: 'test', extra: 'value' };
      assert.deepStrictEqual(schema.parse(input), { name: 'test' });
    });
  });

  describe('optional()', () => {
    it('should parse value if present', () => {
      const schema = z.string().optional();
      assert.strictEqual(schema.parse('hello'), 'hello');
    });

    it('should return undefined for null or undefined', () => {
      const schema = z.string().optional();
      assert.strictEqual(schema.parse(undefined), undefined);
      assert.strictEqual(schema.parse(null), undefined);
    });

    it('should still throw if value is present but wrong type', () => {
      const schema = z.string().optional();
      assert.throws(() => schema.parse(123), /Expected string/);
    });
  });
});
