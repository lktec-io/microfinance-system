import { ISSUER, DISCLAIMER, docKey } from '../../utils/voucher';
import { fmt } from '../../utils/format';

/** Minimal scissors, drawn inline so it needs no icon font or emoji glyph. */
function Scissors() {
  return (
    <svg width="13" height="11" viewBox="0 0 13 11" fill="none" aria-hidden="true">
      <circle cx="2.2" cy="2.2" r="1.5" stroke="currentColor" strokeWidth=".9" />
      <circle cx="2.2" cy="8.8" r="1.5" stroke="currentColor" strokeWidth=".9" />
      <path d="M3.6 3.1L11.6 8.2M3.6 7.9L11.6 2.8" stroke="currentColor" strokeWidth=".9" strokeLinecap="round" />
    </svg>
  );
}

function Rows({ rows }) {
  return (
    <table className="mf-ticket__rows">
      <tbody>
        {rows.map(([label, value, total]) => (
          <tr key={label} className={total ? 'is-total' : undefined}>
            <th>{label}</th>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * The printable 80mm thermal ticket.
 *
 * Rendered off-screen and revealed only inside the print surface, so the
 * browser Print path produces the same two-part ticket as the PDF download:
 * office voucher, perforation, official customer receipt.
 */
export default function TicketSheet({ kind = 'statement', statement, entry, operator, showTotals }) {
  const generated = new Date().toLocaleString('en-GB');
  const money = v => (showTotals ? fmt(v) : '•••••');
  const isTransaction = kind === 'transaction' && entry;

  const key = isTransaction
    ? docKey('VCH', `${entry.reference}|${entry.date}`)
    : docKey('STMT', statement?.generated_at || generated);

  const cash = statement?.cash || {};

  const officeRows = isTransaction ? [
    ['Date', String(entry.date).slice(0, 10)],
    ['Entity', entry.entity],
    ['Account', entry.account_type === 'group' ? 'GROUP' : 'INDIVIDUAL'],
    ['Inflow (+)', entry.inflow ? money(entry.inflow) : '—'],
    ['Outflow (−)', entry.outflow ? money(entry.outflow) : '—'],
    ['Running balance', money(entry.balance), true],
  ] : [
    ['Gross outbound', money(cash.gross_outbound)],
    ['Gross recovered', money(cash.gross_recovered)],
    ['Revenue (10% fees)', money(cash.immediate_revenue)],
    ['Operating expenses', money(cash.operating_expenses)],
    ['BAKI', money(cash.net_system_balance), true],
  ];

  const customerRows = isTransaction ? [
    ['Reference', entry.reference],
    [entry.inflow ? 'Received' : 'Disbursed', money(entry.inflow || entry.outflow)],
    ['10% fee', 'Paid upfront at booking'],
    ['Balance', money(entry.loan_balance ?? entry.balance), true],
  ] : [
    ['Disbursed to date', money(cash.gross_outbound)],
    ['Recovered to date', money(cash.gross_recovered)],
    ['Processing fees', money(cash.immediate_revenue)],
    ['BAKI', money(cash.net_system_balance), true],
  ];

  const kindLabel = isTransaction
    ? `Office voucher · ${entry.inflow ? 'receipt' : 'disbursement'}`
    : 'Office voucher';

  return (
    <article className="mf-ticket" aria-label="Thermal ticket">
      {/* ── Office voucher ── */}
      <section className="mf-ticket__stub">
        <div className="mf-ticket__head">
          <h1 className="mf-ticket__brand">{ISSUER.name}</h1>
          <span className="mf-ticket__sub">{ISSUER.unit}</span>
        </div>
        <span className="mf-ticket__kind">{kindLabel}</span>
        <div className="mf-ticket__meta">
          <div><span>REF</span><span>{key}</span></div>
          {isTransaction && <div><span>DOC</span><span>{entry.reference}</span></div>}
          <div><span>DATE</span><span>{generated}</span></div>
        </div>
        <Rows rows={officeRows} />
        <div className="mf-ticket__meta">
          <div><span>OPERATOR</span><span>{operator || '—'}</span></div>
        </div>
        <div className="mf-ticket__auth">
          <span className="mf-ticket__auth-line" />
          <span className="mf-ticket__auth-label">Prepared by</span>
          <span className="mf-ticket__auth-line" />
          <span className="mf-ticket__auth-label">Authorised by</span>
        </div>
      </section>

      {/* ── Perforation ── */}
      <div className="mf-ticket__perf">
        <div className="mf-ticket__perf-line" />
        <span className="mf-ticket__scissors"><Scissors /> cut here / kata hapa</span>
      </div>

      {/* ── Official customer receipt ── */}
      <section className="mf-ticket__stub">
        <div className="mf-ticket__head">
          <h1 className="mf-ticket__brand">{ISSUER.name}</h1>
          <span className="mf-ticket__sub">{ISSUER.licence}</span>
        </div>
        <span className="mf-ticket__kind">Official customer receipt</span>
        <Rows rows={customerRows} />
        <p className="mf-ticket__disclaimer">{DISCLAIMER}</p>
        <p className="mf-ticket__foot">{key} · {generated}</p>
      </section>
    </article>
  );
}
