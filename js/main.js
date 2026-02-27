import { appState, loadState, debouncedSaveState, logError } from './state.js';
import { ui, initLayout, updateControls, updateResultsPanel, setGenerateHandler, toggleModal } from './ui/index.js';
import { geminiService } from './api.js';
import { showToast } from './ui/toast.js';
import { CONFIG } from './config.js';
import { FORGE_SCHEMA, HARMONIZER_SCHEMA, FORGE_RUNTIME_SCHEMA, HARMONIZER_RUNTIME_SCHEMA } from './schemas.js';
import { extractJsonObjects } from './utils.js';
import { sanitizeInput } from './security.js';

// --- Helpers ---

function parseApiResponse(text) {
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch (e) {
      console.warn("Direct JSON parse failed, attempting cleanup:", e);
      let cleanedText = text;
      if (text.includes('```')) {
          const startIdx = text.indexOf('```');
          const lastIdx = text.lastIndexOf('```');
          if (startIdx !== lastIdx && lastIdx > startIdx) {
              const firstNewline = text.indexOf('\n', startIdx);
              const contentStart = (firstNewline !== -1 && firstNewline < lastIdx) ? firstNewline + 1 : startIdx + 3;
              cleanedText = text.substring(contentStart, lastIdx);
          } else {
              cleanedText = text.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '');
          }
      }
      cleanedText = cleanedText.trim();
      try {
          const parsed = JSON.parse(cleanedText);
          if (Array.isArray(parsed)) return parsed;
      } catch(e2) {
          console.warn("Cleanup parse failed:", e2);
      }

      logError("Failed to parse API response");
      return [];
    }
}

function processApiResponse(rawArray) {
    if (!rawArray?.length) return [];
    const fullBlacklist = appState.userBlacklist.map(b => b.toLowerCase());
    return rawArray.map(it => {
      // 1. Strict Schema Validation
      const schema = appState.mode === 'forge' ? FORGE_RUNTIME_SCHEMA : HARMONIZER_RUNTIME_SCHEMA;
      const validation = schema.safeParse(it);

      if (!validation.success) {
          console.warn("Schema validation failed for item:", it, validation.error);
          return null;
      }

      const validItem = validation.data;

      let name = (validItem.name || "").toString().trim();
      if (!name || fullBlacklist.some(b => name.toLowerCase().includes(b))) return null;
      if (appState.outputAlphabet === 'English (Simplified/No Accents)') {
        name = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      }
      const base = { name };
      if (appState.mode === 'forge') {
          return { ...base,
            meaning: (validItem.meaning || "").toString().trim(),
            roots: (validItem.roots || "").toString().trim(),
            cluster: (validItem.cluster || "Misc").trim(),
          };
      } else {
          return { ...base,
            valid: validItem.valid === true,
            pronunciations: validItem.pronunciations || [],
            semanticCheck: validItem.semanticCheck || "Pass" // Default to Pass if not provided
          };
      }
    }).filter(Boolean);
}

function getSystemInstruction() {
    if (appState.mode === 'forge') {
        return `ACT as an expert linguist specializing in onomastics and phonology.
Create unique, evocative names by fusing linguistic roots and thematic elements.
Each name should have a deep meaning and a clear etymological breakdown.`;
    } else {
        return `ACT as a cross-cultural linguistic analyst.
Identify existing names that are valid across multiple cultures.
Verify validity, provide accurate IPA pronunciations for each language, and ensure semantic appropriateness.`;
    }
}

function getUserPrompt(count) {
    const { selectedLanguages, likedNames, selectedThemes, selectedStyle, gender, userBlacklist, sessionGeneratedNames, mode, harmonizerIsAllLanguages, surname, siblingNames, firstNameForMiddle } = appState;

    const context = [];
    if (likedNames.length > 0) context.push(`INSPIRATION: ${likedNames.map(n => n.name).join(', ')}.`);
    if (userBlacklist.length > 0) context.push(`BLACKLIST: ${userBlacklist.join(', ')}.`);

    // Sanitize Inputs
    const safeSurname = sanitizeInput(surname);
    const safeSiblingNames = sanitizeInput(siblingNames);
    const safeFirstNameForMiddle = sanitizeInput(firstNameForMiddle);

    let task = "";
    if (mode === 'forge') {
       task = `CONSTRUCT ${count} unique, ${gender} names by SYNTHESIZING phonemes from: ${selectedLanguages.join(' + ')}. THEMES: ${selectedThemes.join(', ')}. STYLE: ${selectedStyle}.`;
       if (safeSurname) task += ` SURNAME CONTEXT: ${safeSurname}.`;
       if (safeSiblingNames) task += ` SIBLING CONTEXT: ${safeSiblingNames}.`;
       if (safeFirstNameForMiddle) task += ` FIRST NAME (generating middle): ${safeFirstNameForMiddle}.`;
    } else {
       const strictness = harmonizerIsAllLanguages ? "all" : "multiple";
       task = `IDENTIFY ${count} ${gender} names that are culturally compatible with ${strictness} of: ${selectedLanguages.join(', ')}.`;
    }

    return `${context.join('\n')}
TASK: ${task}`;
}

