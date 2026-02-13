import { el, showToast } from './utils.js';
import { appState, debouncedSaveState } from './state.js';
import { CONFIG } from './config.js';
import { geminiService } from './api.js';

export const ui = {
    root: document.getElementById('app'),
    controls: {},
    results: {},
    modals: {},
};

let generateHandler = null;

export function setGenerateHandler(handler) {
    generateHandler = handler;
}

export function toggleModal(modal, show) {
    if (modal) {
        modal.style.display = show ? 'flex' : 'none';
        document.body.style.overflow = show ? 'hidden' : '';
    }
}

function createControlSection(label, controlElement) {
    const section = el('div');
    const labelEl = el('label', 'text-sm font-medium');
    labelEl.textContent = label;
    controlElement.classList.add('mt-1');

    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(controlElement.tagName)) {
        if (!controlElement.id) {
            controlElement.id = `ctrl-${Math.random().toString(36).substr(2, 9)}`;
        }
        labelEl.htmlFor = controlElement.id;
    }

    section.append(labelEl, controlElement);
    return section;
}

function createSelectControl(options, selectedValue, changeHandler) {
    const select = el('select', 'w-full bg-[#0b1622] border border-[#223447] rounded px-3 py-2 text-sm');
    options.forEach(opt => {
        const optionEl = el('option');
        if (typeof opt === 'object') {
            optionEl.value = opt.value;
            optionEl.textContent = opt.text;
        } else {
            optionEl.value = opt;
            optionEl.textContent = opt;
        }
        if (optionEl.value === selectedValue) optionEl.selected = true;
        select.append(optionEl);
    });
    select.addEventListener('change', changeHandler);
    return select;
}

function createNumericInputControl(label, stateKey, min, max, step) {
    const input = el('input', 'w-full bg-[#0b1622] border border-[#223447] rounded px-3 py-2 text-sm');
    input.type = 'number';
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = appState[stateKey];
    input.addEventListener('change', e => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value >= min && value <= max) {
            appState[stateKey] = value;
            debouncedSaveState();
        } else {
            e.target.value = appState[stateKey]; // Revert if invalid
        }
    });
    return createControlSection(label, input);
}

function createContextInput(labelText, stateKey, containerClass = '') {
    const container = el('div', containerClass);

    const label = el('label', 'block text-xs text-gray-400 font-medium mb-1 ml-0.5');
    label.textContent = labelText;
    const inputId = `input-${stateKey}`;
    label.htmlFor = inputId;

    const input = el('input', 'w-full bg-[#0b1622] border border-[#223447] rounded px-3 py-2 text-sm');
    input.id = inputId;
    input.placeholder = labelText;
    input.value = appState[stateKey];
    input.addEventListener('input', e => {
        appState[stateKey] = e.target.value.trim();
        updateControls();
        debouncedSaveState();
    });

    container.append(label, input);
    return container;
}

