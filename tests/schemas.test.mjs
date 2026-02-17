import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createArraySchema, FORGE_SCHEMA, HARMONIZER_SCHEMA } from '../js/schemas.js';

describe('Schema Builder', () => {
  it('should create a correct array schema with given properties and required fields', () => {
    const properties = {
      testField: { type: 'STRING' }
    };
    const required = ['testField'];
    const schema = createArraySchema(properties, required);

    assert.strictEqual(schema.type, 'ARRAY');
    assert.strictEqual(schema.items.type, 'OBJECT');
    assert.deepStrictEqual(schema.items.properties, properties);
    assert.deepStrictEqual(schema.items.required, required);
  });

  it('FORGE_SCHEMA should have correct structure', () => {
    assert.strictEqual(FORGE_SCHEMA.type, 'ARRAY');
    assert.deepStrictEqual(FORGE_SCHEMA.items.required, ["name", "roots", "meaning", "cluster"]);
  });

  it('HARMONIZER_SCHEMA should have correct structure', () => {
    assert.strictEqual(HARMONIZER_SCHEMA.type, 'ARRAY');
    assert.deepStrictEqual(HARMONIZER_SCHEMA.items.required, ["name", "valid", "pronunciations", "semanticCheck"]);
  });
});