async function doGenerate() {
    if (appState.isLoading) return;

    // Check if ready (button state might be stale if logic differs, but UI checks it too)
    const langRequirement = appState.selectedLanguages.length >= 2 && appState.selectedLanguages.length <= 3;
    const themeRequirement = appState.mode === 'forge' ? appState.selectedThemes.length >= 1 : true;
    if (!langRequirement || !themeRequirement) {
         showToast("Please select 2-3 languages and (in Forge mode) at least 1 theme.", true);
         return;
    }

    const key = appState.apiKey.trim();
    const count = appState.defaultCount;
    const systemInstr = getSystemInstruction();
    const userPrompt = getUserPrompt(count);

    const contextHash = JSON.stringify({
        mode: appState.mode,
        langs: appState.selectedLanguages,
        themes: appState.selectedThemes,
        style: appState.selectedStyle
    });

    if (!key) {
         // Update Prompt View for user copying
        document.getElementById('system-prompt-view').value = systemInstr;
        document.getElementById('user-prompt-view').value = userPrompt;
        toggleModal(ui.modals.prompt, true);
        showToast("API Key missing. Copy prompt from modal.", true);
        return;
    }

    appState.error = null;
    appState.results = [];
    appState.rawApiResponse = "";
    appState.isLoading = true;
    appState.renderedCount = 0;
    appState.generationController = new AbortController();
    updateResultsPanel();
    updateControls(); // update button text

    geminiService.configure(key, appState.model);

    const timeoutId = setTimeout(() => {
        if(appState.generationController) appState.generationController.abort()
    }, appState.apiTimeout * 1000);

    try {
        const schema = appState.mode === 'forge' ? FORGE_SCHEMA : HARMONIZER_SCHEMA;

        const stream = geminiService.streamGenerate(userPrompt, systemInstr, contextHash, {
            maxOutputTokens: appState.maxOutputTokens,
            responseSchema: schema
        }, appState.generationController.signal);

        let accumulatedText = "";

        for await (const chunk of stream) {
            try {
                accumulatedText += chunk;
                appState.rawApiResponse = accumulatedText;

                const partialObjects = extractJsonObjects(accumulatedText);
                const processed = processApiResponse(partialObjects);

                if (processed.length > appState.results.length) {
                    appState.results = processed;
                    updateResultsPanel();
                }
            } catch (e) {
                console.error("Error in stream loop:", e);
            }
        }

        if (appState.results.length) {
            appState.sessionGeneratedNames.push(...appState.results.map(p => p.name));
            if (appState.sessionGeneratedNames.length > CONFIG.MAX_SESSION_HISTORY) {
                appState.sessionGeneratedNames = appState.sessionGeneratedNames.slice(-CONFIG.MAX_SESSION_HISTORY);
            }
        }

    } catch (error) {
        let errorMsg;
        if (error.name === 'AbortError') {
            errorMsg = "Generation timed out.";
        } else {
            errorMsg = error.message || String(error);
        }
        appState.error = errorMsg;

        logError(errorMsg);
    } finally {
        clearTimeout(timeoutId);
        appState.isLoading = false;
        appState.generationController = null;
        updateResultsPanel();
        updateControls(); // Updates "Generate More" text
        debouncedSaveState();
    }
}

// --- Init ---
window.addEventListener('beforeunload', () => {
    if (appState.generationController) {
        appState.generationController.abort();
    }
});

loadState();
initLayout();
setGenerateHandler(doGenerate);
updateControls();
updateResultsPanel();

if (!appState.hasSeenIntro) {
  toggleModal(ui.modals.welcome, true);
}
