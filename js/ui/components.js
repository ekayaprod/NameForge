import { el } from '../utils.js';
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
    input.addEventListener('input', e => {
        appState[stateKey] = e.target.value.trim();
        if (onInput) onInput(e);
        debouncedSaveState();
    });

    container.append(label, input);
    return container;
}

export function createNameCard(item) {
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

export function createModal(id, title, contentEl, footerContent) {
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

export function createHeader(onReset, onHistory, onSettings) {
    const header = el('div', 'flex justify-between items-center');
    const titleDiv = el('div');
    titleDiv.innerHTML = `<h1 class="text-xl font-semibold">NameForge</h1><div class="small-muted mt-1">Craft a name with meaning</div>`;
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
