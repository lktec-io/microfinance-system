import { fmt, fmtDay, fmtTimestamp } from '../../utils/format';
import { ISSUER, DISCLAIMER, receiptData } from '../../utils/receipt';

const LONG_DATE = { day: '2-digit', month: 'short', year: 'numeric' };
const STATUS = { active: 'Active', paid: 'Fully repaid', overdue: 'Overdue', pending: 'Pending' };

/**
 * The printed loan receipt.
 *
 * Rendered off-screen by ReceiptProvider and only made visible inside
 * `@media print`. Figures are NOT role-masked: this is a per-account document
 * the client is handed, the same rule the loan detail page follows.
 */
export default function LoanReceipt({ loan, issuedBy, printedAt }) {
  if (!loan) return null;
  const r = receiptData(loan, { issuedBy });
  const { figures: f } = r;

  return (
    <article className="mf-receipt" aria-label="Loan receipt">
      <header className="mf-receipt__head">
        <div>
          <h1 className="mf-receipt__brand">{ISSUER.name}</h1>
          <p className="mf-receipt__unit">{ISSUER.unit}</p>
          <p className="mf-receipt__tagline">{ISSUER.tagline}</p>
        </div>
        <div className="mf-receipt__stamp">
          <span className="mf-receipt__stamp-label">Loan statement · Risiti ya mkopo</span>
          <span className="mf-receipt__ref">{r.ref}</span>
          <span className="mf-receipt__issued">Issued {fmtDay(r.issuedOn, LONG_DATE)}</span>
        </div>
      </header>

      <section className="mf-receipt__parties">
        <div>
          <span className="mf-receipt__label">Client · Mteja</span>
          <span className="mf-receipt__client">{r.client.name}</span>
          <span className="mf-receipt__meta">
            Account {r.client.account}{r.client.phone ? ` · ${r.client.phone}` : ''}
          </span>
          {r.loan.isGroup && r.loan.groupName && (
            <span className="mf-receipt__meta">Group · Kikundi: {r.loan.groupName}</span>
          )}
        </div>
        <div>
          <span className="mf-receipt__label">Loan account · Akaunti ya mkopo</span>
          <span className="mf-receipt__client">{r.loan.code}</span>
          <span className="mf-receipt__meta">
            {STATUS[r.loan.status] || r.loan.status}
            {r.loan.startDate ? ` · opened ${fmtDay(r.loan.startDate, LONG_DATE)}` : ''}
          </span>
          {r.loan.dueDate && <span className="mf-receipt__meta">Due · Tarehe ya mwisho: {fmtDay(r.loan.dueDate, LONG_DATE)}</span>}
        </div>
      </section>

      <table className="mf-receipt__table">
        <thead>
          <tr>
            <th>Description · Maelezo</th>
            <th className="is-num">Amount (TZS)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Loan principal · Mkopo</td>
            <td className="is-num">{fmt(f.principal)}</td>
          </tr>
          <tr>
            <td>Interest rate · Riba<span className="mf-receipt__note">{f.rate}% flat on principal</span></td>
            <td className="is-num">{fmt(f.total - f.principal)}</td>
          </tr>
          <tr>
            <td>
              Processing fee · Ada ya fomu
              <span className="mf-receipt__note">
                {f.feeRate != null ? `${f.feeRate}% of principal, ` : ''}paid upfront — not part of the repayments
              </span>
            </td>
            <td className="is-num">{f.fee == null ? '—' : fmt(f.fee)}</td>
          </tr>
          <tr className="is-sum">
            <td>Total payable · Jumla inayodaiwa</td>
            <td className="is-num">{fmt(f.total)}</td>
          </tr>
          <tr>
            <td>Total repaid · Jumla iliyolipwa<span className="mf-receipt__note">{f.progress}% of the total payable</span></td>
            <td className="is-num">{fmt(f.repaid)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>Outstanding balance · Salio</td>
            <td className="is-num">{fmt(f.balance)}</td>
          </tr>
        </tfoot>
      </table>

      <footer className="mf-receipt__foot">
        <div className="mf-receipt__sign">
          <span className="mf-receipt__sign-line" aria-hidden="true" />
          <span className="mf-receipt__label">Served by · Ametoa huduma{r.issuedBy ? `: ${r.issuedBy}` : ''}</span>
        </div>
        <p className="mf-receipt__disclaimer">{DISCLAIMER.en}</p>
        <p className="mf-receipt__disclaimer" lang="sw">{DISCLAIMER.sw}</p>
        <p className="mf-receipt__printed">
          {r.ref} · printed {fmtTimestamp(printedAt || new Date().toISOString())}
        </p>
      </footer>
    </article>
  );
}
