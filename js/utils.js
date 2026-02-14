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
 * Displays a toast notification message on the screen.
 *
 * @param {string} msg - The message to display.
 * @param {boolean} [isError=false] - Whether the message indicates an error (changes styling).
 */
export const showToast = (msg, isError = false) => {
  const t = el('div', `fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded shadow text-sm fade ${isError ? 'bg-red-800' : 'bg-[#0f2a41]'} text-white z-50`);
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
};
