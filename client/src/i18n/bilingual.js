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
  'auth.forbidden': {
    en: 'You do not have permission to access this page.',
    sw: 'Hauna ruhusa ya kuona ukurasa huu',
  },
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

  /* ── Client verification (KYC) ───────────────────────────────────── */
  'kyc.typeLabel': { en: 'Verification type', sw: 'Aina ya utambulisho' },
  'kyc.nida':      { en: 'National ID (NIDA)', sw: 'Kitambulisho cha Taifa (NIDA)' },
  'kyc.voter':     { en: "Voter's ID", sw: 'Kadi ya Mpiga Kura' },
  'kyc.driving':   { en: 'Driving License', sw: 'Leseni ya Udereva' },
  'kyc.none':      { en: 'None', sw: 'Hakuna' },
  'kyc.voterNumber':   { en: "Voter's ID number", sw: 'Namba ya kadi ya mpiga kura' },
  'kyc.drivingNumber': { en: 'Driving licence number', sw: 'Namba ya leseni ya udereva' },
  'kyc.otherHint': {
    en: 'Letters, digits, "-" or "/" — 5 to 20 characters, exactly as printed on the card.',
    sw: 'Herufi, tarakimu, "-" au "/" — herufi 5 hadi 20, kama ilivyoandikwa kwenye kadi.',
  },
  'kyc.otherRequired': { en: '{label} is required.', sw: '{label} inahitajika.' },
  'kyc.otherChars': {
    en: 'Use letters, digits, "-" or "/" only.',
    sw: 'Tumia herufi, tarakimu, "-" au "/" pekee.',
  },
  'kyc.otherLength': {
    en: 'Must be 5 to 20 characters.',
    sw: 'Lazima iwe na herufi 5 hadi 20.',
  },
  'kyc.otherRepeated': {
    en: 'Repeated-character pattern — this is not a real ID number.',
    sw: 'Herufi zinazojirudia — hii si namba halisi ya utambulisho.',
  },
  'kyc.otherDuplicate': {
    en: 'This {label} is already registered to {name} ({code}).',
    sw: '{label} hii tayari imesajiliwa kwa {name} ({code}).',
  },
  'kyc.noneTitle': {
    en: 'This client is being registered without formal identification.',
    sw: 'Huyu mteja anasajiliwa bila kitambulisho rasmi.',
  },
  'kyc.noneExisting': {
    en: 'This client is registered without formal identification.',
    sw: 'Huyu mteja amesajiliwa bila kitambulisho rasmi.',
  },
  'kyc.noneBody': {
    en: 'This client will be saved with no verified ID. Confirm their identity by other means before lending.',
    sw: 'Mteja atahifadhiwa bila kitambulisho kilichothibitishwa. Thibitisha utambulisho wake kwa njia nyingine kabla ya kukopesha.',
  },
  'kyc.fixBeforeSave': {
    en: 'Fix the identification details before saving.',
    sw: 'Rekebisha taarifa za utambulisho kabla ya kuhifadhi.',
  },

  /* ── Repayment frequency ─────────────────────────────────────────── */
  'freq.label':   { en: 'Repayment frequency', sw: 'Mzunguko wa marejesho' },
  'freq.daily':   { en: 'Daily', sw: 'Kila siku' },
  'freq.weekly':  { en: 'Weekly', sw: 'Kila wiki' },
  'freq.monthly': { en: 'Monthly', sw: 'Kila mwezi' },
  'freq.per.daily':   { en: 'per day', sw: 'kwa siku' },
  'freq.per.weekly':  { en: 'per week', sw: 'kwa wiki' },
  'freq.per.monthly': { en: 'per month', sw: 'kwa mwezi' },
  'freq.installments': {
    en: '{count} installments of TZS {amount} each',
    sw: 'Awamu {count} za TZS {amount} kila moja',
  },

  /* ── Record payment ──────────────────────────────────────────────── */
  'pay.expected': {
    en: 'Expected: {count} installments of TZS {amount} each',
    sw: 'Inatarajiwa: awamu {count} za TZS {amount} kila moja',
  },
  'pay.dueByToday': {
    en: '{due} of {count} installments due by today — TZS {expected}',
    sw: 'Awamu {due} kati ya {count} zimefika muda leo — TZS {expected}',
  },
  'pay.arrears':  { en: 'Behind schedule by TZS {amount}', sw: 'Nyuma ya ratiba kwa TZS {amount}' },
  'pay.ahead':    { en: 'Ahead of schedule by TZS {amount}', sw: 'Mbele ya ratiba kwa TZS {amount}' },
  'pay.onTrack':  { en: 'On schedule', sw: 'Kwa wakati' },
  'pay.noSchedule': {
    en: 'Single repayment by the due date — this loan has no installment plan.',
    sw: 'Malipo mara moja kabla ya tarehe ya mwisho — mkopo huu hauna mpango wa awamu.',
  },
  'pay.mode':   { en: 'Payment mode', sw: 'Njia ya malipo' },
  'pay.cash':   { en: 'Cash', sw: 'Taslimu' },
  'pay.mobile': { en: 'Mobile Money', sw: 'Pesa kwa simu' },
  'pay.bank':   { en: 'Bank transfer', sw: 'Uhamisho wa benki' },
  'pay.provider':   { en: 'Mobile money provider', sw: 'Mtoa huduma wa pesa kwa simu' },
  'pay.amountSent': { en: 'Amount sent', sw: 'Kiasi kilichotumwa' },
  'pay.agentFee':   { en: 'Agent fee / commission', sw: 'Makato' },
  'pay.credited':   { en: 'Credited to the loan', sw: 'Kinachoingia kwenye mkopo' },
  'pay.feeRange': {
    en: 'Agent fees are usually TZS 500–1,000. Double-check this amount.',
    sw: 'Makato kwa kawaida ni TZS 500–1,000. Hakiki kiasi hiki.',
  },
  'pay.feeTooHigh': {
    en: 'The agent fee must be less than the amount sent.',
    sw: 'Makato lazima yawe chini ya kiasi kilichotumwa.',
  },
  'pay.timestamp':  { en: 'Payment date & time', sw: 'Tarehe na saa ya malipo' },
  'pay.futureTime': {
    en: 'Payment time cannot be in the future.',
    sw: 'Saa ya malipo haiwezi kuwa ya baadaye.',
  },

  /* ── Guarantors & collateral ─────────────────────────────────────── */
  'security.title':      { en: 'Guarantors & assets', sw: 'Wadhamini na dhamana' },
  'security.guarantor':  { en: 'Personal guarantor', sw: 'Mzamini Mtu' },
  'security.collateral': { en: 'Collateral asset', sw: 'Dhamana ya Kitu' },
  'security.none': {
    en: 'No guarantor or collateral added — this loan will be unsecured.',
    sw: 'Hakuna mzamini wala dhamana iliyoongezwa — mkopo huu hautakuwa na dhamana.',
  },

  'security.stepHint': {
    en: 'Optional — add every guarantor and pledged asset for this loan.',
    sw: 'Si lazima — ongeza kila mzamini na kila kitu kilichowekwa dhamana kwa mkopo huu.',
  },
  'security.addGuarantor':  { en: 'Add guarantor', sw: 'Ongeza mzamini' },
  'security.addCollateral': { en: 'Add asset', sw: 'Ongeza dhamana' },
  'security.fullName':      { en: 'Full name', sw: 'Jina kamili' },
  'security.phone':         { en: 'Phone number', sw: 'Namba ya simu' },
  'security.relationship':  { en: 'Relationship', sw: 'Uhusiano' },
  'security.idNumber':      { en: 'ID number', sw: 'Namba ya kitambulisho' },
  'security.description':   { en: 'Asset name / description', sw: 'Jina / maelezo ya kitu' },
  'security.descriptionHint': {
    en: 'e.g. Pikipiki Boxer 150, TV Samsung 43", Sinki',
    sw: 'mf. Pikipiki Boxer 150, TV Samsung inchi 43, Sinki',
  },
  'security.serial':    { en: 'Serial number', sw: 'Namba ya utambulisho (serial)' },
  'security.condition': { en: 'Condition', sw: 'Hali ya kitu' },
  'security.value':     { en: 'Estimated market value (TZS)', sw: 'Thamani ya soko inayokadiriwa (TZS)' },
  'security.cond.new':  { en: 'New', sw: 'Mpya' },
  'security.cond.good': { en: 'Good', sw: 'Nzuri' },
  'security.cond.fair': { en: 'Fair', sw: 'Wastani' },
  'security.cond.poor': { en: 'Poor', sw: 'Chakavu' },
  'security.coverage': {
    en: 'Assets cover {pct}% of the principal',
    sw: 'Dhamana inafikia {pct}% ya kiasi cha mkopo',
  },
  'security.draftPending': {
    en: 'Add or clear the details you started before continuing.',
    sw: 'Ongeza au futa taarifa ulizoanza kujaza kabla ya kuendelea.',
  },
  'security.errName':        { en: "Enter the guarantor's full name.", sw: 'Weka jina kamili la mzamini.' },
  'security.errPhone':       { en: 'Enter a valid phone number.', sw: 'Weka namba sahihi ya simu.' },
  'security.errDescription': { en: 'Describe the asset.', sw: 'Eleza kitu kinachowekwa dhamana.' },
  'security.errValue': {
    en: 'Enter a market value greater than zero.',
    sw: 'Weka thamani ya soko iliyo zaidi ya sifuri.',
  },

  /* ── Extra KYC / frequency / payment copy ────────────────────────── */
  'kyc.idLabel':    { en: 'Identification', sw: 'Utambulisho' },
  'kyc.unverified': { en: 'Unverified', sw: 'Hajathibitishwa' },
  'kyc.otherAccepted': {
    en: 'Format accepted — check the number against the physical card.',
    sw: 'Muundo umekubaliwa — linganisha namba na kadi halisi.',
  },
  'freq.single': { en: 'Single payment (no schedule)', sw: 'Malipo mara moja (bila ratiba)' },
  'pay.nextDue':  { en: 'Next installment due {date}', sw: 'Awamu inayofuata inadaiwa {date}' },
  'pay.settled':  { en: 'Loan fully repaid', sw: 'Mkopo umelipwa wote' },
  'pay.sentRequired': { en: 'Enter the amount sent.', sw: 'Weka kiasi kilichotumwa.' },
  'pay.timeRequired': { en: 'Enter the payment date and time.', sw: 'Weka tarehe na saa ya malipo.' },
  'pay.timeHint': {
    en: 'Tanzania time (EAT), to the second',
    sw: 'Saa za Tanzania (EAT), hadi sekunde',
  },

  /* ── Dashboard ───────────────────────────────────────────────────── */
  'dash.commissionTitle': {
    en: 'Total Mobile Money Commission Ledger',
    sw: 'Daftari la Jumla ya Makato ya Pesa kwa Simu',
  },
  'dash.commissionSub': {
    en: 'Agent fees (makato) on mobile money repayments — kept separate from loan collections.',
    sw: 'Makato ya mawakala kwenye marejesho ya pesa kwa simu — hayachanganywi na makusanyo ya mikopo.',
  },
  'dash.commissionTotal': { en: 'Agent fees recorded', sw: 'Makato yaliyorekodiwa' },
  'dash.commissionEmpty': {
    en: 'No mobile money repayments yet',
    sw: 'Bado hakuna marejesho ya pesa kwa simu',
  },
  'dash.commissionEmptyBody': {
    en: 'Record a repayment with Payment mode “Mobile Money” to start the ledger.',
    sw: 'Rekodi marejesho kwa njia ya “Pesa kwa simu” ili kuanza daftari.',
  },
  'dash.providerHeading': { en: 'Fees by provider', sw: 'Makato kwa mtoa huduma' },
  'dash.providerPayments': { en: '{count} payments', sw: 'malipo {count}' },

  /* ── Live calculator banner ──────────────────────────────────────── */
  'calc.title': { en: 'Installment per interval', sw: 'Kiasi cha kila awamu' },
  'calc.empty': {
    en: 'Enter principal, interest rate, tenor and frequency to see the installment.',
    sw: 'Weka kiasi cha mkopo, riba, muda na mzunguko ili kuona kiasi cha kila awamu.',
  },
  'calc.single': {
    en: 'Single repayment of TZS {amount} on the due date.',
    sw: 'Malipo mara moja ya TZS {amount} siku ya mwisho.',
  },

  /* ── Record payment extras ───────────────────────────────────────── */
  'pay.live':     { en: 'Live', sw: 'Moja kwa moja' },
  'pay.liveHint': {
    en: 'Updates every second until you change it',
    sw: 'Inajisasisha kila sekunde hadi uibadilishe',
  },
  'pay.useNow':   { en: 'Use current time', sw: 'Tumia saa ya sasa' },
  'pay.quickFee': { en: 'Quick fee', sw: 'Makato ya haraka' },

  /* ── Collateral coverage meter ───────────────────────────────────── */
  'security.coverageTitle': { en: 'Collateral coverage', sw: 'Kiwango cha dhamana' },
  'security.coverageEmpty': {
    en: 'No assets pledged yet — 0% of the principal is covered.',
    sw: 'Bado hakuna kitu kilichowekwa dhamana — 0% ya kiasi cha mkopo.',
  },
  'security.coverageDraft': {
    en: 'Including the asset being entered: {pct}%',
    sw: 'Pamoja na kitu unachojaza sasa: {pct}%',
  },

  /* ── Edit Loan: guarantor & collateral section ───────────────────── */
  'gedit.title':       { en: 'Guarantor & Collateral Information', sw: 'Taarifa za Mdhamini na Dhamana' },
  'gedit.add':         { en: '+ Add New Guarantor', sw: 'Ongeza Mdhamini Mpya' },
  'gedit.none':        { en: 'No guarantor is attached to this loan.', sw: 'Mkopo huu hauna mdhamini.' },
  'gedit.existing':    { en: 'Current guarantor', sw: 'Mdhamini wa sasa' },
  'gedit.new':         { en: 'New guarantor', sw: 'Mdhamini mpya' },
  'gedit.replacement': { en: 'Replacement guarantor', sw: 'Mdhamini mbadala' },
  'gedit.keep':        { en: 'Keep {name}', sw: 'Mbakize {name}' },
  'gedit.unsaved':     { en: 'Unsaved changes', sw: 'Mabadiliko hayajahifadhiwa' },
  'gedit.replacing': {
    en: 'Replacing {name} — enter the new guarantor’s details. {name} is removed when you save.',
    sw: 'Unambadilisha {name} — weka taarifa za mdhamini mpya. {name} ataondolewa ukihifadhi.',
  },
  'gedit.willRemove': {
    en: '{name} will be removed as guarantor when you save.',
    sw: '{name} ataondolewa kama mdhamini ukihifadhi.',
  },
  'gedit.nida':     { en: 'National ID (NIDA) number', sw: 'Namba ya NIDA' },
  'gedit.nidaHint': { en: '20 digits · optional', sw: 'Tarakimu 20 · si lazima' },
  'gedit.assets':   { en: 'Guarantor assets / collateral details', sw: 'Mali za Mdhamini' },
  'gedit.assetsHint': {
    en: 'e.g. motorcycle T 123 ABC, 2-acre farm in Kibaha',
    sw: 'mf. pikipiki T 123 ABC, shamba ekari 2 Kibaha',
  },
  'gedit.errAssets': {
    en: 'Keep the assets description under {max} characters.',
    sw: 'Maelezo ya mali yasizidi herufi {max}.',
  },
  'gedit.fixBeforeSave': {
    en: 'Fix the guarantor details before saving.',
    sw: 'Rekebisha taarifa za mdhamini kabla ya kuhifadhi.',
  },
  'gedit.loadError': {
    en: 'Guarantor details could not be loaded — the loan terms can still be saved.',
    sw: 'Taarifa za mdhamini hazikupatikana — masharti ya mkopo bado yanaweza kuhifadhiwa.',
  },
  'gedit.others': {
    en: '{count} more guarantor(s) on this loan stay unchanged.',
    sw: 'Wadhamini wengine {count} kwenye mkopo huu hawabadilishwi.',
  },
  'gedit.collateral': {
    en: '{count} pledged asset(s) · TZS {value} on this loan — unchanged.',
    sw: 'Dhamana {count} · TZS {value} kwenye mkopo huu — hazibadilishwi.',
  },
  'gedit.paid': {
    en: 'This loan is fully repaid — guarantor details are read-only.',
    sw: 'Mkopo huu umelipwa wote — taarifa za mdhamini haziwezi kubadilishwa.',
  },

  /* ── Processing fee & group refund incentive ─────────────────────── */
  'fee.processing': { en: 'Processing fee ({rate}%)', sw: 'Ada ya fomu ({rate}%)' },
  'fee.upfront':    { en: 'paid upfront, not part of the repayments', sw: 'hulipwa mapema, si sehemu ya marejesho' },
  'fee.processingNote': {
    en: 'Paid upfront by every client (individuals and groups) when the loan is booked.',
    sw: 'Hulipwa mapema na kila mteja (binafsi na vikundi) mkopo unapotolewa.',
  },
  'fee.refundTitle': { en: '{rate}% Refundable Interest Incentive', sw: 'Motisha ya {rate}% inayorejeshwa' },
  'fee.refundNote': {
    en: 'TZS {amount} is refunded to the group upon timely full completion of the loan repayments.',
    sw: 'TZS {amount} itarejeshwa kwa kikundi baada ya kukamilisha marejesho yote kwa wakati.',
  },
  'fee.refundStatus.pending':   { en: 'Awaiting on-time completion', sw: 'Inasubiri kukamilika kwa wakati' },
  'fee.refundStatus.eligible':  { en: 'Earned — refund due to the group', sw: 'Imestahili — kikundi kinadai marejesho' },
  'fee.refundStatus.forfeited': { en: 'Forfeited — loan finished after the due date', sw: 'Imepotea — mkopo ulimalizika baada ya tarehe ya mwisho' },
  'fee.refundStatus.paid':      { en: 'Refunded to the group', sw: 'Imerejeshwa kwa kikundi' },

  /* ── Loan application type ───────────────────────────────────────── */
  'loan.type.label':      { en: 'Application type', sw: 'Aina ya maombi' },
  'loan.type.individual': { en: 'Individual', sw: 'Mtu binafsi' },
  'loan.type.group':      { en: 'Group', sw: 'Kikundi' },

  /* ── Group lending: registration & onboarding ────────────────────── */
  'grp.tabIndividuals': { en: 'Individual clients', sw: 'Wateja binafsi' },
  'grp.tabGroups':      { en: 'Groups', sw: 'Vikundi' },
  'grp.stepGroup':      { en: 'Group details', sw: 'Taarifa za kikundi' },
  'grp.stepMembers':    { en: 'Members', sw: 'Wanachama' },
  'grp.stepBusiness':   { en: 'Businesses & group leader', sw: 'Biashara na kiongozi wa kikundi' },
  'grp.name':           { en: 'Group name', sw: 'Jina la kikundi' },
  'grp.businessType':   { en: 'Main business activity', sw: 'Shughuli kuu ya biashara' },
  'grp.market':         { en: 'Market name', sw: 'Jina la soko' },
  'grp.location':       { en: 'Business location', sw: 'Mahali biashara ilipo' },
  'grp.together':       { en: 'Time operating together', sw: 'Muda wa kufanya kazi pamoja' },
  'grp.member':         { en: 'Member {n}', sw: 'Mwanachama {n}' },
  'grp.parent':         { en: 'Parent / guardian name', sw: 'Jina la mzazi / mlezi' },
  'grp.identity':       { en: 'Identity type', sw: 'Aina ya kitambulisho' },
  'grp.address':        { en: 'Residential address', sw: 'Anwani ya makazi' },
  'grp.area':           { en: 'Residential area', sw: 'Eneo la makazi' },
  'grp.residency':      { en: 'Time living in the area', sw: 'Muda wa kuishi eneo hilo' },
  'grp.marital':        { en: 'Marital status', sw: 'Hali ya ndoa' },
  'grp.addMember':      { en: '+ Add member', sw: 'Ongeza mwanachama' },
  'grp.noId': {
    en: 'This member is being registered without formal identification.',
    sw: 'Mwanachama huyu anasajiliwa bila kitambulisho rasmi.',
  },
  'grp.bizName':     { en: 'Business name', sw: 'Jina la biashara' },
  'grp.bizType':     { en: 'Business type', sw: 'Aina ya biashara' },
  'grp.room':        { en: 'Room / stall number', sw: 'Namba ya chumba / meza' },
  'grp.bizDuration': { en: 'Business age', sw: 'Muda wa biashara' },
  'grp.sales':       { en: 'Average weekly sales (TZS)', sw: 'Wastani wa mauzo kwa wiki (TZS)' },
  'grp.profit':      { en: 'Average weekly profit (TZS)', sw: 'Wastani wa faida kwa wiki (TZS)' },
  'grp.ownership':   { en: 'Business ownership', sw: 'Umiliki wa biashara' },
  'grp.leader':      { en: 'Group leader', sw: 'Kiongozi wa kikundi' },
  'grp.leaderHint': {
    en: 'Choose the member who leads the group. Their name and phone are saved with every member’s business record.',
    sw: 'Chagua mwanachama anayeongoza kikundi. Jina na simu yake vitahifadhiwa kwenye rekodi ya biashara ya kila mwanachama.',
  },
  'grp.years':      { en: 'yrs', sw: 'miaka' },
  'grp.months':     { en: 'mo', sw: 'miezi' },
  'grp.registered': { en: 'Group registered', sw: 'Kikundi kimesajiliwa' },
  'grp.fixErrors': {
    en: 'Fix the highlighted fields before continuing.',
    sw: 'Rekebisha sehemu zilizoonyeshwa kabla ya kuendelea.',
  },
  'grp.err.text':     { en: 'Enter at least 2 characters.', sw: 'Weka angalau herufi 2.' },
  'grp.err.duration': { en: 'Enter the time in years and/or months.', sw: 'Weka muda kwa miaka na/au miezi.' },
  'grp.err.amount':   { en: 'Enter an amount of 0 or more.', sw: 'Weka kiasi cha 0 au zaidi.' },
  'grp.err.profit':   { en: 'Weekly profit cannot be more than weekly sales.', sw: 'Faida ya wiki haiwezi kuzidi mauzo ya wiki.' },
  'grp.err.choose':   { en: 'Choose an option.', sw: 'Chagua moja.' },
  'grp.err.room':     { en: 'Keep it under 40 characters.', sw: 'Isizidi herufi 40.' },
  'grp.err.dupPhone': { en: 'Another member already uses this phone number.', sw: 'Mwanachama mwingine tayari anatumia namba hii ya simu.' },
  'grp.err.dupId':    { en: 'Another member already uses this ID number.', sw: 'Mwanachama mwingine tayari anatumia namba hii ya kitambulisho.' },
  'grp.err.members':  { en: 'A group needs {min}–{max} members.', sw: 'Kikundi kinahitaji wanachama {min}–{max}.' },
  'grp.err.leader':   { en: 'Choose the group leader.', sw: 'Chagua kiongozi wa kikundi.' },
};

/** Look up a message in both languages, filling {placeholders}. */
export function t(key, params = {}) {
  const entry = MESSAGES[key];
  if (!entry) return { en: key, sw: key };
  const fill = text => text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
  return { en: fill(entry.en), sw: fill(entry.sw) };
}
