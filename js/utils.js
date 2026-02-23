/**
 * Creates a new DOM element with the specified tag and class name.
 *
 * @param {string} tag - The HTML tag name of the element to create.
 * @param {string} [cls=''] - The class name(s) to assign to the element.
 * @returns {HTMLElement} The created DOM element.
 */
export const el = (tag, cls='') => {
  const d = document.createElement(tag);
  if (cls) d.className = cls;
  return d;
};

/**
 * Creates a debounced version of a function that delays its execution until after
 * a specified wait time has elapsed since the last time it was invoked.
 *
 * @param {Function} func - The function to debounce.
 * @param {number} delay - The number of milliseconds to delay.
 * @returns {Function} A debounced version of the original function.
 */
export const debounce = (func, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

/**
 * Extracts complete JSON objects from a string that represents a partial or complete JSON array.
 * Robustly handles prefixes like `[` and delimiters like `,`.
 *
 * @param {string} text - The accumulated text which contains a JSON array.
 * @returns {Array<Object>} - An array of parsed objects found in the text.
 */
export function extractJsonObjects(text) {
    const results = [];
    let bracketCount = 0;
    let start = -1;
    let inString = false;
    let escape = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (escape) {
            escape = false;
            continue;
        }

        if (char === '\\') {
            escape = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            continue;
        }

        if (inString) continue;

        if (char === '{') {
            if (bracketCount === 0) start = i;
            bracketCount++;
        } else if (char === '}') {
            bracketCount--;
            if (bracketCount === 0 && start !== -1) {
                const jsonStr = text.substring(start, i + 1);
                try {
                    const obj = JSON.parse(jsonStr);
                    results.push(obj);
                } catch (e) {
                    // Ignore invalid JSON
                }
                start = -1;
            }
        }
    }
    return results;
}
