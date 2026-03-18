import { z } from './validation.js';

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

/**
 * Runtime schema for validating Forge mode results.
 */
export const FORGE_RUNTIME_SCHEMA = z.object({
  name: z.string(),
  roots: z.string(),
  meaning: z.string(),
  cluster: z.string()
});

/**
 * Runtime schema for validating Harmonizer mode results.
 */
export const HARMONIZER_RUNTIME_SCHEMA = z.object({
  name: z.string(),
  valid: z.boolean(),
  pronunciations: z.array(z.object({
    lang: z.string(),
    phonetic: z.string()
  })),
  semanticCheck: z.string()
});

/**
 * Runtime schema for validating Gemini API error responses.
 */
export const API_ERROR_SCHEMA = z.object({
  error: z.object({
    message: z.string().optional()
  }).optional()
});

/**
 * Runtime schema for validating Gemini streaming generation chunks.
 */
export const STREAM_CHUNK_SCHEMA = z.object({
  candidates: z.array(z.object({
    content: z.object({
      parts: z.array(z.object({
        text: z.string().optional()
      })).optional()
    }).optional()
  })).optional()
});
