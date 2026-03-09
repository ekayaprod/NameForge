/**
 * Global configuration constants for the application.
 * Defines API endpoints, versioning, constraints, and available options for generation.
 *
 * @type {{
 *   API_BASE_URL: string,
 *   APP_VERSION: string,
 *   MAX_SESSION_HISTORY: number,
 *   LANG_OPTIONS: string[],
 *   THEME_OPTIONS: string[],
 *   STYLE_OPTIONS: string[],
 *   MODEL_OPTIONS: Array<{value: string, text: string}>
 * }}
 */
export const CONFIG = {
  API_BASE_URL: "https://generativelanguage.googleapis.com/v1beta/",
  APP_VERSION: "9.2", // Bumped version for refactor
  MAX_SESSION_HISTORY: 200,
  LANG_OPTIONS: ["Turkish","Nordic","Latin","Celtic","Japanese","Greek","Spanish","Irish", "Russian", "Korean", "English"],
  THEME_OPTIONS: ["Nature","Cosmic","Balance","Strength","Water","Light","Shadow","Music", "Fire", "Mountain", "Ocean", "Sky", "Forest", "Mythic"],
  STYLE_OPTIONS: ["Lyrical & Melodic","Archaic & Mythic","Minimalist & Modern","Heroic & Resonant", "Elegant & Refined", "Grounded & Earthy", "Mystical & Ethereal"],
  MODEL_OPTIONS: [
    { value: "models/gemini-2.0-flash", text: "2.0 Flash (Fast & Modern)" },
    { value: "models/gemini-2.5-pro", text: "2.5 Pro (Premium)" }
  ]
};
