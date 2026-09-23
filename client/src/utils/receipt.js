/*
 * Loan receipt data — pure helpers, no React.
 *
 * The reference code is DETERMINISTIC: reprinting the same loan on the same day
 * yields the same code, so a client's copy and the branch copy always match.
 */

export const ISSUER = {
  name: 'RAMOS MICRO-CREDIT',
  unit: 'Head Office · Ofisi Kuu',
  tagline: 'Licensed micro-credit provider · Mkopeshaji aliyesajiliwa',
};

export const DISCLAIMER = {
  en: 'This receipt is a computer-generated summary of the loan account named above and is valid without a signature. Figures reflect the account at the time of printing; the branch ledger remains the authoritative record. Keep this document safe — it may be required for any query or dispute.',
  sw: 'Risiti hii imetengenezwa na mfumo kwa ajili ya muhtasari wa akaunti ya mkopo iliyotajwa hapo juu na ni halali bila saini. Takwimu ni za wakati wa kuchapisha; daftari la tawi ndilo kumbukumbu rasmi. Tunza nakala hii — inaweza kuhitajika kwa swali au mgogoro wowote.',
};

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
export const clientCode = id => `CL-${String(id ?? 0).padStart(5, '0')}`;
export const loanCode   = id => `LN-${String(id ?? 0).padStart(6, '0')}`;

/** Short checksum so a tampered reprint is visible at a glance. */
function checksum(parts) {
  let h = 0;
  for (const ch of parts.join('|')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h.toString(36).toUpperCase().padStart(4, '0').slice(-4);
}

/** RMC-000012-20260923-9F2K */
export function receiptRef(loan, issuedOn) {
  const day = String(issuedOn ?? '').slice(0, 10).replace(/-/g, '');
  const id  = String(loan?.id ?? 0).padStart(6, '0');
  return `RMC-${id}-${day}-${checksum([id, day, String(loan?.loan_amount ?? ''), String(loan?.customer_id ?? '')])}`;
}

/**
 * Everything the printed receipt shows, already normalised.
 * Works with a loan row from the list or the fuller loan-detail payload.
 */
export function receiptData(loan, { issuedOn, issuedBy } = {}) {
  const principal = num(loan?.loan_amount);
  const rate      = num(loan?.interest_rate);
  const total     = num(loan?.total_payable);
  const repaid    = num(loan?.amount_paid);
  const fee       = loan?.processing_fee == null ? null : num(loan.processing_fee);
  const feeRate   = loan?.processing_fee_rate == null ? null : num(loan.processing_fee_rate);
  const balance   = loan?.balance == null ? Math.max(0, total - repaid) : num(loan.balance);
  const date      = issuedOn || new Date().toISOString().slice(0, 10);

  return {
    ref: receiptRef(loan, date),
    issuedOn: date,
    issuedBy: issuedBy || null,
    client: {
      name: loan?.customer_name || '—',
      account: clientCode(loan?.customer_id),
      phone: loan?.customer_phone || null,
    },
    loan: {
      code: loanCode(loan?.id),
      id: loan?.id ?? null,
      status: loan?.status || 'active',
      startDate: loan?.start_date || null,
      dueDate: loan?.due_date || null,
      isGroup: loan?.loan_type === 'group',
      groupName: loan?.group_name || null,
    },
    figures: {
      principal,
      rate,
      total,
      repaid,
      balance,
      fee,
      feeRate,
      progress: total > 0 ? Math.min(100, Math.round((repaid / total) * 100)) : 0,
    },
  };
}
