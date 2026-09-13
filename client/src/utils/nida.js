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
 */

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

const fail = (code, en, sw, digits, extra = {}) => ({ valid: false, code, en, sw, digits, ...extra });

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
  const raw    = String(value ?? '').trim();
  const digits = normalizeNin(raw);

  if (!digits) {
    return required
      ? fail('required', 'National ID number (NIN) is required.', 'Namba ya Utambulisho wa Taifa (NIN) inahitajika.', '')
      : { valid: true, empty: true, digits: '', warnings: [] };
  }

  if (!/^\d+$/.test(digits)) {
    return fail('digits',
      'Use digits only — letters and symbols are not allowed.',
      'Tumia tarakimu pekee — herufi na alama haziruhusiwi.', digits);
  }

  if (digits.length !== NIN_LENGTH) {
    return fail('length',
      `Must be exactly ${NIN_LENGTH} digits — ${digits.length} entered.`,
      `Lazima iwe tarakimu ${NIN_LENGTH} kamili — umeingiza ${digits.length}.`,
      digits, { partial: digits.length < NIN_LENGTH });
  }

  if (new RegExp(`(\\d)\\1{${REPEAT_RUN - 1},}`).test(digits)) {
    return fail('repeated',
      'Repeated-digit pattern detected — this is not a valid NIN.',
      'Tarakimu zinazojirudia zimegunduliwa — hii si NIN halali.', digits);
  }

  if (new Set(digits).size < MIN_DISTINCT) {
    return fail('variety',
      'Too few distinct digits — this looks like a placeholder, not a real NIN.',
      'Tarakimu tofauti ni chache mno — hii inaonekana si NIN halisi.', digits);
  }

  if (hasSequentialRun(digits, SEQUENCE_RUN)) {
    return fail('sequential',
      'Sequential pattern detected (e.g. 12345…) — this is not a valid NIN.',
      'Mfuatano wa tarakimu (mf. 12345…) umegunduliwa — hii si NIN halali.', digits);
  }

  if (hasRepeatingBlock(digits)) {
    return fail('block',
      'Repeating block pattern detected — this is not a valid NIN.',
      'Mpangilio unaojirudia umegunduliwa — hii si NIN halali.', digits);
  }

  const year  = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day   = Number(digits.slice(6, 8));
  const currentYear = now.getFullYear();

  if (year < NIN_MIN_YEAR || year > currentYear) {
    return fail('year',
      `Birth year ${year} is out of range (${NIN_MIN_YEAR}–${currentYear}).`,
      `Mwaka wa kuzaliwa ${year} uko nje ya kiwango (${NIN_MIN_YEAR}–${currentYear}).`, digits);
  }
  if (month < 1 || month > 12) {
    return fail('month',
      `Birth month “${digits.slice(4, 6)}” is invalid — digits 5–6 must be 01–12.`,
      `Mwezi wa kuzaliwa “${digits.slice(4, 6)}” si sahihi — tarakimu 5–6 lazima ziwe 01–12.`, digits);
  }
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    return fail('day',
      `Birth day “${digits.slice(6, 8)}” does not exist in that month.`,
      `Siku ya kuzaliwa “${digits.slice(6, 8)}” haipo katika mwezi huo.`, digits);
  }

  const dob = new Date(year, month - 1, day);
  if (dob > now) {
    return fail('future',
      'Date of birth encoded in the NIN is in the future.',
      'Tarehe ya kuzaliwa iliyo kwenye NIN iko mbele ya leo.', digits);
  }

  const duplicate = customers.find(c =>
    c.id !== excludeId && c.id_number && normalizeNin(c.id_number) === digits);
  if (duplicate) {
    const code = `CL-${String(duplicate.id).padStart(5, '0')}`;
    return fail('duplicate',
      `This NIN is already registered to ${duplicate.full_name} (${code}).`,
      `NIN hii tayari imesajiliwa kwa ${duplicate.full_name} (${code}).`, digits, { duplicate });
  }

  const age = ageOn(dob, now);
  const warnings = [];
  if (age < 18) {
    warnings.push({
      en: `Holder is ${age} — under 18. Confirm borrower eligibility.`,
      sw: `Mmiliki ana miaka ${age} — chini ya 18. Thibitisha ustahiki wa mkopaji.`,
    });
  }
  if (age > 100) {
    warnings.push({
      en: `Holder would be ${age} years old — double-check the number.`,
      sw: `Mmiliki angekuwa na miaka ${age} — hakiki namba tena.`,
    });
  }

  return { valid: true, digits, formatted: formatNin(digits), dob, age, warnings };
}
