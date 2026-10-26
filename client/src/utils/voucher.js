import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { savePdf } from './download';
import { MASK } from './rbac';
import { fmt } from './format';

/*
 * Perforated bank ticket generator.
 *
 * Every PDF leaves this module as a dual stub:
 *   top    — OFFICE COPY: full figures, internal reference keys, operator
 *            audit stamp and authorisation brackets
 *   middle — a dashed perforation with a drawn scissors marker
 *   bottom — CUSTOMER TICKET: condensed slip plus the legal disclaimer
 *
 * Money passes through `money()`, so a restricted session exports the mask
 * rather than the figure — the lock lives in the generation layer itself.
 */

export const ISSUER = {
  name: 'RAMOS MICRO-CREDIT',
  unit: 'Head Office · Ofisi Kuu',
  licence: 'Licensed micro-credit provider',
};

export const DISCLAIMER =
  'This voucher is a computer-generated record of the account named above and is valid without a signature. '
  + 'Figures reflect the ledger at the moment of generation; the branch ledger remains the authoritative record. '
  + 'Retain the customer stub — it may be required for any query, reconciliation or dispute. '
  + 'Hii ni risiti halali bila saini; tunza nakala hii kwa ufuatiliaji wowote.';

const SLATE = [15, 23, 42];
const ORANGE = [249, 115, 22];
const LINE = [203, 213, 225];
const MUTED = [100, 116, 139];

/** Short, deterministic document key so a reprint carries the same reference. */
export function docKey(prefix, seed) {
  let h = 0;
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `${prefix}-${h.toString(36).toUpperCase().padStart(6, '0').slice(-6)}`;
}

/** TZS figure, or the mask when the session may not see money. */
export const voucherMoney = show => v => (show ? `TZS ${fmt(v)}` : MASK);

/* ── drawing helpers ─────────────────────────────────────────────────── */
function masthead(doc, { title, kind, refs }) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...SLATE);
  doc.rect(12, doc.__y, w - 24, 16, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  doc.text(title, 15, doc.__y + 7);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.4);
  doc.setTextColor(...ORANGE);
  doc.text(kind.toUpperCase(), 15, doc.__y + 12);
  doc.setTextColor(226, 232, 240);
  refs.forEach((line, i) => {
    doc.text(line, w - 15, doc.__y + 6 + i * 3.4, { align: 'right' });
  });
  doc.__y += 16;
}

/** Dashed perforation with a drawn (vector) scissors marker. */
function perforation(doc, y) {
  const w = doc.internal.pageSize.getWidth();
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.6);
  doc.setLineDashPattern([1.6, 1.4], 0);
  doc.line(12, y, w - 24 + 12, y);
  doc.setLineDashPattern([], 0);

  /* scissors: two bows and two crossing blades */
  const x = 22;
  doc.setDrawColor(...MUTED);
  doc.setLineWidth(0.4);
  doc.circle(x, y + 2.1, 1.05);
  doc.circle(x, y - 2.1, 1.05);
  doc.line(x + 0.9, y + 1.6, x + 6.2, y - 1.9);
  doc.line(x + 0.9, y - 1.6, x + 6.2, y + 1.9);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.6);
  doc.setTextColor(...MUTED);
  doc.text('CUT HERE  ·  KATA HAPA', x + 9, y + 1);
}

function auditStamp(doc, { operator, generated }) {
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.6);
  doc.setTextColor(...MUTED);
  doc.text(`Operator: ${operator || '—'}`, 15, doc.__y + 4);
  doc.text(`Generated: ${generated}`, 15, doc.__y + 7.6);
  doc.__y += 10;
}

function authorisation(doc) {
  const w = doc.internal.pageSize.getWidth();
  const y = doc.__y + 10;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(15, y, 75, y);
  doc.line(w - 75, y, w - 15, y);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.8);
  doc.setTextColor(...MUTED);
  doc.text('PREPARED BY', 15, y + 3.4);
  doc.text('AUTHORISED BY', w - 75, y + 3.4);
  doc.__y = y + 8;
}

function stubTable(doc, head, body, accent = SLATE) {
  autoTable(doc, {
    startY: doc.__y + 2,
    head: [head],
    body,
    theme: 'grid',
    headStyles: { fillColor: accent, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    styles: { fontSize: 8.6, cellPadding: 1.9, lineColor: LINE, lineWidth: 0.1 },
    margin: { left: 12, right: 12 },
  });
  doc.__y = doc.lastAutoTable.finalY;
}

function disclaimer(doc) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text(doc.splitTextToSize(DISCLAIMER, w - 28), 14, doc.__y + 5);
  doc.__y += 5 + Math.ceil(DISCLAIMER.length / 110) * 3;
}

/* ════════════════════════════════════════════════════════════════════
   1 · The full financial statement, framed as a perforated ticket
   ════════════════════════════════════════════════════════════════════ */
