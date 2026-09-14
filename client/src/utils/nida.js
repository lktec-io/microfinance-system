/*
 * Tanzanian NIDA National Identification Number (NIN) — structural validation.
 *
 * NIDA does not publish a check-digit algorithm, so no client-side check can
 * prove a number was actually issued. This engine rejects numbers that are
 * structurally impossible or obviously fabricated. Confirming that a NIN
 * belongs to a real person still requires NIDA's verification service.
 *
 * Format enforced: 20 digits, printed as YYYYMMDD-XXXXX-XXXXX-XX, where the
 * first 8 digits are the holder's date of birth.
 *
 * All messages come from the bilingual catalogue (i18n/bilingual.js).
 */
import { t } from '../i18n/bilingual';

export const NIN_LENGTH = 20;
export const NIN_MIN_YEAR = 1900;

const SEQUENCE_RUN = 8;      // 8+ consecutive ascending/descending digits
const REPEAT_RUN   = 7;      // 7+ identical digits in a row
const MIN_DISTINCT = 3;      // fewer distinct digits than this is a placeholder
const BLOCK_SIZES  = [1, 2, 4, 5, 10];

/** Strip spaces and hyphens. */
export function normalizeNin(value) {
  return String(value ?? '').replace(/[\s-]/g, '');
}

/** Group digits as YYYYMMDD-XXXXX-XXXXX-XX (partial input allowed). */
export function formatNin(value) {
  const d = normalizeNin(value).replace(/\D/g, '').slice(0, NIN_LENGTH);
  return [d.slice(0, 8), d.slice(8, 13), d.slice(13, 18), d.slice(18, 20)].filter(Boolean).join('-');
}

/** Display helper: grouped when the stored value is a 20-digit NIN, raw otherwise. */
export function displayNin(value) {
  const v = String(value ?? '').trim();
  if (!v) return '—';
  return /^\d{20}$/.test(normalizeNin(v)) ? formatNin(v) : v;
}

function hasSequentialRun(digits, run) {
  let up = 1;
  let down = 1;
  for (let i = 1; i < digits.length; i++) {
    const prev = Number(digits[i - 1]);
    const cur  = Number(digits[i]);
    up   = cur === (prev + 1) % 10 ? up + 1 : 1;
    down = cur === (prev + 9) % 10 ? down + 1 : 1;
    if (up >= run || down >= run) return true;
  }
  return false;
}

function hasRepeatingBlock(digits) {
  return BLOCK_SIZES.some(size =>
    digits.length % size === 0 && digits.slice(0, size).repeat(digits.length / size) === digits);
}

function ageOn(dob, now) {
  let age = now.getFullYear() - dob.getFullYear();
  const beforeBirthday = now.getMonth() < dob.getMonth()
    || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

const fail = (code, key, params, digits, extra = {}) =>
  ({ valid: false, code, ...t(key, params), digits, ...extra });

/**
 * Validate a NIN.
 * @param {string} value
 * @param {object}  [opts]
 * @param {Array}   [opts.customers]  existing clients, for duplicate detection
 * @param {number}  [opts.excludeId]  client being edited (ignored in duplicate check)
 * @param {boolean} [opts.required]   empty value is an error when true
 * @param {Date}    [opts.now]
 */
export function validateNin(value, { customers = [], excludeId = null, required = true, now = new Date() } = {}) {
  const digits = normalizeNin(String(value ?? '').trim());

  if (!digits) {
    return required
      ? fail('required', 'nida.required', {}, '')
      : { valid: true, empty: true, digits: '', warnings: [] };
  }

  if (!/^\d+$/.test(digits)) return fail('digits', 'nida.digits', {}, digits);

  if (digits.length !== NIN_LENGTH) {
    return fail('length', 'nida.length', { expected: NIN_LENGTH, count: digits.length }, digits,
      { partial: digits.length < NIN_LENGTH });
  }

  if (new RegExp(`(\\d)\\1{${REPEAT_RUN - 1},}`).test(digits)) return fail('repeated', 'nida.repeated', {}, digits);
  if (new Set(digits).size < MIN_DISTINCT)                   return fail('variety', 'nida.variety', {}, digits);
  if (hasSequentialRun(digits, SEQUENCE_RUN))                return fail('sequential', 'nida.sequential', {}, digits);
  if (hasRepeatingBlock(digits))                             return fail('block', 'nida.block', {}, digits);

  const year  = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day   = Number(digits.slice(6, 8));
  const currentYear = now.getFullYear();

  if (year < NIN_MIN_YEAR || year > currentYear) {
    return fail('year', 'nida.year', { year, min: NIN_MIN_YEAR, max: currentYear }, digits);
  }
  if (month < 1 || month > 12) {
    return fail('month', 'nida.month', { month: digits.slice(4, 6) }, digits);
  }
  if (day < 1 || day > new Date(year, month, 0).getDate()) {
    return fail('day', 'nida.day', { day: digits.slice(6, 8) }, digits);
  }

  const dob = new Date(year, month - 1, day);
  if (dob > now) return fail('future', 'nida.future', {}, digits);

  const duplicate = customers.find(c =>
    c.id !== excludeId && c.id_number && normalizeNin(c.id_number) === digits);
  if (duplicate) {
    const code = `CL-${String(duplicate.id).padStart(5, '0')}`;
    return fail('duplicate', 'nida.duplicate', { name: duplicate.full_name, code }, digits, { duplicate });
  }

  const age = ageOn(dob, now);
  const warnings = [];
  if (age < 18)  warnings.push(t('nida.minor', { age }));
  if (age > 100) warnings.push(t('nida.elderly', { age }));

  return { valid: true, digits, formatted: formatNin(digits), dob, age, warnings };
}
