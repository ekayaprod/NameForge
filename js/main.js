import { appState, loadState, debouncedSaveState, logError } from './state.js';
import { ui, initLayout, updateControls, updateResultsPanel, setGenerateHandler, toggleModal } from './ui/index.js';
import { geminiService } from './api.js';
import { showToast } from './ui/toast.js';
import { CONFIG } from './config.js';
import { FORGE_SCHEMA, HARMONIZER_SCHEMA } from './schemas.js';
import { extractJsonObjects } from './utils.js';
import { sanitizeInput } from './security.js';
import { processApiResponse } from './parser.js';

// --- Helpers ---

/**
 * Constructs the system instruction prompt based on the current generation mode.
 * Defines the AI's persona and strict behavioral constraints.
 * @returns {string} The formatted system instruction string.
 */
function getSystemInstruction() {
    if (appState.mode === 'forge') {
        return `ACT as an Expert Linguist specializing in onomastics, morphological derivation, and phonology.
Construct names by expertly executing phonotactic blending between the requested linguistic roots, guided by the provided themes.
Ensure every generated name has strict etymological breakdown, deep semantic resonance, and obeys the morphological rules of the source languages.

CRITICAL CONSTRAINTS:
1. NEVER hallucinate random syllables; every phoneme must trace back to the requested roots.
2. NEVER generate phonotactic sequences that are offensive or unspeakable in the target languages.
3. Think step-by-step through the etymological roots before synthesizing the final name.`;
    } else {
        return `ACT as an Expert Cross-Cultural Linguistic Analyst and Philologist.
Identify existing, historically attested names that demonstrate strict orthographic compatibility and valid phonotactics across the requested cultures.
Verify linguistic validity, eliminate false cognates, provide precise IPA pronunciations for each language, and rigorously ensure cross-cultural semantic appropriateness.

CRITICAL CONSTRAINTS:
1. NEVER invent historically unattested names in this mode.
2. NEVER force false cognates; if a true orthographic or semantic bridge does not exist, do not generate it.
3. Think step-by-step through the cross-cultural orthographic rules before finalizing a match.`;
    }
}

/**
 * Constructs the main user prompt by synthesizing the application state.
 * Incorporates languages, themes, constraints, and contextual inputs into a specific task description.
 * @param {number} count - The number of names to request generation for.
 * @returns {string} The formatted user prompt string.
 */
function getUserPrompt(count) {
    const { selectedLanguages, likedNames, selectedThemes, selectedStyle, gender, userBlacklist, sessionGeneratedNames, mode, harmonizerIsAllLanguages, surname, siblingNames, firstNameForMiddle } = appState;

    // Sanitize Inputs
    const safeSelectedLanguages = selectedLanguages.map(sanitizeInput);
    const safeLikedNames = likedNames.map(n => sanitizeInput(n.name));
    const safeSelectedThemes = selectedThemes.map(sanitizeInput);
    const safeSelectedStyle = sanitizeInput(selectedStyle);
    const safeGender = sanitizeInput(gender);
    const safeUserBlacklist = userBlacklist.map(sanitizeInput);
    const safeSurname = sanitizeInput(surname);
    const safeSiblingNames = sanitizeInput(siblingNames);
    const safeFirstNameForMiddle = sanitizeInput(firstNameForMiddle);
    const safeSessionGeneratedNames = sessionGeneratedNames.map(sanitizeInput);

    const context = [];
    if (safeLikedNames.length > 0) context.push(`INSPIRATION: ${safeLikedNames.join(', ')}.`);
    if (safeUserBlacklist.length > 0) context.push(`CRITICAL BLACKLIST (NEVER GENERATE THESE): ${safeUserBlacklist.join(', ')}.`);
    if (safeSessionGeneratedNames.length > 0) context.push(`PREVIOUSLY GENERATED (DO NOT REPEAT): ${safeSessionGeneratedNames.join(', ')}.`);

    let task = "";
    if (mode === 'forge') {
       task = `CONSTRUCT ${count} structurally valid, ${safeGender} names. EXECUTE strict phonotactic blending using phonemes exclusively derived from: ${safeSelectedLanguages.join(' + ')}. INJECT semantic resonance mapped to THEMES: ${safeSelectedThemes.join(', ')}. ADHERE strictly to the structural and cultural boundaries of STYLE: ${safeSelectedStyle}.
       CRITICAL: Do not append conversational filler.`;
       if (safeSurname) task += ` OPTIMIZE rhythmic cadence, syllable weight, and phonotactic flow when paired with SURNAME CONTEXT: ${safeSurname}.`;
       if (safeSiblingNames) task += ` ALIGN morphological roots and thematic resonance with SIBLING CONTEXT: ${safeSiblingNames}.`;
       if (safeFirstNameForMiddle) task += ` ENGINEER rhythmic prosody and transition flow when functioning as a middle name for FIRST NAME: ${safeFirstNameForMiddle}.`;
    } else {
       const strictness = harmonizerIsAllLanguages ? "all" : "multiple";
       task = `IDENTIFY ${count} distinct ${safeGender} names demonstrating flawless orthographic crossover and strict phonotactic compatibility across ${strictness} of the following linguistic origins: ${safeSelectedLanguages.join(', ')}.
       CRITICAL: Output must only contain the mathematically validated, culturally verified names. Do not include unverified edge cases or conversational filler.`;
    }

    return `${context.join('\n')}
TASK: ${task}`;
}

/**
 * Executes the core generation sequence.
 * Validates requirements, prepares API payloads, and orchestrates the streaming response processing.
 * Updates the global state and triggers UI renders iteratively as chunks arrive.
 * @returns {Promise<void>}
 */
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
        let lastProcessedIndex = 0;

        for await (const chunk of stream) {
            try {
                accumulatedText += chunk;
                appState.rawApiResponse = accumulatedText;

                const { results: newObjects, lastIndex } = extractJsonObjects(accumulatedText, lastProcessedIndex, true);

                if (newObjects.length > 0) {
                    lastProcessedIndex = lastIndex;
                    const processed = processApiResponse(newObjects, appState.mode, appState.userBlacklist, appState.outputAlphabet);
                    if (processed.length > 0) {
                        appState.results.push(...processed);
                        updateResultsPanel();
                    }
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
