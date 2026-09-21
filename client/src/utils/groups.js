/*
 * Group lending — form options, validation and API payload.
 * Rules mirror server/controllers/groupController.js; the server stays authoritative.
 */
import { t } from '../i18n/bilingual';
import { normalizeNin, validateNin } from './nida';
import { normalizeOtherId, validateOtherId } from './kyc';

export const MIN_MEMBERS = 2;
export const MAX_MEMBERS = 50;
const PHONE_RE = /^\+?[\d\s-]{9,16}$/;

export const IDENTITY_OPTIONS = [
  { value: 'NIDA',     key: 'kyc.nida',    numberKey: 'nida.label' },
  { value: 'License',  key: 'kyc.driving', numberKey: 'kyc.drivingNumber' },
  { value: 'Voter_ID', key: 'kyc.voter',   numberKey: 'kyc.voterNumber' },
  { value: 'None',     key: 'kyc.none',    numberKey: null },
];

export const MARITAL_OPTIONS = [
  { value: 'Single',    en: 'Single',    sw: 'Hajaoa / Hajaolewa' },
  { value: 'Married',   en: 'Married',   sw: 'Ameoa / Ameolewa' },
  { value: 'Widowed',   en: 'Widowed',   sw: 'Mjane / Mgane' },
  { value: 'Divorced',  en: 'Divorced',  sw: 'Ametalikiana' },
  { value: 'Separated', en: 'Separated', sw: 'Wametengana' },
];

export const OWNERSHIP_OPTIONS = [
  { value: 'Personal',    en: 'Personal',    sw: 'Binafsi' },
  { value: 'Partnership', en: 'Partnership', sw: 'Ubia' },
  { value: 'Other',       en: 'Other',       sw: 'Nyingine' },
];

export const BUSINESS_TYPES = [
  'Retail shop (Duka)', 'Food vendor (Mama lishe)', 'Vegetables & fruits (Mboga na matunda)',
  'Clothing (Nguo / Mitumba)', 'Tailoring (Ushonaji)', 'Salon / Barber (Saluni)', 'Agriculture (Kilimo)',
  'Livestock (Mifugo)', 'Transport (Bodaboda / Bajaji)', 'Wholesale (Jumla)', 'Hardware (Vifaa vya ujenzi)',
  'Services (Huduma)',
];

let sequence = 0;
const uid = () => `m${Date.now().toString(36)}${(sequence += 1)}`;

export const EMPTY_GROUP_FORM = {
  group_name: '', business_type: '', market_name: '', business_location: '', operational_duration_together: '',
};

export function newMemberForm() {
  return {
    key: uid(),
    full_name: '', parent_or_guardian_name: '', phone_number: '',
    identity_type: 'NIDA', identity_number: '',
    residential_address: '', residential_area: '', residency_duration: '', marital_status: '',
    business: {
      business_name: '', business_type: '', room_or_location_number: '', business_duration: '',
      average_weekly_sales: '', average_weekly_profit: '', ownership_type: 'Personal',
    },
  };
}

/** 27 → "2 yrs 3 mo". */
export function formatMonths(value) {
  if (value === '' || value == null || !Number.isFinite(Number(value))) return '—';
  const m = Number(value);
  const years = Math.floor(m / 12);
  const rest = m % 12;
  const parts = [];
  if (years) parts.push(`${years} yr${years === 1 ? '' : 's'}`);
  if (rest || !years) parts.push(`${rest} mo`);
  return parts.join(' ');
}

export const identityLabel = type => IDENTITY_OPTIONS.find(o => o.value === type) || IDENTITY_OPTIONS[3];

const textError     = v => (String(v ?? '').trim().length >= 2 ? null : t('grp.err.text'));
const durationError = v => (v === '' || v == null || !Number.isInteger(Number(v)) || Number(v) < 0 ? t('grp.err.duration') : null);
const amountError   = v => (v === '' || v == null || !(Number(v) >= 0) ? t('grp.err.amount') : null);
const compact       = obj => Object.fromEntries(Object.entries(obj).filter(([, v]) => v));
export const hasErrors = errors => Object.keys(errors || {}).length > 0;

/** Normalised identity number, or null for "None"/empty. */
export function normalizedIdentity(type, number) {
  if (type === 'None') return null;
  const n = type === 'NIDA' ? normalizeNin(number) : normalizeOtherId(number);
  return n || null;
}

export function identityError(type, number) {
  if (!IDENTITY_OPTIONS.some(o => o.value === type)) return t('grp.err.choose');
  if (type === 'None') return null;
  const result = type === 'NIDA'
    ? validateNin(number, { required: true })
    : validateOtherId(number, type === 'License' ? 'driving' : 'voter', { required: true });
  return result.valid ? null : { en: result.en, sw: result.sw };
}

