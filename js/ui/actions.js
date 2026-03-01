import { ui } from './state.js';
import { appState, debouncedSaveState } from '../state.js';
import { CONFIG } from '../config.js';
import { updateControls, updateResultsPanel } from './render.js';
import { showToast } from './toast.js';

/**
 * Copies all generated names and their primary details to the clipboard.
 */
export async function handleCopyAll() {
    if (!appState.results.length) { showToast('No results to copy.', true); return; }
    const text = appState.results.map(r => {
        if (appState.mode === 'forge') return `${r.name} - ${r.meaning}`;
        return `${r.name} (${r.valid ? 'Valid' : 'Approx'})`;
    }).join('\n');
    try {
        await navigator.clipboard.writeText(text);
        showToast('All names copied!');
    } catch (err) {
        showToast('Failed to copy to clipboard', true);
    }
}

/**
 * Exports the current generation results to a JSON file.
 */
export function handleExport() {
    if (!appState.results.length) { showToast('No results to export.', true); return; }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState.results, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `nameforge_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}


/**
 * Exports the current generation results to a CSV file.
 */
export function handleExportCsv() {
    if (!appState.results.length) { showToast('No results to export.', true); return; }

    const isForge = appState.mode === 'forge';
    let headers = [];
    let rows = [];

    const escapeCsv = (str) => {
        if (str === null || str === undefined) return '""';
        const escaped = String(str).replace(/"/g, '""');
        return `"${escaped}"`;
    };

    if (isForge) {
        headers = ['name', 'roots', 'meaning', 'cluster'];
        rows = appState.results.map(r => [
            escapeCsv(r.name),
            escapeCsv(r.roots),
            escapeCsv(r.meaning),
            escapeCsv(r.cluster)
        ].join(','));
    } else {
        headers = ['name', 'valid', 'pronunciations', 'semanticCheck'];
        rows = appState.results.map(r => {
            const prons = r.pronunciations ? r.pronunciations.map(p => `${p.lang}: ${p.phonetic}`).join(' | ') : '';
            return [
                escapeCsv(r.name),
                escapeCsv(r.valid),
                escapeCsv(prons),
                escapeCsv(r.semanticCheck)
            ].join(',');
        });
    }

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", url);
    downloadAnchorNode.setAttribute("download", `nameforge_export_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    URL.revokeObjectURL(url);
}

/**
 * Randomizes selected languages and themes, then updates the UI.
 */
export function handleSurpriseMe() {
    // Random Languages (2 or 3)
    const numLangs = Math.random() > 0.5 ? 2 : 3;
    const shuffledLangs = [...CONFIG.LANG_OPTIONS].sort(() => 0.5 - Math.random());
    appState.selectedLanguages = shuffledLangs.slice(0, numLangs);

    // Random Themes (1 or 2) - only if in Forge mode
    if (appState.mode === 'forge') {
        const numThemes = Math.random() > 0.7 ? 2 : 1;
        const shuffledThemes = [...CONFIG.THEME_OPTIONS].sort(() => 0.5 - Math.random());
        appState.selectedThemes = shuffledThemes.slice(0, numThemes);
    }

    showToast('🎲 Randomized selections!');
    debouncedSaveState();
    updateControls();
}

/**
 * Event delegate for clicks within the controls panel.
 * Handles selection and deselection of option chips.
 * @param {Event} event - The click event.
 */
export function handleControlsClick(event) {
    const chip = event.target.closest('.chip[data-option]');
    if (chip) {
        const { option } = chip.dataset;
        const parentContainer = chip.parentElement;
        const stateKey = parentContainer.dataset.stateKey;
        if (!stateKey) return;

        const currentValue = appState[stateKey] || [];
        const max = stateKey === 'selectedLanguages' ? 3 : 2;

        if (currentValue.includes(option)) {
            appState[stateKey] = currentValue.filter(x => x !== option);
        } else {
            if (currentValue.length >= max) {
                appState[stateKey] = [...currentValue.slice(1), option];
            } else {
                appState[stateKey] = [...currentValue, option];
            }
        }

        debouncedSaveState();
        updateControls();
    }
}

/**
 * Handles user feedback (like/dislike) for a specific generated name.
 * Updates appState and dynamically modifies the DOM to reflect the change.
 * @param {string} name - The generated name receiving feedback.
 * @param {boolean} isThumbUp - True if liked, false if disliked (blacklisted).
 */
export function handleFeedback(name, isThumbUp) {
    const nameLower = name.toLowerCase();
    const isLiked = appState.likedNames.some(n => n.name === name);
    const isDisliked = appState.userBlacklist.includes(nameLower);

    if (isThumbUp) {
        if (isLiked) {
            appState.likedNames = appState.likedNames.filter(n => n.name !== name);
            showToast('Unliked!');
        } else {
            const nameObj = appState.results.find(r => r.name === name) || { name };
            if (nameObj) appState.likedNames.push(nameObj);
            if (isDisliked) appState.userBlacklist = appState.userBlacklist.filter(w => w !== nameLower);
            showToast('Liked!');
        }
    } else { // Thumb Down
        if (!isDisliked) {
            appState.userBlacklist.push(nameLower);
            if (isLiked) appState.likedNames = appState.likedNames.filter(n => n.name !== name);
            appState.results = appState.results.filter(item => item.name.toLowerCase() !== nameLower);
            updateResultsPanel();
            showToast('Blacklisted & removed!');
        }
    }

    debouncedSaveState();
    updateControls();
    const card = ui.results.panel.querySelector(`[data-name-card="${name}"]`);
    if (card) {
        const upBtn = card.querySelector('[data-action="thumb-up"]');
        const downBtn = card.querySelector('[data-action="thumb-down"]');
        if (upBtn) upBtn.classList.toggle('active', appState.likedNames.some(n => n.name === name));
        if (downBtn) downBtn.classList.toggle('active', appState.userBlacklist.includes(nameLower));
    }
}

/**
 * Event delegate for clicks within the results panel.
 * Handles copy, like, and dislike actions on individual name cards.
 * @param {Event} event - The click event.
 */
export async function handleResultsPanelClick(event) {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;
    const { action, name } = btn.dataset;

    switch (action) {
        case 'copy-name':
        try {
            await navigator.clipboard.writeText(name);
            showToast('Copied!');
        } catch (err) {
            showToast('Failed to copy', true);
        }
        break;
        case 'thumb-up':
        handleFeedback(name, true);
        break;
        case 'thumb-down':
        handleFeedback(name, false);
        break;
    }
}
