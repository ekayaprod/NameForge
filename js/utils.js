export const el = (tag, cls='') => {
  const d = document.createElement(tag);
  if (cls) d.className = cls;
  return d;
};

export const debounce = (func, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

export const showToast = (msg, isError = false) => {
  const t = el('div', `fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded shadow text-sm fade ${isError ? 'bg-red-800' : 'bg-[#0f2a41]'} text-white z-50`);
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
};
