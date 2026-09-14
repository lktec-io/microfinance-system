/*
 * Client verification (KYC) — identification types and validation.
 *
 * NIDA numbers use the structural engine in utils/nida.js. Voter's ID and
 * driving licence numbers have no published check format available to us,
 * so they get sanity checks only (allowed characters, length, obvious fakes,
 * duplicates). Messages come from the bilingual catalogue.
 */
import { t } from '../i18n/bilingual';
import { formatNin, normalizeNin } from './nida';

export const ID_TYPES = [
  { value: 'nida',    key: 'kyc.nida',    short: 'NIN',      numberKey: null },
  { value: 'voter',   key: 'kyc.voter',   short: 'Voter ID', numberKey: 'kyc.voterNumber' },
  { value: 'driving', key: 'kyc.driving', short: 'Licence',  numberKey: 'kyc.drivingNumber' },
  { value: 'none',    key: 'kyc.none',    short: 'No ID',    numberKey: null },
];

const byValue = Object.fromEntries(ID_TYPES.map(o => [o.value, o]));

/** Verification type for a stored client; legacy rows are inferred from the number. */
export function detectIdType(customer) {
  if (!customer) return 'nida';
  if (byValue[customer.id_type]) return customer.id_type;
  if (!customer.id_number) return 'none';
  return 'nida';
}

export function idShortLabel(type) {
  return byValue[type]?.short || 'ID';
}

/** e.g. "NIN 19850612-42018-00001-47", "Voter ID T-1234567", "No ID". */
export function displayId(customer) {
  const type = detectIdType(customer);
  if (type === 'none' || !customer?.id_number) return 'No ID';
  const number = type === 'nida' && /^\d{20}$/.test(normalizeNin(customer.id_number))
    ? formatNin(customer.id_number)
    : customer.id_number;
  return `${idShortLabel(type)} ${number}`;
}

export function normalizeOtherId(value) {
  return String(value ?? '').replace(/\s+/g, '').toUpperCase();
}

function bilingualFail(code, key, type, extra = {}) {
  const option = byValue[type];
  const labelEn = t(option.numberKey).en;
  const labelSw = t(option.numberKey).sw;
  const params = { ...extra };
  return {
    valid: false,
    code,
    en: t(key, { ...params, label: labelEn }).en,
    sw: t(key, { ...params, label: labelSw }).sw,
  };
}

/** Validate a Voter's ID or driving licence number. */
export function validateOtherId(value, type, { customers = [], excludeId = null, required = true } = {}) {
  const normalized = normalizeOtherId(value);
  const core = normalized.replace(/[/-]/g, '');

  if (!normalized) {
    return required
      ? { ...bilingualFail('required', 'kyc.otherRequired', type), normalized }
      : { valid: true, empty: true, normalized };
  }
  if (!/^[A-Z0-9/-]+$/.test(normalized)) return { ...bilingualFail('chars', 'kyc.otherChars', type), normalized };
  if (core.length < 5 || normalized.length > 20) return { ...bilingualFail('length', 'kyc.otherLength', type), normalized };
  if (/^(.)\1+$/.test(core)) return { ...bilingualFail('repeated', 'kyc.otherRepeated', type), normalized };

  const duplicate = customers.find(c =>
    c.id !== excludeId && c.id_type === type && normalizeOtherId(c.id_number) === normalized);
  if (duplicate) {
    const code = `CL-${String(duplicate.id).padStart(5, '0')}`;
    return { ...bilingualFail('duplicate', 'kyc.otherDuplicate', type, { name: duplicate.full_name, code }), normalized, duplicate };
  }
  return { valid: true, normalized };
}
