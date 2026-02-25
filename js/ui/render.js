import { ui } from './state.js';
import { appState } from '../state.js';
import { CONFIG } from '../config.js';
import { el } from '../utils.js';
import { createNameCard, createLoadingSkeleton, createErrorDisplay, createJsonErrorDisplay, createStreamSpinner } from './components.js';
import { geminiService } from '../api.js';
import { handleCopyAll, handleExport } from './actions.js';

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

export function toggleModal(modal, show) {
    if (modal) {
        modal.style.display = show ? 'flex' : 'none';
        document.body.style.overflow = show ? 'hidden' : '';
    }
}

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

export function updateResultsPanel() {
    // 1. Handle Reset/Clear or Error conditions where we wipe the panel
    if (appState.results.length === 0) {
        if (appState.isLoading) {
            ui.results.panel.replaceChildren(createLoadingSkeleton());
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

export function updateControls() {
    updateLanguageChips();
    if (appState.mode === 'forge') {
        updateChipSelector(ui.controls.themeChips, CONFIG.THEME_OPTIONS);
    }
    if (ui.controls.generateButton) {
        if (appState.isLoading) {
            ui.controls.generateButton.innerHTML = `<div class="flex items-center justify-center gap-2"><div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div><span>Generating...</span></div>`;
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

export function updateLanguageChips() {
    ui.controls.languageChips.innerHTML = '';
    const allLangs = [...new Set([...CONFIG.LANG_OPTIONS, ...appState.userLanguages])];

    appState.selectedLanguages.forEach(opt => {
        const c = el('button', 'chip active');
        c.setAttribute('aria-pressed', 'true');
        c.dataset.option = opt;
        let content = opt;
        c.innerHTML = content;
        ui.controls.languageChips.append(c);
    });

    allLangs.filter(opt => !appState.selectedLanguages.includes(opt)).forEach(opt => {
        const c = el('button', 'chip');
        c.setAttribute('aria-pressed', 'false');
        c.textContent = opt;
        c.dataset.option = opt;
        ui.controls.languageChips.append(c);
    });
}

export function updateChipSelector(container, options) {
    container.innerHTML = '';
    options.forEach(opt => {
        const c = el('button', 'chip'); c.textContent = opt; c.dataset.option = opt;
        const isActive = appState[container.dataset.stateKey]?.includes(opt);
        if (isActive) c.classList.add('active');
        c.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        container.append(c);
    });
}

export function updateHistoryModal() {
    const historyContent = ui.modals.history.querySelector('.scrolling-panel');
    historyContent.innerHTML = '';

    // Stats
    const stats = el('div', 'text-xs small-muted mb-4 p-2 bg-black/20 rounded');
    stats.textContent = `Session Turns: ${geminiService.history.length / 2}`;
    historyContent.append(stats);

    if (appState.likedNames.length > 0) {
        const likedSection = el('div');
        likedSection.innerHTML = `<h4 class="text-sm font-semibold text-green-400 mb-2">👍 Liked Names (${appState.likedNames.length})</h4>`;
        const likedList = el('div', 'space-y-2');
        appState.likedNames.forEach(nameObj => {
            const item = el('div', 'bg-[#0a1a2e] rounded p-2 text-sm');
            item.innerHTML = `<div class="font-medium">${nameObj.name}</div>`;
            if (nameObj.meaning) item.innerHTML += `<div class="text-xs small-muted italic mt-1">${nameObj.meaning}</div>`;
            if (nameObj.roots) item.innerHTML += `<div class="text-xs small-muted mt-1"><strong>Roots:</strong> ${nameObj.roots}</div>`;
            likedList.append(item);
        });
        likedSection.append(likedList);
        historyContent.append(likedSection);
    }

    if (appState.userBlacklist.length > 0) {
        const blacklistSection = el('div', 'mt-4');
        blacklistSection.innerHTML = `<h4 class="text-sm font-semibold text-red-400 mb-2">👎 Blacklisted Words (${appState.userBlacklist.length})</h4>`;
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
        sessionSection.innerHTML = `<h4 class="text-sm font-semibold text-gray-400 mb-2">🧠 Session Memory (showing last 20 of ${appState.sessionGeneratedNames.length})</h4>`;
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
        historyContent.innerHTML = '<div class="text-center small-muted py-8">No session data yet. Generate some names to see feedback history!</div>';
    }
}

export function toggleModeUI(mode) {
    const isForge = mode === 'forge';
    ui.controls.forgeContainer.style.display = isForge ? 'flex' : 'none';
    ui.controls.advancedSection.style.display = isForge ? 'block' : 'none';
    ui.controls.harmonizerContainer.style.display = isForge ? 'none' : 'flex';
    ui.controls.themesSection.style.display = isForge ? 'block' : 'none';

    ui.results.header.className = "flex justify-between items-end";
    ui.results.header.innerHTML = `
        <div>
            <h2 class="text-lg font-semibold">${isForge ? 'Results' : 'Harmonized Names'}</h2>
            <div class="small-muted">${isForge ? 'Poetic, culturally coined names' : 'Names that work across cultures'}</div>
        </div>
        <div class="flex gap-2">
                <button id="copy-all-btn" class="chip text-xs" title="Copy all names">Copy All</button>
                <button id="export-btn" class="chip text-xs" title="Download JSON">Export</button>
        </div>
    `;
    ui.results.header.querySelector('#copy-all-btn').addEventListener('click', handleCopyAll);
    ui.results.header.querySelector('#export-btn').addEventListener('click', handleExport);

    appState.results = []; updateResultsPanel(); updateControls();
}
