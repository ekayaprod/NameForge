# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-05

### ✅ New
- Implemented core AI integrations with Gemini 2.0 and structured prompts.
- Added CSV export functionality for saving generated names.
- Added optimistic loading states and progressive streaming for a smoother UI experience.
- Implemented comprehensive chat history management with a 200-item session limit.
- Improved accessibility with visible labels, auto-labeled controls, and enhanced custom language inputs.
- Added an Overseer Report and Spark innovation roadmap to track architecture improvements.

### 🔒 Security
- **Data Protection:** Secured AI boundary in Name Generation with strict input sanitization and output validation.
- **XSS Mitigation:** Replaced unsafe DOM manipulations (`innerHTML`) with safe methods (`textContent`) across Language Chips and History.
- **API Security:** Moved API keys to secure HTTP headers (`x-goog-api-key`).
- **Web Integrity:** Added Content Security Policy (CSP) and replaced external CDNs with vendored scripts to mitigate SRI vulnerabilities.

### 🐛 Fixed
- Resolved unsafe JSON parsing by enforcing strict JSON schemas and decoupling state dependencies.
- Added missing catch blocks to error handlers for improved resilience.
- Handled UI rendering edge cases with differential updates for accumulated results.

### 🚀 Performance
- Optimized language chips rendering using Sets for O(1) lookup times.
- Sped up state saving operations using `requestIdleCallback`.
- Accelerated array removals in application state logic.
- Implemented exponential backoff and retry mechanisms for Gemini API calls to enhance stability.

### 📚 Documentation
- Generated comprehensive JSDoc annotations across exported functions, complex methods, and validation classes.
- Updated `README.md` with proper server instructions and development verification commands.
- Established a `ROADMAP.md` and internal developer journals for architectural planning.
