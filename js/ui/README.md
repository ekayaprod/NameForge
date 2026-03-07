# UI Module

This directory contains the view layer and DOM manipulation logic for the NameForge application. It enforces strict separation from the core business state by utilizing modular, functional rendering patterns and component factories.

## Architecture

The UI module follows a composition-based design, splitting responsibilities across dedicated files:

*   **`index.js`**: Exposes the public API for the UI module.
*   **`state.js`**: Maintains references to significant DOM nodes within a centralized `ui` registry.
*   **`layout.js`**: Bootstraps the application interface, binding static structure and initial event listeners.
*   **`render.js`**: Handles dynamic updates to the DOM, appending new cards and toggling view states.
*   **`components.js`**: Provides pure factory functions to generate typed, safe DOM elements.
*   **`actions.js`**: Executes interactive user commands (e.g., export JSON, copy to clipboard).
*   **`markdown.js`**: Parses streaming LLM markdown into safe DOM nodes.
*   **`toast.js`**: Manages ephemeral, non-blocking notification overlays.

## Quick Start (Integration)

Import the required functions from the UI entry point to initialize the layout or manually trigger render cycles.

```javascript
import { initLayout, toggleModal, updateResultsPanel } from './js/ui/index.js';

// 1. Initialize the application layout inside the main container
initLayout();

// 2. Trigger a dynamic rendering cycle for generated results
updateResultsPanel();

// 3. Toggle the visibility of a modal overlay
toggleModal('historyModal', true);
```

## Security Constraints

*   Use `textContent` and the internal `el` utility wrapper for DOM creation.
*   Avoid `innerHTML` or `insertAdjacentHTML` to prevent DOM-based XSS attacks.
