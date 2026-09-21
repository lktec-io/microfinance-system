const svc = require('../services/groupService');
const { asyncHandler } = require('../middleware/errorHandler');
const { fail, MAX_MONEY } = require('../utils/helpers');

const IDENTITY_TYPES   = ['NIDA', 'License', 'Voter_ID', 'None'];
const IDENTITY_LABELS  = { NIDA: 'NIDA number', License: 'driving licence number', Voter_ID: "voter's ID number" };
const MARITAL_STATUSES = ['Single', 'Married', 'Widowed', 'Divorced', 'Separated'];
const OWNERSHIP_TYPES  = ['Personal', 'Partnership', 'Other'];
const MIN_MEMBERS = 2;
const MAX_MEMBERS = 50;
const MAX_MONTHS  = 1200;
const PHONE_RE    = /^\+?[\d\s-]{9,16}$/;

class RegistrationError extends Error {}
const reject = message => { throw new RegistrationError(message); };

/** Strip tags and trim — nested arrays are not covered by the sanitizeBody middleware. */
const text = v => (v == null ? '' : String(v).replace(/<[^>]*>/g, '').trim());

function requiredText(value, label, min, max) {
  const s = text(value);
  if (s.length < min || s.length > max) reject(`${label} is required (${min}–${max} characters)`);
  return s;
}
function optionalText(value, label, max) {
  const s = text(value);
  if (s.length > max) reject(`${label} is too long (max ${max} characters)`);
  return s || null;
}
function months(value, label) {
  const n = Number(value);
  if (value === '' || value == null || !Number.isInteger(n) || n < 0 || n > MAX_MONTHS) {
    reject(`${label} must be a whole number of months (0–${MAX_MONTHS})`);
  }
  return n;
}
function amount(value, label) {
  const n = Number(value);
  if (value === '' || value == null || !Number.isFinite(n) || n < 0 || n > MAX_MONEY) reject(`${label} must be 0 or more`);
  return Math.round(n * 100) / 100;
}
function identity(type, number, who) {
  if (!IDENTITY_TYPES.includes(type)) reject(`${who}: choose an identity type`);
  if (type === 'None') return { identity_type: 'None', identity_number: null };
  const raw = text(number);
  if (type === 'NIDA') {
    const digits = raw.replace(/[\s-]/g, '');
    if (!/^\d{20}$/.test(digits)) reject(`${who}: NIDA number must be exactly 20 digits`);
    return { identity_type: 'NIDA', identity_number: digits };
  }
  const value = raw.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z0-9/-]{5,20}$/.test(value)) reject(`${who}: ${IDENTITY_LABELS[type]} must be 5–20 letters, digits, "-" or "/"`);
  return { identity_type: type, identity_number: value };
}

