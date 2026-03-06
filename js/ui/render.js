import { ui } from './state.js';
import { appState } from '../state.js';
import { CONFIG } from '../config.js';
import { el } from '../utils.js';
import { createNameCard, createLoadingSkeleton, createErrorDisplay, createJsonErrorDisplay, createStreamSpinner, createMarkdownStreamDisplay } from './components.js';
import { geminiService } from '../api.js';
import { handleCopyAll, handleExport, handleExportCsv } from './actions.js';

// Inject animations
const style = document.createElement('style');
style.textContent = `
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up {
  animation: fadeInUp 0.5s ease-out forwards;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .5; }
}
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
`;
document.head.appendChild(style);

/**
 * Toggles the visibility of a modal dialog.
 * @param {HTMLElement} modal - The modal element to toggle.
 * @param {boolean} show - True to show the modal, false to hide it.
 * @returns {void}
 */
export function toggleModal(modal, show) {
    if (modal) {
        modal.style.display = show ? 'flex' : 'none';
        document.body.style.overflow = show ? 'hidden' : '';
    }
}

/**
 * Appends a generated name result into the UI results panel.
 * Groups generated names into thematic clusters in Forge mode.
 * @param {Object} item - The validated name object to render and append.
 * @returns {void}
 */
function appendResult(item) {
    const card = createNameCard(item);
    card.classList.add('animate-fade-in-up');

    if (appState.mode === 'forge') {
        const clusterName = (item.cluster || 'Misc').trim();
        // Find existing cluster section by a data attribute we attach to the grid
        // We look for a grid that corresponds to this cluster
        let clusterGrid = Array.from(ui.results.panel.children).find(child => child.dataset?.cluster === clusterName);

        if (!clusterGrid) {
            // Create Header
            const header = el('h3', 'text-md font-semibold text-blue-300 mt-4 first:mt-0');
            header.textContent = clusterName;
            ui.results.panel.append(header);

            // Create Grid
            clusterGrid = el('div', 'grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2');
            clusterGrid.dataset.cluster = clusterName;
            ui.results.panel.append(clusterGrid);
        }
        clusterGrid.append(card);
    } else {
        let grid = document.getElementById('results-grid');
        if (!grid) {
            grid = el('div', 'grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2');
            grid.id = 'results-grid';
            ui.results.panel.append(grid);
        }
        grid.append(card);
    }
}

/**
 * Updates the results panel in the UI with the latest generated names.
 * Uses a differential rendering strategy based on renderedCount to improve performance.
 * @returns {void}
 */
export function updateResultsPanel() {
    // 1. Handle Reset/Clear or Error conditions where we wipe the panel
    if (appState.results.length === 0) {
        if (appState.isLoading) {
            if (appState.rawApiResponse) {
                // If we have started receiving text but haven't parsed a full JSON object yet
                const streamDisplay = createMarkdownStreamDisplay(appState.rawApiResponse);
                // Keep the same skeleton structure if it exists
                ui.results.panel.replaceChildren(streamDisplay);
            } else {
                ui.results.panel.replaceChildren(createLoadingSkeleton());
            }
        } else if (appState.error) {
            ui.results.panel.replaceChildren(createErrorDisplay(appState.error));
        } else {
            if (appState.rawApiResponse) {
                ui.results.panel.replaceChildren(createJsonErrorDisplay(appState.rawApiResponse));
            } else {
                const emptyState = el('div', 'flex-1 flex items-center justify-center small-muted h-full');
                emptyState.textContent = 'No names yet — click Generate.';
                ui.results.panel.replaceChildren(emptyState);
            }
        }
        appState.renderedCount = 0;
        return;
    }

    // 2. We have results. Remove initial loader if present.
    const initialLoader = document.getElementById('initial-loader');
    if (initialLoader) initialLoader.remove();

    // If we are starting fresh (renderedCount 0), clear any previous state (empty/error/loading)
    if (appState.renderedCount === 0) {
         ui.results.panel.replaceChildren();
    }

    // 3. Append new items
    for (let i = appState.renderedCount; i < appState.results.length; i++) {
        appendResult(appState.results[i]);
    }
    appState.renderedCount = appState.results.length;

    // 4. Manage Stream Spinner (bottom loader)
    let streamSpinner = document.getElementById('stream-spinner');
    if (appState.isLoading) {
        if (!streamSpinner) {
            streamSpinner = createStreamSpinner();
            ui.results.panel.append(streamSpinner);
        } else {
            // Move to end
            ui.results.panel.append(streamSpinner);
        }
    } else {
        if (streamSpinner) streamSpinner.remove();
    }
}

