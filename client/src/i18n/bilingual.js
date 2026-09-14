/*
 * Bilingual message catalogue — English (en) and Kiswahili (sw).
 *
 * Every key must define BOTH languages with the SAME {placeholders}.
 * `npm run check:i18n`-style scripts verify this before release; keep new
 * user-facing copy for NIDA validation, error screens and the system reset here.
 */
export const MESSAGES = {
  /* ── NIDA NIN validation ─────────────────────────────────────────── */
  'nida.label': {
    en: 'National ID number (NIDA NIN)',
    sw: 'Namba ya Utambulisho wa Taifa (NIN ya NIDA)',
  },
  'nida.required': {
    en: 'National ID number (NIN) is required.',
    sw: 'Namba ya Utambulisho wa Taifa (NIN) inahitajika.',
  },
  'nida.digits': {
    en: 'Use digits only — letters and symbols are not allowed.',
    sw: 'Tumia tarakimu pekee — herufi na alama haziruhusiwi.',
  },
  'nida.length': {
    en: 'Must be exactly {expected} digits — {count} entered.',
    sw: 'Lazima iwe tarakimu {expected} kamili — umeingiza {count}.',
  },
  'nida.repeated': {
    en: 'Repeated-digit pattern detected — this is not a valid NIN.',
    sw: 'Tarakimu zinazojirudia zimegunduliwa — hii si NIN halali.',
  },
  'nida.variety': {
    en: 'Too few distinct digits — this looks like a placeholder, not a real NIN.',
    sw: 'Tarakimu tofauti ni chache mno — hii inaonekana si NIN halisi.',
  },
  'nida.sequential': {
    en: 'Sequential pattern detected (e.g. 12345…) — this is not a valid NIN.',
    sw: 'Mfuatano wa tarakimu (mf. 12345…) umegunduliwa — hii si NIN halali.',
  },
  'nida.block': {
    en: 'Repeating block pattern detected — this is not a valid NIN.',
    sw: 'Mpangilio unaojirudia umegunduliwa — hii si NIN halali.',
  },
  'nida.year': {
    en: 'Birth year {year} is out of range ({min}–{max}).',
    sw: 'Mwaka wa kuzaliwa {year} uko nje ya kiwango ({min}–{max}).',
  },
  'nida.month': {
    en: 'Birth month “{month}” is invalid — digits 5–6 must be 01–12.',
    sw: 'Mwezi wa kuzaliwa “{month}” si sahihi — tarakimu 5–6 lazima ziwe 01–12.',
  },
  'nida.day': {
    en: 'Birth day “{day}” does not exist in that month.',
    sw: 'Siku ya kuzaliwa “{day}” haipo katika mwezi huo.',
  },
  'nida.future': {
    en: 'Date of birth encoded in the NIN is in the future.',
    sw: 'Tarehe ya kuzaliwa iliyo kwenye NIN iko mbele ya leo.',
  },
  'nida.duplicate': {
    en: 'This NIN is already registered to {name} ({code}).',
    sw: 'NIN hii tayari imesajiliwa kwa {name} ({code}).',
  },
  'nida.minor': {
    en: 'Holder is {age} — under 18. Confirm borrower eligibility.',
    sw: 'Mmiliki ana miaka {age} — chini ya 18. Thibitisha ustahiki wa mkopaji.',
  },
  'nida.elderly': {
    en: 'Holder would be {age} years old — double-check the number.',
    sw: 'Mmiliki angekuwa na miaka {age} — hakiki namba tena.',
  },
  'nida.verified': {
    en: 'NIN structure verified',
    sw: 'Muundo wa NIN umethibitishwa',
  },
  'nida.hint': {
    en: '20 digits from the NIDA card — the first 8 are the date of birth (YYYYMMDD).',
    sw: 'Tarakimu 20 kutoka kitambulisho cha NIDA — 8 za kwanza ni tarehe ya kuzaliwa (YYYYMMDD).',
  },
  'nida.remaining': {
    en: 'Digits remaining: {count}',
    sw: 'Tarakimu zilizobaki: {count}',
  },
  'nida.legacy': {
    en: 'Stored ID fails NIDA checks: {reason} Update it to the client’s 20-digit NIN.',
    sw: 'Namba iliyohifadhiwa haipiti ukaguzi wa NIDA: {reason} Iboreshe kuwa NIN ya tarakimu 20.',
  },
  'nida.fixBeforeSave': {
    en: 'Fix the National ID number before saving.',
    sw: 'Rekebisha namba ya NIDA kabla ya kuhifadhi.',
  },

  /* ── Error boundary ──────────────────────────────────────────────── */
  'error.title': {
    en: 'Something went wrong on this page',
    sw: 'Hitilafu imetokea kwenye ukurasa huu',
  },
  'error.body': {
    en: 'Your data is safe. Reload the page, or return to the dashboard and try again.',
    sw: 'Taarifa zako ziko salama. Pakia upya ukurasa, au rudi kwenye dashibodi ujaribu tena.',
  },
  'error.reload': { en: 'Reload page', sw: 'Pakia upya' },
  'error.home':   { en: 'Go to dashboard', sw: 'Nenda kwenye dashibodi' },

  /* ── Sign-in ─────────────────────────────────────────────────────── */
  'auth.remember': { en: 'Remember me', sw: 'Nikumbuke' },
  'auth.rememberHint': {
    en: 'Keeps you signed in on this device for 7 days.',
    sw: 'Utabaki umeingia kwenye kifaa hiki kwa siku 7.',
  },

  /* ── System reset (danger zone) ──────────────────────────────────── */
  'reset.title': {
    en: 'System reset — permanently delete all business data',
    sw: 'Kuweka upya mfumo — kufuta kabisa taarifa zote za biashara',
  },
  'reset.warning': {
    en: 'This wipes every client, loan, repayment, expense and SMS log from the database. It cannot be undone and there is no backup inside the app.',
    sw: 'Hii inafuta kila mteja, mkopo, marejesho, matumizi na kumbukumbu za SMS kwenye hifadhidata. Haiwezi kutenduliwa na hakuna nakala ndani ya mfumo.',
  },
  'reset.kept': {
    en: 'User accounts (admins and staff) are kept so the team can sign in again.',
    sw: 'Akaunti za watumiaji (wasimamizi na wafanyakazi) zinabaki ili timu iweze kuingia tena.',
  },
  'reset.backup': {
    en: 'Take a database backup first if any of this data might be needed later.',
    sw: 'Hifadhi nakala ya hifadhidata kwanza ikiwa taarifa hizi zinaweza kuhitajika baadaye.',
  },
  'reset.typeToConfirm': {
    en: 'Type {phrase} to unlock the reset',
    sw: 'Andika {phrase} ili kufungua kitufe cha kufuta',
  },
  'reset.phraseMismatch': {
    en: 'Type the word exactly, in capital letters: {phrase}',
    sw: 'Andika neno hilo kama lilivyo, kwa herufi kubwa: {phrase}',
  },
  'reset.password': {
    en: 'Your admin password',
    sw: 'Nenosiri lako la msimamizi',
  },
  'reset.button': {
    en: 'Permanently delete all data',
    sw: 'Futa taarifa zote kabisa',
  },
  'reset.working': {
    en: 'Deleting all data…',
    sw: 'Inafuta taarifa zote…',
  },
  'reset.success': {
    en: 'System reset complete. All business data was deleted — sign in to start fresh.',
    sw: 'Mfumo umewekwa upya. Taarifa zote za biashara zimefutwa — ingia ili kuanza upya.',
  },
  'reset.failed': {
    en: 'The reset did not run. No data was changed.',
    sw: 'Ufutaji haukufanyika. Hakuna taarifa iliyobadilishwa.',
  },
};

/** Look up a message in both languages, filling {placeholders}. */
export function t(key, params = {}) {
  const entry = MESSAGES[key];
  if (!entry) return { en: key, sw: key };
  const fill = text => text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
  return { en: fill(entry.en), sw: fill(entry.sw) };
}
