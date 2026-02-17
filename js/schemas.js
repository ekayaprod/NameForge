/**
 * Creates a schema for an array of objects.
 * Gemini response schemas often follow this pattern for structured output.
 *
 * @param {Object} properties - The properties of the object in the array.
 * @param {string[]} required - The required property names.
 * @returns {Object} The complete Gemini-compatible schema.
 */
export const createArraySchema = (properties, required) => ({
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties,
    required
  }
});

/**
 * Schema for the Forge mode results.
 */
export const FORGE_SCHEMA = createArraySchema({
  name: { type: "STRING" },
  roots: { type: "STRING" },
  meaning: { type: "STRING" },
  cluster: { type: "STRING" }
}, ["name", "roots", "meaning", "cluster"]);

/**
 * Schema for the Harmonizer mode results.
 */
export const HARMONIZER_SCHEMA = createArraySchema({
  name: { type: "STRING" },
  valid: { type: "BOOLEAN" },
  pronunciations: {
    type: "ARRAY",
    items: {
      type: "OBJECT",
      properties: {
        lang: { type: "STRING" },
        phonetic: { type: "STRING" }
      },
      required: ["lang", "phonetic"]
    }
  },
  semanticCheck: { type: "STRING" }
}, ["name", "valid", "pronunciations", "semanticCheck"]);
