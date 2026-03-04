import { ui, getGenerateHandler } from './state.js';
import { appState, debouncedSaveState } from '../state.js';
import { CONFIG } from '../config.js';
import { el } from '../utils.js';
import { showToast } from './toast.js';
import { geminiService } from '../api.js';
import {
    createControlSection,
    createSelectControl,
    createNumericInputControl,
    createContextInput,
    createModal,
    createHeader
} from './components.js';
import {
    updateResultsPanel,
    updateControls,
    updateLanguageChips,
    updateChipSelector,
    updateHistoryModal,
    toggleModal,
    toggleModeUI
} from './render.js';
import {
    handleSurpriseMe,
    handleControlsClick,
    handleResultsPanelClick,
    handleCopyAll,
    handleExport
} from './actions.js';

/**
 * Constructs the left-hand controls panel containing mode switches, language selection,
 * advanced inputs, themes, and style configurations.
 * Initializes event listeners for specific control actions like adding a custom language.
 * @returns {Object} An object containing references to the constructed DOM elements: { left, modeSwitcher }.
 */
function createControlsPanel() {
    const left = el('div','md:col-span-1 bg-[#071425] border border-[#0e2334] rounded-xl p-5 flex flex-col gap-4 h-fit');

    const onReset = () => {
        geminiService.resetHistory();
        appState.sessionGeneratedNames = [];
        showToast('Session context cleared.');
        updateControls();
    };
    const onHistory = () => { updateHistoryModal(); toggleModal(ui.modals.history, true); };
    const onSettings = () => toggleModal(ui.modals.settings, true);

    left.append(createHeader(onReset, onHistory, onSettings));

    const modeSwitcher = el('div', 'mode-toggle mt-4');
    modeSwitcher.innerHTML = `<button data-mode="forge" class="${appState.mode === 'forge' ? 'active' : ''}">Forge</button><button data-mode="harmonizer" class="${appState.mode === 'harmonizer' ? 'active' : ''}">Harmonizer</button>`;
    left.append(modeSwitcher);

    const controlsContainer = el('div', 'flex flex-col gap-4 mt-4');

    const coreQuerySection = el('details', 'border border-[#0e2334] rounded-lg');
    coreQuerySection.open = true;
    const coreQuerySummary = el('summary', 'text-md font-semibold p-3 cursor-pointer list-none');
    coreQuerySummary.innerHTML = `Step 1: Define Core Query <span class="small-muted font-normal">(Languages & Context)</span>`;
    coreQuerySection.append(coreQuerySummary);

    const coreQueryContent = el('div', 'p-3 border-t border-[#0e2334] flex flex-col gap-4');
    const languagesSection = createControlSection('Languages (choose 2-3)', el('div'));

    // Surprise Me Button
    const surpriseBtn = el('button', 'text-xs bg-[#1f3a52] text-blue-200 px-2 py-0.5 rounded ml-2 hover:bg-[#2b4e6d] transition-colors');
    surpriseBtn.textContent = '🎲 Surprise Me';
    surpriseBtn.title = 'Randomly select languages and themes';
    surpriseBtn.addEventListener('click', (e) => { e.preventDefault(); handleSurpriseMe(); });
    languagesSection.querySelector('label').append(surpriseBtn);

    ui.controls.languageChips = el('div', 'flex flex-wrap gap-2');
    ui.controls.languageChips.dataset.stateKey = 'selectedLanguages';
    const addLangWrap = el('div', 'flex gap-2 mt-2');
    const langInput = el('input', 'w-full bg-[#0b1622] border border-[#223447] rounded px-3 py-2 text-sm');
    langInput.placeholder = 'Add a language...';
    langInput.setAttribute('aria-label', 'Add a custom language');
    const addLangBtn = el('button', 'bg-[#0e2436] border border-[#1b3146] px-3 py-2 rounded text-sm small-muted');
    addLangBtn.textContent = 'Add';

    /**
     * Handles the logic for adding a custom language from the input field.
     * Validates input, prevents duplicates, and updates state and UI.
     */
    const handleAddLang = () => {
        const newLang = langInput.value.trim();
        if (newLang.length < 2) return;

        const allLangs = [...CONFIG.LANG_OPTIONS, ...appState.userLanguages].map(l => l.toLowerCase());
        if (allLangs.includes(newLang.toLowerCase())) {
            showToast('Language already exists.', true);
            return;
        }

        appState.userLanguages.push(newLang);
        if (appState.selectedLanguages.length < 3) appState.selectedLanguages.push(newLang);
        debouncedSaveState();
        updateControls();
        langInput.value = '';
        showToast(`Added ${newLang}!`);
    };

    addLangBtn.addEventListener('click', handleAddLang);
    langInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAddLang();
    });

    addLangWrap.append(langInput, addLangBtn);
    languagesSection.append(ui.controls.languageChips, addLangWrap);

    ui.controls.advancedSection = createControlSection('Advanced Context', el('div', 'grid grid-cols-2 gap-4'));
    const advancedGrid = ui.controls.advancedSection.querySelector('div');
    advancedGrid.append(
        createContextInput("Surname", "surname", () => updateControls()),
        createContextInput("Sibling Names", "siblingNames", () => updateControls()),
        createContextInput("First Name (for middle)", "firstNameForMiddle", () => updateControls(), "col-span-2")
    );
    coreQueryContent.append(languagesSection, ui.controls.advancedSection);
    coreQuerySection.append(coreQueryContent);
    controlsContainer.append(coreQuerySection);

    const flavorSection = el('div', 'flex flex-col gap-4 mt-4');
    const flavorHeader = el('div', 'text-md font-semibold');
    flavorHeader.innerHTML = `Step 2: Refine Flavor <span class="small-muted font-normal">(Style, Themes, etc.)</span>`;
    flavorSection.append(flavorHeader);

    ui.controls.forgeContainer = el('div', 'flex flex-col gap-4');
    ui.controls.harmonizerContainer = el('div', 'flex flex-col gap-4');

    ui.controls.harmonizerToggleSection = el('div');
    ui.controls.harmonizerToggleSection.innerHTML = `<div class="toggle-switch"><span class="text-sm font-medium">Proper noun in all selected languages</span><input type="checkbox" class="toggle-switch-input" id="harmonizer-toggle"><label class="toggle-switch-label" for="harmonizer-toggle">Toggle</label></div>`;
    ui.controls.harmonizerContainer.append(ui.controls.harmonizerToggleSection);

    ui.controls.themesSection = createControlSection('Themes (choose 1–2)', el('div', 'flex flex-wrap gap-2'));
    ui.controls.themeChips = ui.controls.themesSection.querySelector('div');
    ui.controls.themeChips.dataset.stateKey = 'selectedThemes';
    ui.controls.styleSection = createControlSection('Style', createSelectControl(CONFIG.STYLE_OPTIONS, appState.selectedStyle, e => { appState.selectedStyle = e.target.value; debouncedSaveState(); }));
    ui.controls.forgeContainer.append(ui.controls.themesSection, ui.controls.styleSection);

    flavorSection.append(ui.controls.forgeContainer, ui.controls.harmonizerContainer);
    flavorSection.append(createControlSection('Gender', createSelectControl(["Unisex", "Male", "Female"], appState.gender, e => { appState.gender = e.target.value; debouncedSaveState(); })));
    controlsContainer.append(flavorSection);

    left.append(controlsContainer);

    return { left, modeSwitcher };
}