/**
 * Updates the UI controls (chips, selects, inputs) to reflect the current appState.
 * @returns {void}
 */
export function updateControls() {
    updateLanguageChips();
    if (appState.mode === 'forge') {
        updateChipSelector(ui.controls.themeChips, CONFIG.THEME_OPTIONS);
    }
    if (ui.controls.generateButton) {
        if (appState.isLoading) {
            const container = el('div', 'flex items-center justify-center gap-2');
            const spinner = el('div', 'w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin');
            const text = el('span');
            text.textContent = 'Generating...';
            container.append(spinner, text);
            ui.controls.generateButton.replaceChildren(container);
        } else {
            let buttonText = "Generate Names";
            if (appState.sessionGeneratedNames.length > 0) {
                buttonText = "Generate More";
            }
            ui.controls.generateButton.textContent = buttonText;
        }
    }
    updateGenerateButtonState();
}

/**
 * Synchronizes the visual state and interactivity of the generate button.
 * Disables the button if validation requirements (languages and themes) aren't met or if currently loading.
 */
function updateGenerateButtonState() {
    const langRequirement = appState.selectedLanguages.length >= 2 && appState.selectedLanguages.length <= 3;
    const themeRequirement = appState.mode === 'forge' ? appState.selectedThemes.length >= 1 : true;
    const isReady = langRequirement && themeRequirement;

    if (ui.controls.generateButton) {
        if (appState.isLoading) {
            ui.controls.generateButton.disabled = true;
            ui.controls.generateButton.classList.remove('opacity-50', 'cursor-not-allowed');
            ui.controls.generateButton.classList.add('opacity-75', 'cursor-wait');
        } else {
            ui.controls.generateButton.disabled = !isReady;
            ui.controls.generateButton.classList.remove('opacity-75', 'cursor-wait');
            ui.controls.generateButton.classList.toggle('opacity-50', !isReady);
            ui.controls.generateButton.classList.toggle('cursor-not-allowed', !isReady);
        }
    }
}

/**
 * Updates the selected language chips in the UI.
 * @returns {void}
 */
export function updateLanguageChips() {
    ui.controls.languageChips.replaceChildren();
    const allLangs = [...new Set([...CONFIG.LANG_OPTIONS, ...appState.userLanguages])];

    appState.selectedLanguages.forEach(opt => {
        const c = el('button', 'chip active');
        c.setAttribute('aria-pressed', 'true');
        c.dataset.option = opt;
        c.textContent = opt;
        ui.controls.languageChips.append(c);
    });

    const selectedSet = new Set(appState.selectedLanguages);
    allLangs.filter(opt => !selectedSet.has(opt)).forEach(opt => {
        const c = el('button', 'chip');
        c.setAttribute('aria-pressed', 'false');
        c.textContent = opt;
        c.dataset.option = opt;
        ui.controls.languageChips.append(c);
    });
}

/**
 * Renders a list of chips into a container, indicating which ones are selected based on appState.
 * @param {HTMLElement} container - The container element to append chips to.
 * @param {string[]} options - An array of options to render as chips.
 * @returns {void}
 */
export function updateChipSelector(container, options) {
    container.replaceChildren();
    options.forEach(opt => {
        const c = el('button', 'chip'); c.textContent = opt; c.dataset.option = opt;
        const isActive = appState[container.dataset.stateKey]?.includes(opt);
        if (isActive) c.classList.add('active');
        c.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        container.append(c);
    });
}

/**
 * Updates the content of the history modal with liked and blacklisted names.
 * @returns {void}
 */
