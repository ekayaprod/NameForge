## 2026-03-04 - 🎛️ Polygraph - [Strict JSON Enforcement]
**Learning:** Raw string parsing from LLM outputs often falls victim to preambles, trailing markdown formatting, and hallucinated keys that bypass unstructured `JSON.parse` logic. When parsing logic depends on application state (e.g. modes), it is highly prone to untestable DOM side effects.
**Action:** Decoupled `parseApiResponse` and `processApiResponse` from UI logic to make them testable. Added explicit system instructions demanding strict JSON array formatting without preambles, and built out rigorous unit tests (`tests/parser.test.mjs`) mocking corrupted and malformed structural data to prove the parsing layer holds.

## 2026-03-05 - 🎛️ Polygraph - [Strict Zod Object Extraction for LLM Outputs]
**Learning:** Fragile string-parsing logic in a TypeScript/JavaScript service that blindly trusts `JSON.parse` is prone to unpredictable runtime crashes when confronted with LLM hallucinated keys, missing properties, or unexpected structural shifts.
**Action:** Replaced naked `JSON.parse` logic in `parseApiResponse` with strict Zod Object extraction (`z.array`) to mathematically guarantee the shape of LLM outputs against `FORGE_RUNTIME_SCHEMA` and `HARMONIZER_RUNTIME_SCHEMA`. Verified with malformed-data unit tests that ensure graceful recovery (returning `[]`) instead of throwing unhandled exceptions.

## 2026-03-05 - ✨ Prompt Engineer - [Vague User Constraints]
**Learning:** Vague terms like "meticulously SYNTHESIZING" and "structurally valid" leave too much room for model interpretation and conversational filler.
**Action:** Upgraded user prompt payload with strict domain terminology ("phonotactic blending", "rhythmic prosody", "flawless orthographic crossover") and negative constraints against conversational filler, perfectly preserving all interpolation variables.

## 2026-03-18 - 🎛️ Polygraph - [Strict Zod Parsing on Gemini Streams]
**Learning:** API error responses and streaming chunk components can return malformed JSON or unexpected internal types which crash `JSON.parse()`. Relying on unchecked keys (like `data.candidates?.[0]?.content?.parts?.[0]?.text`) after string parsing can crash deeply.
**Action:** Replaced naked `JSON.parse` logic within API error handlers and chunk processing with `STREAM_CHUNK_SCHEMA` and `API_ERROR_SCHEMA` using `.safeParse()` to gracefully discard hallucinatory, badly-typed chunks. Added simulation tests that assault the chunk reader with malformed JSON strings.
