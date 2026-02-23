import { appState, loadState, debouncedSaveState, logError } from './state.js';
import { ui, initLayout, updateControls, updateResultsPanel, setGenerateHandler, toggleModal } from './ui/index.js';
import { geminiService } from './api.js';
import { showToast } from './ui/toast.js';
import { CONFIG } from './config.js';
import { FORGE_SCHEMA, HARMONIZER_SCHEMA } from './schemas.js';
import { extractJsonObjects } from './utils.js';

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
      let name = (it.name || "").toString().trim();
      if (!name || fullBlacklist.some(b => name.toLowerCase().includes(b))) return null;
      if (appState.outputAlphabet === 'English (Simplified/No Accents)') {
        name = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      }
      const base = { name };
      if (appState.mode === 'forge') {
          return { ...base,
            meaning: (it.meaning || "").toString().trim(),
            roots: (it.roots || "").toString().trim(),
            cluster: (it.cluster || "Misc").trim(),
          };
      } else {
          return { ...base,
            valid: it.valid === true,
            pronunciations: it.pronunciations || [],
            semanticCheck: it.semanticCheck || "Pass" // Default to Pass if not provided
          };
      }
    }).filter(Boolean);
}

function getSystemInstruction() {
    if (appState.mode === 'forge') {
        return `ACT as an expert linguist specializing in onomastics and phonology.
RETURN ONLY a strictly valid JSON array adhering to this schema: [{"name": "Unique Name", "roots": "morpheme (Language: gloss)", "meaning": "Evocative definition", "cluster": "Style Category"}]
`;
    } else {
        return `ACT as a cross-cultural linguistic analyst.
RETURN ONLY a strictly valid JSON array adhering to this schema:
[{"name": "Name", "valid": boolean, "pronunciations": [{"lang": "Language Code", "phonetic": "IPA"}], "semanticCheck": "Pass | Note"}]
`;
    }
}

function getUserPrompt(count) {
    const { selectedLanguages, likedNames, selectedThemes, selectedStyle, gender, userBlacklist, sessionGeneratedNames, mode, harmonizerIsAllLanguages, surname, siblingNames, firstNameForMiddle } = appState;

    const context = [];
    if (likedNames.length > 0) context.push(`INSPIRATION: ${likedNames.map(n => n.name).join(', ')}.`);
    if (userBlacklist.length > 0) context.push(`BLACKLIST: ${userBlacklist.join(', ')}.`);

    let task = "";
    if (mode === 'forge') {
       task = `CONSTRUCT ${count} unique, ${gender} names by SYNTHESIZING phonemes from: ${selectedLanguages.join(' + ')}. THEMES: ${selectedThemes.join(', ')}. STYLE: ${selectedStyle}.`;
       if (surname) task += ` SURNAME CONTEXT: ${surname}.`;
       if (siblingNames) task += ` SIBLING CONTEXT: ${siblingNames}.`;
       if (firstNameForMiddle) task += ` FIRST NAME (generating middle): ${firstNameForMiddle}.`;
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