export function groupErrors(g) {
  return compact({
    group_name:                    textError(g.group_name),
    business_type:                 textError(g.business_type),
    market_name:                   textError(g.market_name),
    business_location:             textError(g.business_location),
    operational_duration_together: durationError(g.operational_duration_together),
  });
}

/** { list: error|null, byKey: { [memberKey]: { field: error } } } — includes duplicate phone / ID checks. */
export function membersErrors(members) {
  const list = members.length < MIN_MEMBERS || members.length > MAX_MEMBERS
    ? t('grp.err.members', { min: MIN_MEMBERS, max: MAX_MEMBERS })
    : null;
  const phoneKey = m => String(m.phone_number ?? '').replace(/\D/g, '');
  const idKey    = m => { const n = normalizedIdentity(m.identity_type, m.identity_number); return n ? `${m.identity_type}:${n}` : null; };
  const phones = {};
  const ids = {};
  for (const m of members) {
    if (phoneKey(m)) phones[phoneKey(m)] = (phones[phoneKey(m)] || 0) + 1;
    if (idKey(m)) ids[idKey(m)] = (ids[idKey(m)] || 0) + 1;
  }

  const byKey = {};
  for (const m of members) {
    const errors = compact({
      full_name:               textError(m.full_name),
      parent_or_guardian_name: textError(m.parent_or_guardian_name),
      phone_number: !PHONE_RE.test(String(m.phone_number ?? '').trim()) ? t('security.errPhone')
        : phones[phoneKey(m)] > 1 ? t('grp.err.dupPhone') : null,
      identity_number: identityError(m.identity_type, m.identity_number)
        || (idKey(m) && ids[idKey(m)] > 1 ? t('grp.err.dupId') : null),
      residential_address: textError(m.residential_address),
      residential_area:    textError(m.residential_area),
      residency_duration:  durationError(m.residency_duration),
      marital_status:      MARITAL_OPTIONS.some(o => o.value === m.marital_status) ? null : t('grp.err.choose'),
    });
    if (hasErrors(errors)) byKey[m.key] = errors;
  }
  return { list, byKey };
}

export function businessesErrors(members) {
  const byKey = {};
  for (const m of members) {
    const b = m.business || {};
    const sales  = Number(b.average_weekly_sales);
    const profit = Number(b.average_weekly_profit);
    const errors = compact({
      business_name:     textError(b.business_name),
      business_type:     textError(b.business_type),
      room_or_location_number: String(b.room_or_location_number ?? '').trim().length > 40 ? t('grp.err.room') : null,
      business_duration: durationError(b.business_duration),
      average_weekly_sales: amountError(b.average_weekly_sales),
      average_weekly_profit: amountError(b.average_weekly_profit)
        || (b.average_weekly_sales !== '' && profit > sales ? t('grp.err.profit') : null),
      ownership_type: OWNERSHIP_OPTIONS.some(o => o.value === b.ownership_type) ? null : t('grp.err.choose'),
    });
    if (hasErrors(errors)) byKey[m.key] = errors;
  }
  return { byKey };
}

/** POST /api/groups/register body. */
export function registrationPayload(group, members, leaderKey) {
  const txt = v => String(v ?? '').trim();
  return {
    group: {
      group_name:                    txt(group.group_name),
      business_type:                 txt(group.business_type),
      market_name:                   txt(group.market_name),
      business_location:             txt(group.business_location),
      operational_duration_together: Number(group.operational_duration_together),
    },
    members: members.map(m => ({
      full_name:               txt(m.full_name),
      parent_or_guardian_name: txt(m.parent_or_guardian_name),
      phone_number:            txt(m.phone_number),
      identity_type:           m.identity_type,
      identity_number:         normalizedIdentity(m.identity_type, m.identity_number),
      residential_address:     txt(m.residential_address),
      residential_area:        txt(m.residential_area),
      residency_duration:      Number(m.residency_duration),
      marital_status:          m.marital_status,
      business: {
        business_name:           txt(m.business.business_name),
        business_type:           txt(m.business.business_type),
        room_or_location_number: txt(m.business.room_or_location_number) || null,
        business_duration:       Number(m.business.business_duration),
        average_weekly_sales:    Number(m.business.average_weekly_sales),
        average_weekly_profit:   Number(m.business.average_weekly_profit),
        ownership_type:          m.business.ownership_type,
      },
    })),
    leader_index: members.findIndex(m => m.key === leaderKey),
  };
}
