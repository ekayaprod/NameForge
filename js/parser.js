import { logError } from './state.js';
import { FORGE_RUNTIME_SCHEMA, HARMONIZER_RUNTIME_SCHEMA } from './schemas.js';

/**
 * Parses the raw text response from the API into a JSON array.
 * Attempts to extract JSON from markdown code blocks if direct parsing fails.
 * @param {string} text - The raw text response from the API.
 * @returns {Array<Object>} The parsed array of generated name objects.
 */
export function parseApiResponse(text) {
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch (e) {
      console.warn("Direct JSON parse failed, attempting cleanup:", e);
      let cleanedText = text;
      if (text.includes('```')) {
          const startIdx = text.indexOf('```');
          const lastIdx = text.lastIndexOf('```');
          if (startIdx !== lastIdx && lastIdx > startIdx) {
              const firstNewline = text.indexOf('\n', startIdx);
              const contentStart = (firstNewline !== -1 && firstNewline < lastIdx) ? firstNewline + 1 : startIdx + 3;
              cleanedText = text.substring(contentStart, lastIdx);
          } else {
              cleanedText = text.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '');
          }
      }
      cleanedText = cleanedText.trim();
      try {
          const parsed = JSON.parse(cleanedText);
          if (Array.isArray(parsed)) return parsed;
      } catch(e2) {
          console.warn("Cleanup parse failed:", e2);
      }

      logError("Failed to parse API response");
      return [];
    }
}

/**
 * Processes and validates the raw array of objects returned from the API.
 * Filters out items that fail schema validation or match the user's blacklist.
 * Normalizes characters based on the selected output alphabet.
 * @param {Array<Object>} rawArray - The unvalidated array of objects.
 * @param {string} mode - The current application mode ('forge' or 'harmonizer').
 * @param {Array<string>} userBlacklist - Array of blacklisted substrings.
 * @param {string} outputAlphabet - The selected output alphabet setting.
 * @returns {Array<Object>} The validated and processed array of name objects.
 */
export function processApiResponse(rawArray, mode, userBlacklist = [], outputAlphabet = 'Default') {
    if (!rawArray?.length) return [];
    const fullBlacklist = userBlacklist.map(b => b.toLowerCase());
    return rawArray.map(it => {
      // 1. Strict Schema Validation
      const schema = mode === 'forge' ? FORGE_RUNTIME_SCHEMA : HARMONIZER_RUNTIME_SCHEMA;
      const validation = schema.safeParse(it);

      if (!validation.success) {
          console.warn("Schema validation failed for item:", it, validation.error);
          return null;
      }

      const validItem = validation.data;

      let name = (validItem.name || "").toString().trim();
      if (!name || fullBlacklist.some(b => name.toLowerCase().includes(b))) return null;
      if (outputAlphabet === 'English (Simplified/No Accents)') {
        name = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      }
      const base = { name };
      if (mode === 'forge') {
          return { ...base,
            meaning: (validItem.meaning || "").toString().trim(),
            roots: (validItem.roots || "").toString().trim(),
            cluster: (validItem.cluster || "Misc").trim(),
          };
      } else {
          return { ...base,
            valid: validItem.valid === true,
            pronunciations: validItem.pronunciations || [],
            semanticCheck: validItem.semanticCheck || "Pass" // Default to Pass if not provided
          };
      }
    }).filter(Boolean);
}
