// Small, dependency-free sanitizers/validators used across the gate,
// onboarding, and trade screens. Kept simple and fast on purpose - these
// run on every keystroke.

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

export function sanitizeText(input, { maxLength = 64 } = {}) {
  if (typeof input !== 'string') return '';
  return input.replace(EMOJI_REGEX, '').replace(/\s+/g, ' ').trimStart().slice(0, maxLength);
}

export function sanitizeName(input, { maxLength = 40 } = {}) {
  if (typeof input !== 'string') return '';
  // Letters (incl. accented), spaces, hyphens and apostrophes only.
  return sanitizeText(input, { maxLength })
    .replace(/[^\p{L}\s'-]/gu, '')
    .replace(/^\s+/, '');
}

export function isValidEmail(value) {
  if (typeof value !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function isPlausibleGateCode(value) {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  return v.length >= 4 && v.length <= 16;
}

export function isPlausibleName(value) {
  return typeof value === 'string' && value.trim().length >= 2;
}

// birthDate is a JS Date. Returns { valid, age }.
export function checkAdultAge(birthDate, minAge = 18) {
  if (!(birthDate instanceof Date) || Number.isNaN(birthDate.getTime())) {
    return { valid: false, age: 0 };
  }
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return { valid: age >= minAge && age < 120, age };
}

export function sanitizeStakeInput(value) {
  if (typeof value !== 'string') return '';
  // digits + a single decimal point, nothing else
  const cleaned = value.replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) return cleaned.slice(0, 12);
  return (cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')).slice(0, 15);
}
