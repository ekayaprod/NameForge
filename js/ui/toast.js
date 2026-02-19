import { el } from '../utils.js';

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
