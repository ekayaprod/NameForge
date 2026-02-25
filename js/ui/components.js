import { el, debounce } from '../utils.js';
import { appState, debouncedSaveState } from '../state.js';
import { CONFIG } from '../config.js';

export function createControlSection(label, controlElement) {
    const section = el('div');
    const labelEl = el('label', 'text-sm font-medium');
    labelEl.textContent = label;
    controlElement.classList.add('mt-1');

    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(controlElement.tagName)) {
        if (!controlElement.id) {
            controlElement.id = `ctrl-${Math.random().toString(36).substring(2, 11)}`;
        }
        labelEl.htmlFor = controlElement.id;
    }

    section.append(labelEl, controlElement);
    return section;
}

export function createSelectControl(options, selectedValue, changeHandler) {
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

export function createNumericInputControl(label, stateKey, min, max, step) {
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

export function createContextInput(labelText, stateKey, onInput, containerClass = '') {
    const container = el('div', containerClass);

    const label = el('label', 'block text-xs text-gray-400 font-medium mb-1 ml-0.5');
    label.textContent = labelText;
    const inputId = `input-${stateKey}`;
    label.htmlFor = inputId;

    const input = el('input', 'w-full bg-[#0b1622] border border-[#223447] rounded px-3 py-2 text-sm');
    input.id = inputId;
    input.placeholder = labelText;
    input.value = appState[stateKey];

    const debouncedOnInput = onInput ? debounce(onInput, 300) : null;
    input.addEventListener('input', e => {
        appState[stateKey] = e.target.value.trim();
        if (debouncedOnInput) debouncedOnInput(e);
        debouncedSaveState();
    });

    container.append(label, input);
    return container;
}

export function createNameCard(item) {
    const card = el('div',`bg-[#081426] border border-[#123047] rounded p-4 flex flex-col gap-2 fade`);
    card.dataset.nameCard = item.name;
    const header = el('div', 'flex items-start justify-between gap-2');
    const nameEl = el('div', 'text-xl font-semibold');
    nameEl.textContent = item.name;
    header.append(nameEl);
    card.append(header);

    const isLiked = appState.likedNames.some(n => n.name === item.name);
    const isDisliked = appState.userBlacklist.includes(item.name.toLowerCase());

    if (appState.mode === 'forge') {
        const meaningEl = el('div', 'italic small-muted'); meaningEl.textContent = item.meaning || '—';
        const rootsEl = el('div', 'text-xs mt-auto pt-2 small-muted');
        const rootsStrong = el('strong');
        rootsStrong.textContent = 'Roots:';
        rootsEl.append(rootsStrong, document.createTextNode(` ${item.roots || '—'}`));

        const actions = el('div', 'flex flex-wrap gap-2 mt-2');
        const copyBtn = el('button', 'chip');
        copyBtn.textContent = 'Copy';
        copyBtn.dataset.action = 'copy-name';
        copyBtn.dataset.name = item.name;
        copyBtn.setAttribute('aria-label', 'Copy name');

        const likeBtn = el('button', `chip thumb-btn ${isLiked ? 'active' : ''}`);
        likeBtn.textContent = '👍';
        likeBtn.dataset.action = 'thumb-up';
        likeBtn.dataset.name = item.name;
        likeBtn.setAttribute('aria-label', 'Like name');

        const dislikeBtn = el('button', `chip thumb-btn ${isDisliked ? 'active' : ''}`);
        dislikeBtn.textContent = '👎';
        dislikeBtn.dataset.action = 'thumb-down';
        dislikeBtn.dataset.name = item.name;
        dislikeBtn.setAttribute('aria-label', 'Blacklist name');

        actions.append(copyBtn, likeBtn, dislikeBtn);
        card.append(meaningEl, rootsEl, actions);
    } else {
        const statusColor = item.valid ? 'text-green-400' : 'text-yellow-400';
        const validation = el('div', 'text-xs');
        const valStrong = el('strong');
        valStrong.textContent = 'Validation:';
        const valSpan = el('span', statusColor);
        valSpan.textContent = item.valid ? 'Pass' : 'Approximate';
        validation.append(valStrong, document.createTextNode(' '), valSpan);

        if (item.semanticCheck !== 'Pass') {
            validation.append(el('br'));
            const semStrong = el('strong');
            semStrong.textContent = 'Semantic Note:';
            const semSpan = el('span', 'text-yellow-400');
            semSpan.textContent = item.semanticCheck;
            validation.append(semStrong, document.createTextNode(' '), semSpan);
        }
        const pronunciations = el('div', 'flex flex-col gap-1 mt-2 text-sm');
        item.pronunciations?.forEach(p => {
            const pDiv = el('div');
            const pStrong = el('strong');
            pStrong.textContent = `${p.lang}:`;
            const pSpan = el('span', 'italic small-muted');
            pSpan.textContent = ` /${p.phonetic}/`;
            pDiv.append(pStrong, pSpan);
            pronunciations.append(pDiv);
        });
        const actions = el('div', 'flex flex-wrap gap-2 mt-2');
        const copyBtn = el('button', 'chip');
        copyBtn.textContent = 'Copy';
        copyBtn.dataset.action = 'copy-name';
        copyBtn.dataset.name = item.name;
        copyBtn.setAttribute('aria-label', 'Copy name');
        actions.append(copyBtn);

        card.append(validation, pronunciations, actions);
    }
    return card;
}

export function createModal(id, title, contentEl, footerContent) {
    const modal = el('div', 'modal-backdrop items-center justify-center');
    modal.id = id;
    const content = el('div', 'modal-content bg-[#0e2030] border border-[#1b3146] rounded-lg p-6 flex flex-col gap-4 w-full max-w-lg');
    const titleEl = el('h3', 'text-lg font-semibold');
    titleEl.textContent = title;
    content.append(titleEl);

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

export function createHeader(onReset, onHistory, onSettings) {
    const header = el('div', 'flex justify-between items-center');
    const titleDiv = el('div');
    const h1 = el('h1', 'text-xl font-semibold');
    h1.textContent = 'NameForge';
    const sub = el('div', 'small-muted mt-1');
    sub.textContent = 'Craft a name with meaning';
    titleDiv.append(h1, sub);

    const buttonsDiv = el('div', 'flex items-center gap-2');

    const resetBtn = el('button', 'chip');
    resetBtn.textContent = '↺ Reset Context';
    resetBtn.title = 'Clear chat history and start fresh';
    resetBtn.addEventListener('click', onReset);

    const historyBtn = el('button', 'chip');
    historyBtn.textContent = 'History';
    historyBtn.addEventListener('click', onHistory);

    const settingsBtn = el('button', 'chip');
    settingsBtn.textContent = 'Settings';
    settingsBtn.addEventListener('click', onSettings);

    buttonsDiv.append(resetBtn, historyBtn, settingsBtn);
    header.append(titleDiv, buttonsDiv);
    return header;
}

export function createLoadingSkeleton() {
    const container = el('div', 'flex flex-col items-center justify-center py-8 gap-4');
    container.id = 'initial-loader';

    // Spinner
    const spinner = el('div', 'spinner');

    // Text with pulse
    const text = el('div', 'text-sm small-muted animate-pulse');
    text.textContent = 'Crafting names...';

    container.append(spinner, text);
    return container;
}

export function createStreamSpinner() {
    const spinnerContainer = el('div', 'flex justify-center py-4 w-full');
    spinnerContainer.id = 'stream-spinner';
    const spinner = el('div', 'w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin');
    spinnerContainer.append(spinner);
    return spinnerContainer;
}

export function createErrorDisplay(error) {
    const container = el('div', 'bg-[#2b1a1a] border border-[#5b2626] rounded p-4');
    const title = el('div', 'text-red-300 font-semibold');
    title.textContent = 'Error';
    const message = el('div', 'small-muted mt-2');
    message.textContent = String(error);
    container.append(title, message);
    return container;
}

export function createJsonErrorDisplay(rawResponse) {
    const container = el('div', 'flex flex-col gap-3 p-2');
    const title = el('div', 'font-semibold text-yellow-400');
    title.textContent = 'JSON Parsing Failed';

    const desc = el('div', 'small-muted');
    desc.textContent = 'The API returned a response, but it was not in the expected JSON format. Here is the raw text from the model:';

    const pre = el('pre', 'w-full h-64 bg-[#0b1622] border border-[#223447] rounded p-2 text-xs font-mono overflow-auto');
    pre.textContent = rawResponse;

    container.append(title, desc, pre);
    return container;
}
