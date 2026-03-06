## 2024-05-22 - Gemini 2.0 Upgrade & Schema Optimization
**Learning:** Gemini 2.0 models (Flash/Pro) support native structured outputs via `responseSchema`, rendering verbose "RETURN ONLY JSON" system instructions obsolete and potentially confusing to the model.
**Action:** When upgrading model versions, simultaneously strip legacy formatting instructions from system prompts to reduce token usage and improve adherence to the schema.

## 2025-03-06 - Prompt Structure Optimization
**Learning:** Native `responseSchema` configuration sufficiently enforces structured output. Verbose text-based preambles requesting strict JSON output without markdown are redundant.
**Action:** Removed legacy JSON string matching constraints from the `getSystemInstruction` method to streamline prompt size and allow the model to focus strictly on semantic tasks.
