/**
 * Sanitizes user input to prevent prompt injection and XSS.
 * Removes control characters and escapes HTML special characters.
 * @param {string} input - The raw user input.
 * @returns {string} The sanitized input.
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  if (!input) return '';

  // 1. Remove control characters (except common whitespace)
  // This regex matches control characters including newlines in some ranges,
  // but we want to allow normal text.
  // ASCII control chars: \x00-\x1F (except \x09 \x0A \x0D maybe?)
  // Let's just strip strictly non-printable low ASCII except tab/newline
  let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 2. Escape HTML entities to prevent XSS
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // 3. Basic length limit to prevent token exhaustion attacks via a single field
  // 500 characters should be plenty for a name or simple context.
  if (sanitized.length > 500) {
      sanitized = sanitized.substring(0, 500);
  }

  return sanitized;
}
