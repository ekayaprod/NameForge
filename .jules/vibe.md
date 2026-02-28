## 2024-05-24 - [Results Schema Adaptation]
**Learning:** `appState.results` schema differs significantly based on `appState.mode`. In 'forge' mode, it contains `name`, `roots`, `meaning`, `cluster`. In 'harmonizer' mode, it contains `name`, `valid`, `pronunciations`, `semanticCheck`.
**Action:** When adding features that process `appState.results` (like exports), always apply conditional logic (`appState.mode === 'forge'`) to format the output appropriately and avoid assuming a uniform data structure.