export function updateHistoryModal() {
    const historyContent = ui.modals.history.querySelector('.scrolling-panel');
    historyContent.replaceChildren();

    // Stats
    const stats = el('div', 'text-xs small-muted mb-4 p-2 bg-black/20 rounded');
    stats.textContent = `Session Turns: ${geminiService.history.length / 2}`;
    historyContent.append(stats);

    if (appState.likedNames.length > 0) {
        const likedSection = el('div');
        const likedHeader = el('h4', 'text-sm font-semibold text-green-400 mb-2');
        likedHeader.textContent = `👍 Liked Names (${appState.likedNames.length})`;
        likedSection.append(likedHeader);

        const likedList = el('div', 'space-y-2');
        appState.likedNames.forEach(nameObj => {
            const item = el('div', 'bg-[#0a1a2e] rounded p-2 text-sm');
            const nameDiv = el('div', 'font-medium');
            nameDiv.textContent = nameObj.name;
            item.append(nameDiv);

            if (nameObj.meaning) {
                const meaningDiv = el('div', 'text-xs small-muted italic mt-1');
                meaningDiv.textContent = nameObj.meaning;
                item.append(meaningDiv);
            }
            if (nameObj.roots) {
                const rootsDiv = el('div', 'text-xs small-muted mt-1');
                const rootsStrong = el('strong');
                rootsStrong.textContent = 'Roots:';
                rootsDiv.append(rootsStrong, document.createTextNode(` ${nameObj.roots}`));
                item.append(rootsDiv);
            }
            likedList.append(item);
        });
        likedSection.append(likedList);
        historyContent.append(likedSection);
    }

    if (appState.userBlacklist.length > 0) {
        const blacklistSection = el('div', 'mt-4');
        const blacklistHeader = el('h4', 'text-sm font-semibold text-red-400 mb-2');
        blacklistHeader.textContent = `👎 Blacklisted Words (${appState.userBlacklist.length})`;
        blacklistSection.append(blacklistHeader);
        const blacklistList = el('div', 'flex flex-wrap gap-2');
        appState.userBlacklist.forEach(word => {
            const chip = el('span', 'chip bg-red-900/30 text-red-300 text-xs');
            chip.textContent = word;
            blacklistList.append(chip);
        });
        blacklistSection.append(blacklistList);
        historyContent.append(blacklistSection);
    }

    if (appState.sessionGeneratedNames.length > 0) {
        const sessionSection = el('div', 'mt-4');
        const sessionHeader = el('h4', 'text-sm font-semibold text-gray-400 mb-2');
        sessionHeader.textContent = `🧠 Session Memory (showing last 20 of ${appState.sessionGeneratedNames.length})`;
        sessionSection.append(sessionHeader);
        const sessionNote = el('div', 'text-xs small-muted mb-2');
        sessionNote.textContent = 'Names avoided this session to prevent repetition:';
        const sessionList = el('div', 'flex flex-wrap gap-1');
        appState.sessionGeneratedNames.slice(-20).reverse().forEach(name => {
            const chip = el('span', 'text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded');
            chip.textContent = name;
            sessionList.append(chip);
        });
        sessionSection.append(sessionNote, sessionList);
        historyContent.append(sessionSection);
    }

    if (!appState.likedNames.length && !appState.userBlacklist.length && !appState.sessionGeneratedNames.length) {
        const noData = el('div', 'text-center small-muted py-8');
        noData.textContent = 'No session data yet. Generate some names to see feedback history!';
        historyContent.replaceChildren(noData);
    }
}

/**
 * Toggles the UI elements visibility based on the selected generation mode.
 * @param {string} mode - The current mode ("forge" or "harmonizer").
 * @returns {void}
 */
export function toggleModeUI(mode) {
    const isForge = mode === 'forge';
    ui.controls.forgeContainer.style.display = isForge ? 'flex' : 'none';
    ui.controls.advancedSection.style.display = isForge ? 'block' : 'none';
    ui.controls.harmonizerContainer.style.display = isForge ? 'none' : 'flex';
    ui.controls.themesSection.style.display = isForge ? 'block' : 'none';

    ui.results.header.className = "flex justify-between items-end";

    const titleContainer = el('div');
    const headerTitle = el('h2', 'text-lg font-semibold');
    headerTitle.textContent = isForge ? 'Results' : 'Harmonized Names';
    const headerSubtitle = el('div', 'small-muted');
    headerSubtitle.textContent = isForge ? 'Poetic, culturally coined names' : 'Names that work across cultures';
    titleContainer.append(headerTitle, headerSubtitle);

    const btnContainer = el('div', 'flex gap-2');
    const copyAllBtn = el('button', 'chip text-xs');
    copyAllBtn.id = 'copy-all-btn';
    copyAllBtn.title = 'Copy all names';
    copyAllBtn.textContent = 'Copy All';
    copyAllBtn.addEventListener('click', handleCopyAll);

    const exportBtn = el('button', 'chip text-xs');
    exportBtn.id = 'export-btn';
    exportBtn.title = 'Download JSON';
    exportBtn.textContent = 'JSON';
    exportBtn.addEventListener('click', handleExport);

    const exportCsvBtn = el('button', 'chip text-xs');
    exportCsvBtn.id = 'export-csv-btn';
    exportCsvBtn.title = 'Download CSV';
    exportCsvBtn.textContent = 'CSV';
    exportCsvBtn.addEventListener('click', handleExportCsv);

    btnContainer.append(copyAllBtn, exportBtn, exportCsvBtn);

    ui.results.header.replaceChildren(titleContainer, btnContainer);

    appState.results = []; updateResultsPanel(); updateControls();
}
