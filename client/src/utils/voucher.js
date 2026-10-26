import jsPDF from 'jspdf';
import { savePdf } from './download';
import { MASK } from './rbac';
import { fmt } from './format';

/*
 * Perforated thermal ticket generator (80mm roll).
 *
 * Every export leaves as a two-part ticket on one continuous 80mm page:
 *   top     — OFFICE VOUCHER: full figures, internal reference key, operator
 *             audit stamp and signature brackets
 *   middle  — a dashed perforation with a drawn scissors and CUT HERE / KATA HAPA
 *   bottom  — OFFICIAL CUSTOMER RECEIPT: the condensed slip plus the
 *             micro-credit legal disclaimer
 *
 * Money passes through `money()`, so a restricted session writes the mask into
 * the blob rather than the figure — the lock lives in the generator itself.
 */

export const ISSUER = {
  name: 'RAMOS MICRO-CREDIT',
  unit: 'Head Office · Ofisi Kuu',
  licence: 'Licensed micro-credit provider',
};

export const DISCLAIMER =
  'Computer-generated record, valid without a signature. Figures reflect the ledger at the time of issue; '
  + 'the branch ledger remains the authoritative record. Retain this receipt for any query or dispute. '
  + 'Risiti hii ni halali bila saini. Tunza nakala hii kwa ufuatiliaji wowote.';

/* 80mm roll, 3mm side margins */
const W = 80;
const M = 3.2;
const INNER = W - M * 2;
const INK = [22, 22, 26];
const SOFT = [103, 103, 111];
const DASH = [203, 213, 225];

/** Deterministic document key: the same ticket reprints with the same reference. */
export function docKey(prefix, seed) {
  let h = 0;
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `${prefix}-${h.toString(36).toUpperCase().padStart(6, '0').slice(-6)}`;
}

/** TZS figure, or the mask when the session may not see money. */
export const voucherMoney = show => v => (show ? fmt(v) : MASK);

/* ── primitives ──────────────────────────────────────────────────────── */
const center = (doc, text, y, size = 8, style = 'normal', colour = INK) => {
  doc.setFont('courier', style); doc.setFontSize(size); doc.setTextColor(...colour);
  doc.text(text, W / 2, y, { align: 'center' });
};

function rule(doc, y, dashed = false, colour = INK, width = 0.3) {
  doc.setDrawColor(...colour);
  doc.setLineWidth(width);
  if (dashed) doc.setLineDashPattern([1.1, 1], 0);
  doc.line(M, y, W - M, y);
  doc.setLineDashPattern([], 0);
}

/** label … value on one line, value right-aligned — the ledger look. */
function line(doc, label, value, { bold = false, size = 7.8 } = {}) {
  doc.setFont('courier', bold ? 'bold' : 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...INK);
  const wrapped = doc.splitTextToSize(String(label), INNER - 26);
  doc.text(wrapped, M, doc.__y);
  doc.setFont('courier', 'bold');
  doc.text(String(value), W - M, doc.__y, { align: 'right' });
  doc.__y += wrapped.length * 3.1 + 0.7;
}

function heading(doc, kind) {
  rule(doc, doc.__y, false, INK, 0.4);
  doc.__y += 3.4;
  center(doc, kind.toUpperCase(), doc.__y, 7.6, 'bold');
  doc.__y += 1.6;
  rule(doc, doc.__y, false, INK, 0.4);
  doc.__y += 4;
}

function masthead(doc, { kind, refs }) {
  center(doc, ISSUER.name, doc.__y, 11.5, 'bold');
  doc.__y += 3.6;
  center(doc, ISSUER.unit, doc.__y, 6.6, 'normal', SOFT);
  doc.__y += 4;
  heading(doc, kind);
  doc.setFont('courier', 'normal'); doc.setFontSize(6.8); doc.setTextColor(...SOFT);
  refs.forEach(t => { doc.text(t, M, doc.__y); doc.__y += 2.8; });
  doc.__y += 1.4;
}

