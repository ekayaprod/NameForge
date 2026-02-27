## 2024-05-22 - Gemini 2.0 Upgrade & Schema Optimization
**Learning:** Gemini 2.0 models (Flash/Pro) support native structured outputs via `responseSchema`, rendering verbose "RETURN ONLY JSON" system instructions obsolete and potentially confusing to the model.
**Action:** When upgrading model versions, simultaneously strip legacy formatting instructions from system prompts to reduce token usage and improve adherence to the schema.