export function updateResultsPanel() {
    ui.results.panel.innerHTML = '';
    if (appState.isLoading) {
        ui.results.panel.innerHTML = `
        <div class="flex flex-col items-center justify-center py-8 gap-4">
            <div class="spinner"></div>
            <div class="text-sm small-muted">Crafting names...</div>
        </div>`;
    } else if (appState.error) {
        const escapedError = String(appState.error).replace(/</g, '&lt;');
        ui.results.panel.innerHTML = `<div class="bg-[#2b1a1a] border border-[#5b2626] rounded p-4"><div class="text-red-300 font-semibold">Error</div><div class="small-muted mt-2">${escapedError}</div></div>`;
    } else if (!appState.results.length) {
        if (appState.rawApiResponse) {
            const escapedResponse = appState.rawApiResponse.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            ui.results.panel.innerHTML = `
                <div class="flex flex-col gap-3 p-2">
                    <div class="font-semibold text-yellow-400">JSON Parsing Failed</div>
                    <div class="small-muted">The API returned a response, but it was not in the expected JSON format. Here is the raw text from the model:</div>
                    <pre class="w-full h-64 bg-[#0b1622] border border-[#223447] rounded p-2 text-xs font-mono overflow-auto">${escapedResponse}</pre>
                </div>`;
        } else {
                ui.results.panel.innerHTML = '<div class="flex-1 flex items-center justify-center small-muted h-full">No names yet — click Generate.</div>';
        }
    } else {
        const grid = el('div','grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2');
        if (appState.mode === 'forge') {
            const clusters = appState.results.reduce((acc, item) => ((acc[item.cluster] = acc[item.cluster] || []).push(item), acc), {});
            Object.keys(clusters).sort().forEach(clusterName => {
                ui.results.panel.insertAdjacentHTML('beforeend', `<h3 class="text-md font-semibold text-blue-300 mt-4 first:mt-0">${clusterName}</h3>`);
                const clusterGrid = el('div','grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2');
                clusters[clusterName].forEach(item => clusterGrid.append(createNameCard(item)));
                ui.results.panel.append(clusterGrid);
            });
        } else {
            appState.results.forEach(item => grid.append(createNameCard(item)));
            ui.results.panel.append(grid);
        }
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

function updateLanguageChips() {
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

function updateChipSelector(container, options) {
    container.innerHTML = '';
    options.forEach(opt => {
        const c = el('button', 'chip'); c.textContent = opt; c.dataset.option = opt;
        const isActive = appState[container.dataset.stateKey]?.includes(opt);
        if (isActive) c.classList.add('active');
        c.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        container.append(c);
    });
}

function createNameCard(item) {
    const card = el('div',`bg-[#081426] border border-[#123047] rounded p-4 flex flex-col gap-2 fade`);
    card.dataset.nameCard = item.name;
    const header = el('div', 'flex items-start justify-between gap-2');
    header.innerHTML = `<div class="text-xl font-semibold">${item.name}</div>`;
    card.append(header);

    const isLiked = appState.likedNames.some(n => n.name === item.name);
    const isDisliked = appState.userBlacklist.includes(item.name.toLowerCase());

    if (appState.mode === 'forge') {
        const meaningEl = el('div', 'italic small-muted'); meaningEl.textContent = item.meaning || '—';
        const rootsEl = el('div', 'text-xs mt-auto pt-2 small-muted'); rootsEl.innerHTML = `<strong>Roots:</strong> ${item.roots || '—'}`;
        const actions = el('div', 'flex flex-wrap gap-2 mt-2');
        actions.innerHTML = `<button class="chip" data-action="copy-name" data-name="${item.name}" aria-label="Copy name">Copy</button><button class="chip thumb-btn ${isLiked ? 'active' : ''}" data-action="thumb-up" data-name="${item.name}" aria-label="Like name">👍</button><button class="chip thumb-btn ${isDisliked ? 'active' : ''}" data-action="thumb-down" data-name="${item.name}" aria-label="Blacklist name">👎</button>`;
        card.append(meaningEl, rootsEl, actions);
    } else {
        const statusColor = item.valid ? 'text-green-400' : 'text-yellow-400';
        const validation = el('div', 'text-xs');
        validation.innerHTML = `<strong>Validation:</strong> <span class="${statusColor}">${item.valid ? 'Pass' : 'Approximate'}</span>`;
        if (item.semanticCheck !== 'Pass') {
        validation.innerHTML += `<br><strong>Semantic Note:</strong> <span class="text-yellow-400">${item.semanticCheck}</span>`;
        }
        const pronunciations = el('div', 'flex flex-col gap-1 mt-2 text-sm');
        item.pronunciations?.forEach(p => pronunciations.insertAdjacentHTML('beforeend', `<div><strong>${p.lang}:</strong> <span class="italic small-muted">/${p.phonetic}/</span></div>`));
        const actions = el('div', 'flex flex-wrap gap-2 mt-2');
        actions.innerHTML = `<button class="chip" data-action="copy-name" data-name="${item.name}" aria-label="Copy name">Copy</button>`;
        card.append(validation, pronunciations, actions);
    }
    return card;
}

function handleCopyAll() {
    if (!appState.results.length) { showToast('No results to copy.', true); return; }
    const text = appState.results.map(r => {
        if (appState.mode === 'forge') return `${r.name} - ${r.meaning}`;
        return `${r.name} (${r.valid ? 'Valid' : 'Approx'})`;
    }).join('\n');
    navigator.clipboard.writeText(text);
    showToast('All names copied!');
}

function handleExport() {
    if (!appState.results.length) { showToast('No results to export.', true); return; }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState.results, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `nameforge_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function handleSurpriseMe() {
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

function handleControlsClick(event) {
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

function handleFeedback(name, isThumbUp) {
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

function handleResultsPanelClick(event) {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;
    const { action, name } = btn.dataset;

    switch (action) {
        case 'copy-name':
        navigator.clipboard.writeText(name);
        showToast('Copied!');
        break;
        case 'thumb-up':
        handleFeedback(name, true);
        break;
        case 'thumb-down':
        handleFeedback(name, false);
        break;
    }
}

function createModal(id, title, contentEl, footerContent) {
    const modal = el('div', 'modal-backdrop items-center justify-center');
    modal.id = id;
    const content = el('div', 'modal-content bg-[#0e2030] border border-[#1b3146] rounded-lg p-6 flex flex-col gap-4 w-full max-w-lg');
    content.innerHTML = `<h3 class="text-lg font-semibold">${title}</h3>`;
    const scrollableContent = el('div', 'overflow-y-auto max-h-[60vh] pr-2 scrolling-panel');
    scrollableContent.append(contentEl);
    content.append(scrollableContent);
    if(footerContent) {
        const footer = el('div', 'flex gap-2 justify-end mt-2 pt-4 border-t border-gray-700/50');
        footer.append(...footerContent);
        content.append(footer);
    }
    modal.append(content);
    return modal;
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

function createHeader() {
    const header = el('div', 'flex justify-between items-center');
    const titleDiv = el('div');
    titleDiv.innerHTML = `<h1 class="text-xl font-semibold">NameForge</h1><div class="small-muted mt-1">Craft a name with meaning</div>`;
    const buttonsDiv = el('div', 'flex items-center gap-2');

    const resetBtn = el('button', 'chip');
    resetBtn.textContent = '↺ Reset Context';
    resetBtn.title = 'Clear chat history and start fresh';
    resetBtn.addEventListener('click', () => {
        geminiService.resetHistory();
        appState.sessionGeneratedNames = [];
        showToast('Session context cleared.');
        updateControls();
    });

    const historyBtn = el('button', 'chip');
    historyBtn.textContent = 'History';
    historyBtn.addEventListener('click', () => { updateHistoryModal(); toggleModal(ui.modals.history, true); });

    const settingsBtn = el('button', 'chip');
    settingsBtn.textContent = 'Settings';
    settingsBtn.addEventListener('click', () => toggleModal(ui.modals.settings, true));

    buttonsDiv.append(resetBtn, historyBtn, settingsBtn);
    header.append(titleDiv, buttonsDiv);
    return header;
}

function createControlsPanel() {
    const left = el('div','md:col-span-1 bg-[#071425] border border-[#0e2334] rounded-xl p-5 flex flex-col gap-4 h-fit');
    left.append(createHeader());

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
        createContextInput("Surname", "surname"),
        createContextInput("Sibling Names", "siblingNames"),
        createContextInput("First Name (for middle)", "firstNameForMiddle", "col-span-2")
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
    const toggleModeUI = (mode) => {
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
    };

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
        if(generateHandler) generateHandler();
    });
}