/**
 * Constructs the right-hand results panel, including the primary generate button
 * and the container for rendering generated name cards.
 * @returns {HTMLElement} The constructed results panel container.
 */
function createResultsPanel() {
    const right = el('div','md:col-span-2 bg-[#071427] border border-[#0e2030] rounded-xl p-5 flex flex-col gap-2');

    ui.controls.generateButton = el('button','bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white px-4 py-3 rounded font-semibold shadow w-full');
    right.append(ui.controls.generateButton);

    ui.results.header = el('div');
    right.append(ui.results.header);

    ui.results.panel = el('div','mt-2 p-3 bg-[#071a25] border border-[#0f2a3a] rounded-lg min-h-[280px] flex flex-col');
    right.append(ui.results.panel);
    return right;
}

/**
 * Initializes the main application layout.
 * Clears the root element, sets up the grid layout, constructs controls and results panels,
 * creates necessary modals, and binds global event listeners.
 */
export function initLayout() {
    ui.root.innerHTML = '';
    const appWrap = el('div','max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6');

    const { left, modeSwitcher } = createControlsPanel();
    const right = createResultsPanel();

    appWrap.append(left, right);
    ui.root.append(appWrap);

    // --- Modals ---
    // Settings Modal
    const settingsContent = el('div', 'flex flex-col gap-4');
    const apiKeyInput = el('input', 'w-full bg-[#0b1622] border border-[#223447] rounded px-3 py-2 text-sm');
    apiKeyInput.type = 'password';
    apiKeyInput.placeholder = 'Enter your Gemini API key';
    apiKeyInput.value = appState.apiKey;
    apiKeyInput.addEventListener('input', e => { appState.apiKey = e.target.value.trim(); debouncedSaveState(); });
    const modelSel = createSelectControl(CONFIG.MODEL_OPTIONS, appState.model, e => { appState.model = e.target.value; debouncedSaveState(); });
    const alphabetOptions = ['English (Default)', 'English (Simplified/No Accents)'];
    const alphabetSel = createSelectControl(alphabetOptions, appState.outputAlphabet, e => { appState.outputAlphabet = e.target.value; debouncedSaveState(); });
    settingsContent.append(
        createControlSection('Gemini API Key', apiKeyInput),
        createControlSection('Model', modelSel),
        createControlSection('Output Character Set', alphabetSel),
        createNumericInputControl('Names Per Generation', 'defaultCount', 4, 20, 1),
        createNumericInputControl('API Timeout (seconds)', 'apiTimeout', 10, 120, 5),
        createNumericInputControl('Max Output Tokens', 'maxOutputTokens', 800, 4000, 100)
    );
    const settingsCloseBtn = el('button', 'chip bg-blue-800/50 justify-center');
    settingsCloseBtn.textContent = 'Close';
    settingsCloseBtn.addEventListener('click', () => toggleModal(ui.modals.settings, false));
    ui.modals.settings = createModal('settings-modal', 'Settings', settingsContent, [settingsCloseBtn]);

    // History Modal
    const historyContent = el('div', 'space-y-4');
    const historyCloseBtn = el('button', 'chip bg-blue-800/50 justify-center');
    historyCloseBtn.textContent = 'Close';
    historyCloseBtn.addEventListener('click', () => toggleModal(ui.modals.history, false));
    ui.modals.history = createModal('history-modal', 'Session Feedback', historyContent, [historyCloseBtn]);

    // Prompt Modal (Now shows User + System)
    const promptContent = el('div', 'flex flex-col gap-2');
    promptContent.innerHTML = `
        <div class="text-xs small-muted">System Instruction</div>
        <textarea readonly id="system-prompt-view" class="w-full h-24 bg-[#0b1622] border border-[#223447] rounded p-2 text-xs font-mono"></textarea>
        <div class="text-xs small-muted mt-2">User Message</div>
        <textarea readonly id="user-prompt-view" class="w-full h-32 bg-[#0b1622] border border-[#223447] rounded p-2 text-xs font-mono"></textarea>
    `;
    const promptCloseBtn = el('button', 'chip');
    promptCloseBtn.textContent = 'Close';
    promptCloseBtn.addEventListener('click', () => toggleModal(ui.modals.prompt, false));
    ui.modals.prompt = createModal('prompt-modal', 'Current API Prompt', promptContent, [promptCloseBtn]);

    // Welcome Modal
    const welcomeContent = el('div', 'flex flex-col gap-3 text-sm small-muted');
    welcomeContent.innerHTML = `
        <p>Welcome to NameForge! This app helps you create unique names by blending languages and themes.</p>
        <div class="p-3 bg-black/20 rounded-md">
        <strong class="text-base text-gray-200">How it works:</strong>
        <ul class="list-disc list-inside mt-2 space-y-1">
            <li><strong>Forge Mode:</strong> Creates new, poetic names from language roots and themes.</li>
            <li><strong>Harmonizer Mode:</strong> Finds existing names that work across multiple cultures.</li>
        </ul>
        </div>
        <p>To generate names, the app uses the Google Gemini API. You'll need a free API key to get started.</p>
    `;
    const welcomeApiKeyInput = el('input', 'w-full bg-[#0b1622] border border-[#223447] rounded px-3 py-2 text-sm');
    welcomeApiKeyInput.placeholder = 'Paste your Gemini API key here';
    welcomeApiKeyInput.value = appState.apiKey;
    const getApiKeyLink = el('a', 'text-blue-400 hover:underline text-xs');
    getApiKeyLink.href = 'https://ai.google.dev/gemini-api/docs/api-key';
    getApiKeyLink.target = '_blank';
    getApiKeyLink.textContent = 'How to get an API Key →';
    const welcomeApiSection = createControlSection('Enter your Gemini API Key', welcomeApiKeyInput);
    welcomeApiSection.append(getApiKeyLink);
    welcomeContent.append(welcomeApiSection);

    const saveKeyBtn = el('button', 'chip bg-blue-700 text-white font-semibold flex-1 justify-center');
    saveKeyBtn.textContent = 'Save & Start';
    saveKeyBtn.addEventListener('click', () => {
        const key = welcomeApiKeyInput.value.trim();
        if (key) {
            appState.apiKey = key;
            appState.hasSeenIntro = true;
            debouncedSaveState();
            toggleModal(ui.modals.welcome, false);
            showToast('API Key saved!');
        } else {
            showToast('Please enter an API key.', true);
        }
    });

    const noKeyBtn = el('button', 'chip flex-1 justify-center');
    noKeyBtn.textContent = 'Use without API for now';
    noKeyBtn.addEventListener('click', () => {
        appState.hasSeenIntro = true;
        debouncedSaveState();
        toggleModal(ui.modals.welcome, false);
        showToast('You can add an API key later in Settings.');
    });
    ui.modals.welcome = createModal('welcome-modal', 'Welcome to NameForge', welcomeContent, [noKeyBtn, saveKeyBtn]);

    ui.root.append(ui.modals.settings, ui.modals.history, ui.modals.prompt, ui.modals.welcome);

    // --- Event Listeners & Initial UI State ---
    toggleModeUI(appState.mode);
    ui.controls.harmonizerToggleSection.querySelector('input').checked = appState.harmonizerIsAllLanguages;

    modeSwitcher.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-mode]');
        if (button && appState.mode !== button.dataset.mode) {
            appState.mode = button.dataset.mode;
            modeSwitcher.querySelector('.active').classList.remove('active');
            button.classList.add('active');
            debouncedSaveState(); toggleModeUI(appState.mode);
        }
    });

    ui.controls.harmonizerToggleSection.querySelector('input').addEventListener('change', (e) => {
        appState.harmonizerIsAllLanguages = e.target.checked;
        updateLanguageChips();
        debouncedSaveState();
    });

    left.addEventListener('click', handleControlsClick);
    right.addEventListener('click', handleResultsPanelClick);

    // Bind Generate Button
    ui.controls.generateButton.addEventListener('click', () => {
        const handler = getGenerateHandler();
        if(handler) handler();
    });
}
