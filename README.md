# NameForge

NameForge is a powerful, AI-driven name generation tool designed to craft unique names by blending languages, themes, and styles. Whether you are a writer, game master, or just looking for inspiration, NameForge helps you discover names with deep meaning and cultural resonance.

## Features

### 🛠️ Forge Mode
Create completely new, poetic names by fusing linguistic roots and thematic elements.
- **Language Blending:** Choose 2-3 languages to mix (e.g., Japanese + Celtic).
- **Thematic Flavor:** Apply themes like "Nature", "Cosmic", or "Fire".
- **Style Control:** Select a style such as "Lyrical & Melodic" or "Archaic & Mythic".
- **Deep Context:** Provide a surname, sibling names, or a first name (for middle name generation) to guide the AI.

### 🌐 Harmonizer Mode
Find existing, valid names that work across multiple cultures.
- **Cross-Cultural Search:** Find names that exist in both Spanish and Japanese, for example.
- **Validation:** Checks if the name is a valid proper noun in the selected languages.
- **Pronunciation:** detailed phonetic breakdown for each language.

### ✨ Key Features
- **AI-Powered:** Uses Google's Gemini API (Flash/Pro) for high-quality, creative results.
- **Session History:** Keeps track of your generated names and feedback (Like/Blacklist).
- **Customizable:** Adjust strictness, gender, and output character sets.
- **Privacy:** Your API key is stored locally in your browser.

## Usage

1.  **Run a Server:** Because this project uses ES Modules, you must run a local server.
    ```bash
    python3 -m http.server 8000
    # Then open http://localhost:8000
    ```
2.  **Enter API Key:** You will need a free Google Gemini API key. [Get one here](https://ai.google.dev/gemini-api/docs/api-key).
3.  **Start Forging:**
    -   Select your mode (Forge or Harmonizer).
    -   Pick languages and settings.
    -   Click "Generate Names".

## Technical Details

-   **Frontend:** Vanilla JavaScript (ES6+), HTML5.
-   **Styling:** Tailwind CSS (via CDN).
-   **API:** Google Gemini API (REST).
-   **State:** LocalStorage for persistence.

## Development

-   **Unit Tests:** Run `./verify_tests.sh` to execute the Node.js test runner.
-   **Verification:** Run `python3 verify_app.py` to perform end-to-end checks (requires Playwright).