export function downloadStatementVoucher(statement, { showTotals, operator }) {
  if (!statement) return false;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const money = voucherMoney(showTotals);
  const p = statement.portfolio;
  const inc = statement.income;
  const generated = new Date().toLocaleString('en-GB');
  const key = docKey('STMT', statement.generated_at || generated);

  doc.__y = 12;
  masthead(doc, {
    title: ISSUER.name,
    kind: 'Office copy · full financial statement',
    refs: [`REF ${key}`, generated, ISSUER.unit],
  });

  stubTable(doc, ['Balance sheet', 'Amount'], [
    ['Total portfolio outbound (principal disbursed)', money(p.principal_disbursed)],
    ['Gross portfolio outstanding', money(p.outstanding)],
    ['Total liabilities — 5% refundable incentives accrued', money(statement.liabilities?.refundable_accrued ?? 0)],
    ['Portfolio at risk (PAR)', showTotals ? `${p.par_pct}% · ${fmt(p.par_balance)}` : MASK],
    ['Portfolio at risk over 30 days (PAR30)', showTotals ? `${p.par30_pct}% · ${fmt(p.par30_balance)}` : MASK],
    ['Loans on book (active / overdue / closed)', `${p.loans} (${p.active_loans} / ${p.overdue_loans} / ${p.closed_loans})`],
  ]);

  const sec = statement.sectors || { individual: {}, group: {} };
  autoTable(doc, {
    startY: doc.__y + 3,
    head: [['Income statement', 'Individual', 'Group', 'Total']],
    body: [
      ['10% processing form fees', money(sec.individual.fees), money(sec.group.fees), money(inc.processing_fees)],
      ['Interest income earned', money(sec.individual.interest), money(sec.group.interest), money(inc.interest_recognised)],
      ['Accrued revenue', money(sec.individual.revenue), money(sec.group.revenue), money(inc.revenue)],
      ['Operating expenses', '', '', money(inc.expenses)],
      ['Net revenue', '', '', money(inc.net)],
    ],
    theme: 'grid',
    headStyles: { fillColor: ORANGE, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } },
    styles: { fontSize: 8.4, cellPadding: 1.9, lineColor: LINE, lineWidth: 0.1 },
    margin: { left: 12, right: 12 },
  });
  doc.__y = doc.lastAutoTable.finalY;

  auditStamp(doc, { operator, generated });
  authorisation(doc);

  perforation(doc, doc.__y + 4);
  doc.__y += 10;

  /* ── customer stub ── */
  masthead(doc, {
    title: ISSUER.name,
    kind: 'Customer ticket · statement summary',
    refs: [`REF ${key}`, generated],
  });
  stubTable(doc, ['Statement summary', 'Amount'], [
    ['Principal disbursed', money(p.principal_disbursed)],
    ['Total repaid', money(p.total_repaid)],
    ['Outstanding balance', money(p.outstanding)],
    ['10% processing fees collected', money(inc.processing_fees)],
    ['Net revenue', money(inc.net)],
  ], ORANGE);
  disclaimer(doc);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.6);
  doc.setTextColor(148, 163, 184);
  doc.text(`${key} · ${generated} · ${ISSUER.licence}`, doc.internal.pageSize.getWidth() / 2, doc.__y + 4, { align: 'center' });

  return savePdf(doc, 'Full_Financial_Statement.pdf');
}

/* ════════════════════════════════════════════════════════════════════
   2 · One transaction, as a teller voucher
   ════════════════════════════════════════════════════════════════════ */
export function downloadTransactionVoucher(entry, { showTotals, operator, balanceLabel = 'Running ledger balance' }) {
  if (!entry) return false;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const money = voucherMoney(showTotals);
  const generated = new Date().toLocaleString('en-GB');
  const key = docKey('VCH', `${entry.reference}|${entry.date}`);
  const isInflow = entry.inflow > 0;

  doc.__y = 12;
  masthead(doc, {
    title: ISSUER.name,
    kind: `Office copy · ${isInflow ? 'receipt voucher' : 'disbursement voucher'}`,
    refs: [`REF ${key}`, `DOC ${entry.reference}`, generated],
  });

  stubTable(doc, ['Transaction record', 'Detail'], [
    ['Transaction date', String(entry.date).slice(0, 10)],
    ['Entity / client', entry.entity],
    ['Reference token', entry.reference],
    ['Account type', entry.account_type === 'group' ? 'Group account' : 'Individual account'],
    ['Loan account', `LN-${String(entry.loan_id ?? 0).padStart(6, '0')}`],
    ['Inflow (+)', entry.inflow ? money(entry.inflow) : '—'],
    ['Outflow (−)', entry.outflow ? money(entry.outflow) : '—'],
    [balanceLabel, money(entry.balance)],
  ]);
  auditStamp(doc, { operator, generated });
  authorisation(doc);

  perforation(doc, doc.__y + 4);
  doc.__y += 10;

  masthead(doc, {
    title: ISSUER.name,
    kind: 'Customer ticket · teller voucher',
    refs: [`REF ${key}`, generated],
  });
  stubTable(doc, [entry.entity, 'Amount'], [
    ['Transaction date', String(entry.date).slice(0, 10)],
    ['Reference', entry.reference],
    [isInflow ? 'Amount received' : 'Amount disbursed', money(isInflow ? entry.inflow : entry.outflow)],
    ['10% processing fee', entry.fee != null ? money(entry.fee) : 'Collected upfront at booking'],
    ['Outstanding balance', money(entry.loan_balance ?? entry.balance)],
  ], ORANGE);
  disclaimer(doc);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.6);
  doc.setTextColor(148, 163, 184);
  doc.text(`${key} · ${generated} · ${ISSUER.licence}`, doc.internal.pageSize.getWidth() / 2, doc.__y + 4, { align: 'center' });

  return savePdf(doc, `Voucher_${entry.reference}.pdf`);
}
