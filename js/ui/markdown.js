import { el } from '../utils.js';

/**
 * Parses a markdown string and securely converts it to DOM elements.
 * Supports paragraphs, headings, blockquotes, lists, and code blocks.
 * Maps elements to the project's existing Tailwind UI design system.
 * Prevents XSS by avoiding dangerouslySetInnerHTML.
 *
 * @param {string} text - The markdown text to parse.
 * @returns {HTMLElement} A document fragment or a container div with the rendered elements.
 */
export function parseMarkdownToDOM(text) {
    const container = el('div', 'flex flex-col gap-2 w-full text-sm');

    if (!text) return container;

    // A simple line-by-line parser for demonstration.
    // In a real scenario, consider a lightweight markdown parser library
    // but the task asks to not bootstrap foreign packages, so we'll do a simple custom one.

    const lines = text.split('\n');
    let currentList = null;
    let currentCodeBlock = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Code Block
        if (line.startsWith('```')) {
            if (currentCodeBlock) {
                // End code block
                container.append(currentCodeBlock.element);
                currentCodeBlock = null;
            } else {
                // Start code block
                const pre = el('pre', 'w-full bg-[#0b1622] border border-[#223447] rounded p-2 text-xs font-mono overflow-auto mb-2');
                const code = el('code');
                pre.append(code);
                currentCodeBlock = { element: pre, codeElement: code };
            }
            continue;
        }

        if (currentCodeBlock) {
            // Inside code block
            currentCodeBlock.codeElement.textContent += line + '\n';
            continue;
        }

        // List closing
        if (currentList && !(line.trim().startsWith('- ') || line.trim().startsWith('* '))) {
            currentList = null;
        }

        // Headings
        if (line.startsWith('# ')) {
            const h1 = el('h1', 'text-xl font-bold mt-2 mb-1');
            h1.textContent = line.substring(2);
            container.append(h1);
            continue;
        }
        if (line.startsWith('## ')) {
            const h2 = el('h2', 'text-lg font-bold mt-2 mb-1');
            h2.textContent = line.substring(3);
            container.append(h2);
            continue;
        }
        if (line.startsWith('### ')) {
            const h3 = el('h3', 'text-md font-bold mt-2 mb-1');
            h3.textContent = line.substring(4);
            container.append(h3);
            continue;
        }

        // Blockquotes
        if (line.startsWith('> ')) {
            const blockquote = el('blockquote', 'border-l-4 border-blue-500 pl-4 py-1 small-muted italic');
            blockquote.textContent = line.substring(2);
            container.append(blockquote);
            continue;
        }

        // Unordered Lists
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            if (!currentList) {
                currentList = el('ul', 'flex flex-col gap-2 my-2');
                currentList.setAttribute('role', 'list');
                container.append(currentList);
            }
            const card = el('li', 'bg-[#0a1a2e] border border-[#1b3146] rounded p-3 hover:bg-[#0e2030] transition-colors shadow-sm flex items-start gap-3');
            card.setAttribute('role', 'listitem');

            // Icon / Bullet wrapper
            const iconWrapper = el('div', 'mt-0.5 text-blue-400');
            iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>`;

            // Content
            const content = el('div', 'flex-1 text-gray-200');
            content.textContent = line.trim().substring(2);

            card.append(iconWrapper, content);
            currentList.append(card);
            continue;
        }

        // Paragraphs
        if (line.trim() !== '') {
            const p = el('p', 'leading-relaxed mb-2 last:mb-0');
            p.textContent = line;
            container.append(p);
        }
    }

    if (currentCodeBlock) {
        container.append(currentCodeBlock.element);
    }

    return container;
}
