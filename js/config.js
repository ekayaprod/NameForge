export const CONFIG = {
  API_BASE_URL: "https://generativelanguage.googleapis.com/v1beta/",
  APP_VERSION: "9.1", // Bumped version for refactor
  LANG_OPTIONS: ["Turkish","Nordic","Latin","Celtic","Japanese","Greek","Spanish","Irish", "Russian", "Korean", "English"],
  THEME_OPTIONS: ["Nature","Cosmic","Balance","Strength","Water","Light","Shadow","Music", "Fire", "Mountain", "Ocean", "Sky", "Forest", "Mythic"],
  STYLE_OPTIONS: ["Lyrical & Melodic","Archaic & Mythic","Minimalist & Modern","Heroic & Resonant", "Elegant & Refined", "Grounded & Earthy", "Mystical & Ethereal"],
  MODEL_OPTIONS: [
    { value: "models/gemini-1.5-flash", text: "1.5 Flash (Fast & Balanced)" },
    { value: "models/gemini-1.5-pro", text: "1.5 Pro (Highest Quality)" },
    { value: "models/gemini-2.0-flash-exp", text: "2.0 Flash Exp (Experimental)" }
  ]
};