/** The perforation: dashed line, drawn scissors, bilingual cut label. */
function perforation(doc) {
  const y = doc.__y + 2.5;
  rule(doc, y, true, DASH, 0.6);

  const x = M + 2;
  doc.setDrawColor(...SOFT);
  doc.setLineWidth(0.3);
  doc.circle(x, y + 1.6, 0.8);
  doc.circle(x, y - 1.6, 0.8);
  doc.line(x + 0.7, y + 1.2, x + 4.6, y - 1.4);
  doc.line(x + 0.7, y - 1.2, x + 4.6, y + 1.4);

  doc.setFont('courier', 'bold'); doc.setFontSize(6.2); doc.setTextColor(...SOFT);
  doc.text('CUT HERE / KATA HAPA', x + 6.4, y + 0.9);
  doc.__y = y + 6;
}

function auditStamp(doc, { operator, generated }) {
  doc.__y += 1.2;
  rule(doc, doc.__y, true, DASH, 0.4);
  doc.__y += 3.2;
  doc.setFont('courier', 'normal'); doc.setFontSize(6.6); doc.setTextColor(...SOFT);
  doc.text(`OPERATOR: ${operator || '-'}`, M, doc.__y);
  doc.__y += 2.8;
  doc.text(`ISSUED  : ${generated}`, M, doc.__y);
  doc.__y += 3.4;
}

function signatures(doc) {
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.25);
  doc.setLineDashPattern([0.6, 0.6], 0);
  doc.line(M, doc.__y + 5, M + 32, doc.__y + 5);
  doc.line(W - M - 32, doc.__y + 5, W - M, doc.__y + 5);
  doc.setLineDashPattern([], 0);
  doc.setFont('courier', 'normal'); doc.setFontSize(6);
  doc.setTextColor(...SOFT);
  doc.text('PREPARED BY', M, doc.__y + 7.6);
  doc.text('AUTHORISED BY', W - M - 32, doc.__y + 7.6);
  doc.__y += 10;
}

function footer(doc, key, generated) {
  rule(doc, doc.__y, true, DASH, 0.4);
  doc.__y += 3;
  doc.setFont('courier', 'normal'); doc.setFontSize(5.9); doc.setTextColor(...SOFT);
  doc.text(doc.splitTextToSize(DISCLAIMER, INNER), M, doc.__y);
  doc.__y += Math.ceil(DISCLAIMER.length / 58) * 2.3 + 2;
  center(doc, `${key} · ${generated}`, doc.__y, 5.9, 'normal', SOFT);
  doc.__y += 2.6;
  center(doc, ISSUER.licence, doc.__y, 5.9, 'normal', SOFT);
  doc.__y += 4;
}

/** A tall continuous 80mm page — thermal rolls have no fixed height. */
function thermalDoc(height = 320) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [W, height] });
  doc.__y = 6;
  return doc;
}

/* ════════════════════════════════════════════════════════════════════
   1 · The grand executive sheet, as a thermal ticket
   ════════════════════════════════════════════════════════════════════ */
