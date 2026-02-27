export const CONFIG = {
  API_BASE_URL: "https://generativelanguage.googleapis.com/v1beta/",
  APP_VERSION: "9.2", // Bumped version for refactor
  MAX_SESSION_HISTORY: 200,
  LANG_OPTIONS: ["Turkish","Nordic","Latin","Celtic","Japanese","Greek","Spanish","Irish", "Russian", "Korean", "English"],
  THEME_OPTIONS: ["Nature","Cosmic","Balance","Strength","Water","Light","Shadow","Music", "Fire", "Mountain", "Ocean", "Sky", "Forest", "Mythic"],
  STYLE_OPTIONS: ["Lyrical & Melodic","Archaic & Mythic","Minimalist & Modern","Heroic & Resonant", "Elegant & Refined", "Grounded & Earthy", "Mystical & Ethereal"],
  MODEL_OPTIONS: [
    { value: "models/gemini-2.0-flash", text: "2.0 Flash (Fast & Modern)" },
    { value: "models/gemini-2.0-pro-exp", text: "2.0 Pro Exp (Premium)" },
    { value: "models/gemini-1.5-flash", text: "1.5 Flash (Legacy)" },
  ]
};
