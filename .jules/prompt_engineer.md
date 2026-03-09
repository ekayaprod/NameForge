## 2024-05-24 - [Name Generation API]
**Learning:** Translating vague terms like "unique, evocative names" and "valid across multiple cultures" requires injecting domain knowledge like "morphological derivation", "phonotactic blending", and "cross-cultural orthographic compatibility" into the LLM constraints.
**Action:** Replace vague adjectives with concrete technical requirements for the LLM. Keep the brittle JavaScript template string interpolations exactly intact while restructuring the surrounding English text.

## 2026-03-09 - ✨ Prompt Engineer - [Name Generation Boundary Injection]
**Learning:** Vague name generation prompts often lead to the LLM hallucinating random syllables, repeating itself across sessions, or inventing false cross-cultural cognates.
**Action:** Injected explicit negative boundaries (e.g., "NEVER invent historically unattested names", strict repetition blacklists using `sessionGeneratedNames`) and chain-of-thought directives into the core system and user prompts while perfectly preserving the Javascript interpolation container.