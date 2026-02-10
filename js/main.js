import { appState, loadState, debouncedSaveState } from './state.js';
import { ui, initLayout, updateControls, updateResultsPanel, setGenerateHandler, toggleModal } from './ui.js';
import { geminiService } from './api.js';
import { showToast } from './utils.js';

// --- Schemas ---
const FORGE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      name: { type: "STRING" },
      roots: { type: "STRING" },
      meaning: { type: "STRING" },
      cluster: { type: "STRING" }
    },
    required: ["name", "roots", "meaning", "cluster"]
  }
};

const HARMONIZER_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      name: { type: "STRING" },
      valid: { type: "BOOLEAN" },
      pronunciations: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            lang: { type: "STRING" },
            phonetic: { type: "STRING" }
          },
          required: ["lang", "phonetic"]
        }
      },
      semanticCheck: { type: "STRING" }
    },
    required: ["name", "valid", "pronunciations", "semanticCheck"]
  }
};

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

      if (!appState.recentErrors) appState.recentErrors = [];
      appState.recentErrors.push(`${new Date().toLocaleTimeString()}: Failed to parse API response`);
      if (appState.recentErrors.length > 5) appState.recentErrors.shift();
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
        return `You are a linguist creating new names.
Output ONLY a valid JSON array of objects with this schema: [{"name": "", "roots": "morpheme (Language: gloss)", "meaning": "", "cluster": "Style Category"}]
`;
    } else {
        return `You are a cross-cultural linguistic analyst.
Output ONLY a valid JSON array of objects with this schema:
[{"name": "", "valid": boolean, "pronunciations": [{"lang": "", "phonetic": ""}], "semanticCheck": "Pass | Note"}]
`;
    }
}

function getUserPrompt(count) {
    const { selectedLanguages, likedNames, selectedThemes, selectedStyle, gender, userBlacklist, sessionGeneratedNames, mode, harmonizerIsAllLanguages, surname, siblingNames, firstNameForMiddle } = appState;

    const context = [];
    if (likedNames.length > 0) context.push(`Inspiration: ${likedNames.map(n => n.name).join(', ')}.`);
    if (userBlacklist.length > 0) context.push(`Blacklist: ${userBlacklist.join(', ')}.`);

    let task = "";
    if (mode === 'forge') {
       task = `Generate ${count} original, ${gender} names by fusing: ${selectedLanguages.join(' + ')}. Themes: ${selectedThemes.join(', ')}. Style: ${selectedStyle}.`;
       if (surname) task += ` Surname: ${surname}.`;
       if (siblingNames) task += ` Siblings: ${siblingNames}.`;
       if (firstNameForMiddle) task += ` First Name (generating middle): ${firstNameForMiddle}.`;
    } else {
       const strictness = harmonizerIsAllLanguages ? "all" : "multiple";
       task = `Find ${count} ${gender} names that work in ${strictness} of: ${selectedLanguages.join(', ')}.`;
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
    // appState.results is not cleared here to allow accumulation
    appState.rawApiResponse = null;
    appState.isLoading = true;
    appState.generationController = new AbortController();
    updateResultsPanel();
    updateControls(); // update button text

    geminiService.configure(key, appState.model);

    const timeoutId = setTimeout(() => {
        if(appState.generationController) appState.generationController.abort()
    }, appState.apiTimeout * 1000);

    try {
        const schema = appState.mode === 'forge' ? FORGE_SCHEMA : HARMONIZER_SCHEMA;

        // Serial Request (Chat)
        const responseText = await geminiService.generate(userPrompt, systemInstr, contextHash, {
            maxOutputTokens: appState.maxOutputTokens,
            responseSchema: schema
        }, appState.generationController.signal);

        appState.rawApiResponse = responseText;
        const allResults = processApiResponse(parseApiResponse(responseText));

        if (allResults.length) {
            appState.sessionGeneratedNames.push(...allResults.map(p => p.name));
            appState.results.push(...allResults);
        }

    } catch (error) {
        let errorMsg;
        if (error.name === 'AbortError') {
            errorMsg = "Generation timed out.";
        } else {
            errorMsg = error.message || String(error);
        }
        appState.error = errorMsg;

        if (!appState.recentErrors) appState.recentErrors = [];
        appState.recentErrors.push(`${new Date().toLocaleTimeString()}: ${errorMsg}`);
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
