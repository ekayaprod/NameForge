## 2024-05-23 - [Secured AI Boundary: Name Generation]
**Learning:** Implemented a zero-dependency runtime validation library (`js/validation.js`) to enforce strict output schemas in a vanilla JS environment without a build step.
**Action:** Use this pattern for future zero-build projects requiring runtime type safety.

## 2026-03-05 - [Secured AI Boundary: Name Generation]
**Learning:** Closed prompt injection vectors by strictly sanitizing all user-provided data structures (custom languages, themes, blacklists, styles, genders) prior to LLM template construction. Previously, array inputs could carry unescaped payloads straight into the system prompt.
**Action:** Always sanitize every element of user-provided arrays and strings before interpolating them into LLM prompts using tools like `sanitizeInput`.