/** Validate and normalise POST /api/groups/register. Throws RegistrationError on the first problem. */
function normalizeRegistration(body) {
  const g = body?.group;
  if (!g || typeof g !== 'object' || Array.isArray(g)) reject('Group details are required');
  const group = {
    group_name:                    requiredText(g.group_name, 'Group name', 2, 120),
    business_type:                 requiredText(g.business_type, 'Group business activity', 2, 80),
    market_name:                   requiredText(g.market_name, 'Market name', 2, 120),
    business_location:             requiredText(g.business_location, 'Business location', 2, 160),
    operational_duration_together: months(g.operational_duration_together, 'Time operating together'),
  };

  const list = body.members;
  if (!Array.isArray(list) || list.length < MIN_MEMBERS || list.length > MAX_MEMBERS) {
    reject(`A group needs ${MIN_MEMBERS}–${MAX_MEMBERS} members`);
  }

  const phones = new Set();
  const ids    = new Set();
  const members = list.map((m, i) => {
    const who = `Member ${i + 1}`;
    if (!m || typeof m !== 'object' || Array.isArray(m)) reject(`${who}: details are missing`);

    const full_name = requiredText(m.full_name, `${who}: full name`, 2, 100);
    const parent_or_guardian_name = requiredText(m.parent_or_guardian_name, `${who}: parent or guardian name`, 2, 100);
    const phone_number = text(m.phone_number);
    if (!PHONE_RE.test(phone_number)) reject(`${who}: phone number is invalid`);
    const phoneKey = phone_number.replace(/\D/g, '');
    if (phones.has(phoneKey)) reject(`${who}: phone number is already used by another member`);
    phones.add(phoneKey);

    const id = identity(m.identity_type, m.identity_number, who);
    if (id.identity_number) {
      const key = `${id.identity_type}:${id.identity_number}`;
      if (ids.has(key)) reject(`${who}: ${IDENTITY_LABELS[id.identity_type]} is already used by another member`);
      ids.add(key);
    }

    const residential_address = requiredText(m.residential_address, `${who}: residential address`, 2, 255);
    const residential_area    = requiredText(m.residential_area, `${who}: residential area`, 2, 120);
    const residency_duration  = months(m.residency_duration, `${who}: time living in the area`);
    if (!MARITAL_STATUSES.includes(m.marital_status)) reject(`${who}: choose a marital status`);

    const b = m.business;
    if (!b || typeof b !== 'object' || Array.isArray(b)) reject(`${who}: business details are required`);
    const business = {
      business_name:           requiredText(b.business_name, `${who}: business name`, 2, 120),
      business_type:           requiredText(b.business_type, `${who}: business type`, 2, 80),
      room_or_location_number: optionalText(b.room_or_location_number, `${who}: room / stall number`, 40),
      business_duration:       months(b.business_duration, `${who}: business age`),
      average_weekly_sales:    amount(b.average_weekly_sales, `${who}: average weekly sales`),
      average_weekly_profit:   amount(b.average_weekly_profit, `${who}: average weekly profit`),
      ownership_type:          b.ownership_type,
    };
    if (business.average_weekly_profit > business.average_weekly_sales) {
      reject(`${who}: weekly profit cannot be more than weekly sales`);
    }
    if (!OWNERSHIP_TYPES.includes(business.ownership_type)) reject(`${who}: choose the business ownership type`);

    return {
      full_name, parent_or_guardian_name, phone_number, ...id,
      residential_address, residential_area, residency_duration,
      marital_status: m.marital_status, business,
    };
  });

  const leaderIndex = Number(body.leader_index);
  if (!Number.isInteger(leaderIndex) || leaderIndex < 0 || leaderIndex >= members.length) {
    reject('Choose the group leader from the members');
  }
  return { group, members, leaderIndex };
}

const getAll = asyncHandler(async (_req, res) => {
  res.json(await svc.findAll());
});

const getOne = asyncHandler(async (req, res) => {
  const group = await svc.findById(req.params.id);
  if (!group) return fail(res, 'Group not found', 404);
  res.json(group);
});

const register = asyncHandler(async (req, res) => {
  let data;
  try {
    data = normalizeRegistration(req.body);
  } catch (err) {
    if (err instanceof RegistrationError) return fail(res, err.message);
    throw err;
  }

  if (await svc.nameExists(data.group.group_name)) {
    return fail(res, `A group named "${data.group.group_name}" is already registered`, 409);
  }
  const conflicts = await svc.identityConflicts(data.members);
  if (conflicts.length) {
    const c = conflicts[0];
    return fail(res, `${IDENTITY_LABELS[c.identity_type]} ${c.identity_number} is already registered to ${c.full_name} in group "${c.group_name}"`, 409);
  }

  res.status(201).json(await svc.register(data, req.user?.id));
});

module.exports = {
  getAll, getOne, register, normalizeRegistration, RegistrationError,
  IDENTITY_TYPES, MARITAL_STATUSES, OWNERSHIP_TYPES, MIN_MEMBERS, MAX_MEMBERS,
};
