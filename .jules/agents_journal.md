## 2026-03-04 - 🎛️ Polygraph - [Strict JSON Enforcement]
**Learning:** Raw string parsing from LLM outputs often falls victim to preambles, trailing markdown formatting, and hallucinated keys that bypass unstructured `JSON.parse` logic. When parsing logic depends on application state (e.g. modes), it is highly prone to untestable DOM side effects.
**Action:** Decoupled `parseApiResponse` and `processApiResponse` from UI logic to make them testable. Added explicit system instructions demanding strict JSON array formatting without preambles, and built out rigorous unit tests (`tests/parser.test.mjs`) mocking corrupted and malformed structural data to prove the parsing layer holds.

## 2026-03-05 - 🎛️ Polygraph - [Strict Zod Object Extraction for LLM Outputs]
**Learning:** Fragile string-parsing logic in a TypeScript/JavaScript service that blindly trusts `JSON.parse` is prone to unpredictable runtime crashes when confronted with LLM hallucinated keys, missing properties, or unexpected structural shifts.
**Action:** Replaced naked `JSON.parse` logic in `parseApiResponse` with strict Zod Object extraction (`z.array`) to mathematically guarantee the shape of LLM outputs against `FORGE_RUNTIME_SCHEMA` and `HARMONIZER_RUNTIME_SCHEMA`. Verified with malformed-data unit tests that ensure graceful recovery (returning `[]`) instead of throwing unhandled exceptions.

## 2026-03-05 - 🎇 Hologram - [Generative UI Polish: Feature Cards for Lists]
**Learning:** Standard unordered markdown lists (`<ul>` and `<li>`) rendered natively can make AI outputs feel static and disconnected from the design system.
**Action:** Transformed raw markdown list-parsing in `parseMarkdownToDOM` into rich, interactive feature cards using structured `div` elements mapped directly to the application's existing Tailwind UI design system.
