/**
 * A central object holding references to significant DOM elements and UI sections.
 * Acts as an organizational registry for components initialized during layout.
 *
 * @type {{
 *   root: HTMLElement | null,
 *   controls: Object.<string, HTMLElement>,
 *   results: Object.<string, HTMLElement>,
 *   modals: Object.<string, HTMLElement>
 * }}
 */
export const ui = {
    root: document.getElementById('app'),
    controls: {},
    results: {},
    modals: {},
};

let generateHandler = null;

/**
 * Sets the callback handler for the primary generation action.
 * @param {Function} handler - The function to call when generation is triggered.
 * @returns {void}
 */
export function setGenerateHandler(handler) {
    generateHandler = handler;
}

/**
 * Retrieves the current generation callback handler.
 * @returns {Function|null} The current generation handler, or null if not set.
 */
export function getGenerateHandler() {
    return generateHandler;
}