export function downloadStatementTicket(statement, { showTotals, operator }) {
  if (!statement) return false;
  const money = voucherMoney(showTotals);
  const cash = statement.cash || {};
  const p = statement.portfolio;
  const generated = new Date().toLocaleString('en-GB');
  const key = docKey('STMT', statement.generated_at || generated);
  const doc = thermalDoc();

  /* ── office voucher ── */
  masthead(doc, { kind: 'Office voucher', refs: [`REF : ${key}`, `DATE: ${generated}`] });
  line(doc, 'Gross outbound portfolio', money(cash.gross_outbound));
  line(doc, 'Gross recovered funds', money(cash.gross_recovered));
  line(doc, 'Immediate revenue (10% fees)', money(cash.immediate_revenue));
  line(doc, 'Operating expenses', money(cash.operating_expenses));
  rule(doc, doc.__y, true, DASH, 0.4);
  doc.__y += 3.4;
  line(doc, 'NET SYSTEM BALANCE (BAKI)', money(cash.net_system_balance), { bold: true, size: 9 });
  doc.__y += 1.6;
  line(doc, 'Loans on book', String(p.loans));
  line(doc, 'Active / overdue', `${p.active_loans} / ${p.overdue_loans}`);
  line(doc, 'Outstanding balance', money(p.outstanding));
  line(doc, 'PAR', showTotals ? `${p.par_pct}%` : MASK);
  line(doc, 'Refundable liability (5%)', money(statement.liabilities?.refundable_accrued ?? 0));
  auditStamp(doc, { operator, generated });
  signatures(doc);

  perforation(doc);

  /* ── customer receipt ── */
  masthead(doc, { kind: 'Official customer receipt', refs: [`REF : ${key}`, `DATE: ${generated}`] });
  line(doc, 'Disbursed to date', money(cash.gross_outbound));
  line(doc, 'Recovered to date', money(cash.gross_recovered));
  line(doc, 'Processing fees (10%)', money(cash.immediate_revenue));
  rule(doc, doc.__y, true, DASH, 0.4);
  doc.__y += 3.4;
  line(doc, 'BAKI', money(cash.net_system_balance), { bold: true, size: 9 });
  doc.__y += 2;
  footer(doc, key, generated);

  return savePdf(doc, 'Financial_Statement_Ticket.pdf');
}

/* ════════════════════════════════════════════════════════════════════
   2 · One ledger transaction, as a thermal ticket
   ════════════════════════════════════════════════════════════════════ */
export function downloadTransactionTicket(entry, { showTotals, operator }) {
  if (!entry) return false;
  const money = voucherMoney(showTotals);
  const generated = new Date().toLocaleString('en-GB');
  const key = docKey('VCH', `${entry.reference}|${entry.date}`);
  const isInflow = entry.inflow > 0;
  const doc = thermalDoc(250);

  masthead(doc, {
    kind: `Office voucher · ${isInflow ? 'receipt' : 'disbursement'}`,
    refs: [`REF : ${key}`, `DOC : ${entry.reference}`, `DATE: ${generated}`],
  });
  line(doc, 'Transaction date', String(entry.date).slice(0, 10));
  line(doc, 'Entity / client', entry.entity);
  line(doc, 'Account type', entry.account_type === 'group' ? 'GROUP' : 'INDIVIDUAL');
  line(doc, 'Loan account', `LN-${String(entry.loan_id ?? 0).padStart(6, '0')}`);
  line(doc, 'Inflow (+)', entry.inflow ? money(entry.inflow) : '-');
  line(doc, 'Outflow (-)', entry.outflow ? money(entry.outflow) : '-');
  rule(doc, doc.__y, true, DASH, 0.4);
  doc.__y += 3.4;
  line(doc, 'RUNNING BALANCE', money(entry.balance), { bold: true, size: 9 });
  auditStamp(doc, { operator, generated });
  signatures(doc);

  perforation(doc);

  masthead(doc, { kind: 'Official customer receipt', refs: [`REF : ${key}`, `DATE: ${generated}`] });
  line(doc, 'Client', entry.entity);
  line(doc, 'Reference', entry.reference);
  line(doc, isInflow ? 'Amount received' : 'Amount disbursed', money(isInflow ? entry.inflow : entry.outflow));
  line(doc, '10% processing fee', entry.fee != null ? money(entry.fee) : 'Paid upfront at booking');
  rule(doc, doc.__y, true, DASH, 0.4);
  doc.__y += 3.4;
  line(doc, 'BALANCE', money(entry.loan_balance ?? entry.balance), { bold: true, size: 9 });
  doc.__y += 2;
  footer(doc, key, generated);

  return savePdf(doc, `Ticket_${entry.reference}.pdf`);
}
