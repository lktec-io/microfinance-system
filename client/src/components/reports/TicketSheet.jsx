import { ISSUER, DISCLAIMER, docKey } from '../../utils/voucher';
import { fmt } from '../../utils/format';

/** Minimal scissors marker drawn inline, so it needs no icon font. */
function Scissors() {
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="none" aria-hidden="true">
      <circle cx="2.4" cy="2.4" r="1.7" stroke="currentColor" strokeWidth="1" />
      <circle cx="2.4" cy="9.6" r="1.7" stroke="currentColor" strokeWidth="1" />
      <path d="M3.9 3.4L12.5 9M3.9 8.6L12.5 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function Row({ label, value, total }) {
  return (
    <tr className={total ? 'is-total' : undefined}>
      <th>{label}</th>
      <td>{value}</td>
    </tr>
  );
}

/**
 * The printable perforated bank ticket.
 *
 * Rendered off-screen and only made visible inside the print surface, so the
 * browser Print path produces the same dual stub as the PDF download:
 * office copy on top, perforation, customer ticket beneath.
 */
export default function TicketSheet({ kind = 'statement', statement, entry, operator, showTotals }) {
  const generated = new Date().toLocaleString('en-GB');
  const money = v => (showTotals ? `TZS ${fmt(v)}` : '•••••');

  const isTransaction = kind === 'transaction' && entry;
  const key = isTransaction
    ? docKey('VCH', `${entry.reference}|${entry.date}`)
    : docKey('STMT', statement?.generated_at || generated);

  const officeRows = isTransaction ? [
    ['Transaction date', String(entry.date).slice(0, 10)],
    ['Entity / client', entry.entity],
    ['Reference token', entry.reference],
    ['Account type', entry.account_type === 'group' ? 'Group account' : 'Individual account'],
    ['Inflow (+)', entry.inflow ? money(entry.inflow) : '—'],
    ['Outflow (−)', entry.outflow ? money(entry.outflow) : '—'],
  ] : statement ? [
    ['Total portfolio outbound', money(statement.portfolio.principal_disbursed)],
    ['Gross portfolio outstanding', money(statement.portfolio.outstanding)],
    ['Total liabilities — 5% incentives accrued', money(statement.liabilities?.refundable_accrued ?? 0)],
    ['Portfolio at risk (PAR)', showTotals ? `${statement.portfolio.par_pct}%` : '•••••'],
    ['10% processing form fees', money(statement.income.processing_fees)],
    ['Interest income earned', money(statement.income.interest_recognised)],
  ] : [];

  const customerRows = isTransaction ? [
    ['Reference', entry.reference],
    [entry.inflow ? 'Amount received' : 'Amount disbursed', money(entry.inflow || entry.outflow)],
    ['10% processing fee', 'Collected upfront at booking'],
    ['Outstanding balance', money(entry.loan_balance ?? entry.balance)],
  ] : statement ? [
    ['Principal disbursed', money(statement.portfolio.principal_disbursed)],
    ['Total repaid', money(statement.portfolio.total_repaid)],
    ['Outstanding balance', money(statement.portfolio.outstanding)],
    ['Net revenue', money(statement.income.net)],
  ] : [];

  const title = isTransaction
    ? (entry.inflow ? 'Receipt voucher' : 'Disbursement voucher')
    : 'Full financial statement';

  return (
    <article className="mf-ticket" aria-label={`${title} voucher`}>
      {/* ── Office copy ── */}
      <section className="mf-ticket__stub">
        <header className="mf-ticket__masthead">
          <div>
            <h1 className="mf-ticket__brand">{ISSUER.name}</h1>
            <span className="mf-ticket__kind">Office copy · {title}</span>
          </div>
          <div className="mf-ticket__refs">
            <div>REF <b>{key}</b></div>
            {isTransaction && <div>DOC {entry.reference}</div>}
            <div>{generated}</div>
            <div>{ISSUER.unit}</div>
          </div>
        </header>
        <div className="mf-ticket__body">
          <table className="mf-ticket__grid">
            <tbody>
              {officeRows.map(([l, v], i) => (
                <Row key={l} label={l} value={v} total={i === officeRows.length - 1 && !isTransaction} />
              ))}
            </tbody>
          </table>

          <div className="mf-ticket__stamp">
            <span>Operator audit: <b>{operator || '—'}</b></span>
            <span>Generated {generated}</span>
          </div>

          <div className="mf-ticket__auth">
            <div>
              <span className="mf-ticket__auth-line" />
              <span className="mf-ticket__auth-label">Prepared by</span>
            </div>
            <div>
              <span className="mf-ticket__auth-line" />
              <span className="mf-ticket__auth-label">Authorised by</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Perforation ── */}
      <div className="mf-ticket__perf">
        <span className="mf-ticket__scissors"><Scissors /> cut here · kata hapa</span>
      </div>

      {/* ── Customer ticket ── */}
      <section className="mf-ticket__stub">
        <header className="mf-ticket__masthead">
          <div>
            <h1 className="mf-ticket__brand">{ISSUER.name}</h1>
            <span className="mf-ticket__kind">Customer ticket · teller voucher</span>
          </div>
          <div className="mf-ticket__refs">
            <div>REF <b>{key}</b></div>
            <div>{generated}</div>
          </div>
        </header>
        <div className="mf-ticket__body">
          <table className="mf-ticket__grid">
            <tbody>
              {customerRows.map(([l, v], i) => (
                <Row key={l} label={l} value={v} total={i === customerRows.length - 1} />
              ))}
            </tbody>
          </table>
          <p className="mf-ticket__disclaimer">{DISCLAIMER}</p>
          <p className="mf-ticket__foot">{key} · {generated} · {ISSUER.licence}</p>
        </div>
      </section>
    </article>
  );
}
