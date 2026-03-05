# 🗺️ Project Roadmap

This document tracks the progress of the NameForge project.

## ✅ Completed

### Core Functionality
- [x] **Forge Mode**: Generate unique names by blending languages and themes.
- [x] **Harmonizer Mode**: Find existing cross-cultural names.
- [x] **AI Integration**: Full integration with Google Gemini API (Flash/Pro).

### Features
- [x] **Language Blending**: Mix up to 3 languages.
- [x] **Thematic Flavor**: Apply themes (Nature, Cosmic, etc.).
- [x] **Style Control**: Select styles (Lyrical, Archaic, etc.).
- [x] **Deep Context**: Support for surname, siblings, and middle name context.
- [x] **Validation**: Cross-cultural name existence check.
- [x] **Pronunciation**: Phonetic breakdowns.
- [x] **Session History**: Track generated names with persistence.
- [x] **Privacy**: Local storage of API keys.
- [x] **Export**: Export generated names to JSON.
- [x] **Export CSV**: Export generated names to CSV.

## 🚧 In Progress
- [ ] (No active tasks currently tracked)

## 🔮 Future Ideas
- [ ] Shareable name lists.
- [ ] More themes and styles.

## 💡 Innovation Backlog
- **[Architecture] Replace Custom Validation Library with Zod via ESM**
  - **The Problem (Stagnation):** The codebase maintains a custom `ZodType` class hierarchy in `js/validation.js` to mimic Zod's API. This is a classic "reinvented wheel" that requires manual maintenance, lacks comprehensive edge-case handling (e.g., recursive types, strict mode), and adds unnecessary technical debt.
  - **The Solution (The Next-Gen Pattern):** Adopt the official `zod` or a lighter alternative like `valibot` via an ESM CDN link. This removes the maintenance burden while providing a significantly more robust, community-tested validation schema.
  - **The Benefit (Performance/DX Metric):** Immediate DX improvement by relying on industry-standard documentation and types. Eliminates a custom artifact from the codebase, reducing the surface area for bugs in structural data parsing.

- **[Architecture] Migrate State Management to Signals (@preact/signals-core)**
  - **The Problem (Stagnation):** `js/state.js` relies on a massive, mutable `appState` object with manual DOM synchronization functions (e.g., `updateResultsPanel`, `updateControls`) scattered throughout the UI layer. This approach is brittle, prone to out-of-sync states, and forces redundant re-renders of large DOM trees.
  - **The Solution (The Next-Gen Pattern):** Introduce a lightweight reactive primitive like `@preact/signals-core` to manage state. By binding UI elements directly to derived signals, updates become granular and automatic without the overhead of a Virtual DOM.
  - **The Benefit (Performance/DX Metric):** Drastically reduces UI logic complexity and manual event wiring. Improves performance by only updating the exact DOM nodes associated with a changed signal, eliminating the need for differential rendering logic.
