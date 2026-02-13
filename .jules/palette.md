## 2026-02-12 - Automated Form Accessibility in Helper Functions
**Learning:** When using helper functions to generate form controls (like `createControlSection`), manually adding `id` and `for` attributes is often forgotten. By enforcing this logic within the helper function itself (checking `tagName` and auto-generating IDs), we can guarantee accessibility compliance across the entire app without relying on individual implementation discipline.
**Action:** In future projects, build accessibility primitives into the base UI components/factories rather than treating them as a per-instance requirement.

## 2026-02-13 - Localized Input Submission Patterns
**Learning:** For inputs with an adjacent "Add" button (like tag/chip creators), users instinctively press "Enter" to submit. Relying solely on the button's click handler creates friction. Explicitly binding the 'Enter' key on the input to the same handler bridges this gap.
**Action:** Always encapsulate the "Add" logic in a reusable function and bind it to both the button's click event and the input's 'keydown' (Enter) event.
