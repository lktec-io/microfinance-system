import { useState } from 'react';
import { FiSliders, FiRotateCcw, FiInfo, FiArrowRight, FiCalendar } from 'react-icons/fi';
import LoanTermsFields, { EMPTY_TERMS, validateTerms } from './LoanTermsFields';
import QuotePanel from './QuotePanel';
import { Empty } from '../ui';
import { loanQuote, indicativeSchedule, todayISO } from '../../utils/finance';
import { fmt, fmtDay } from '../../utils/format';

const SCHEDULE_LIMIT = 60;

export default function LoanCalculator({ onStartApplication }) {
  const [terms, setTerms] = useState({ ...EMPTY_TERMS, start_date: todayISO() });

  const valid    = Object.keys(validateTerms(terms)).length === 0;
  const quote    = valid ? loanQuote(terms) : null;
  const schedule = quote ? indicativeSchedule(quote, SCHEDULE_LIMIT) : [];

  return (
    <div className="mf-page">
      <div className="mf-calc">
        <section className="mf-card">
          <div className="mf-card__head">
            <div>
              <h2 className="mf-card__title"><FiSliders size={15} /> Loan terms</h2>
              <div className="mf-card__sub">Same flat-interest formula the system uses when booking a loan.</div>
            </div>
            <button type="button" className="mf-btn mf-btn--quiet mf-btn--sm"
              onClick={() => setTerms({ ...EMPTY_TERMS, start_date: todayISO() })}>
              <FiRotateCcw size={13} /> Reset
            </button>
          </div>

          <LoanTermsFields form={terms} setForm={setTerms} showPurpose={false} />

          <div className="mf-calc__note">
            <FiInfo size={14} />
            <span>
              Interest = principal × rate ÷ 100, charged once over the tenor. Due date = start date + tenor.
              Final figures are confirmed by the server when the loan is booked.
            </span>
          </div>
        </section>

        <QuotePanel quote={quote}>
          <button type="button" className="mf-btn mf-btn--primary mf-btn--block mf-btn--lg"
            disabled={!valid} onClick={() => onStartApplication(terms)}>
            Start application with these terms <FiArrowRight size={15} />
          </button>
        </QuotePanel>
      </div>

      <section className="mf-card mf-card--flush">
        <div className="mf-card__head">
          <div>
            <h2 className="mf-card__title"><FiCalendar size={15} /> Indicative repayment schedule</h2>
            <div className="mf-card__sub">
              Equal split of the total payable per period — guidance for the client. The system tracks a single due date per loan.
            </div>
          </div>
        </div>
        {schedule.length === 0 ? (
          <Empty Icon={FiCalendar} title="Enter loan terms" message="Principal, rate and tenor generate the schedule." />
        ) : (
          <div className="mf-table-wrap" style={{ maxHeight: 420, overflowY: 'auto' }}>
            <table className="mf-table">
              <thead>
                <tr>
                  <th style={{ width: 70 }}>Period</th>
                  <th>Date</th>
                  <th className="is-num">Installment (TZS)</th>
                  <th className="is-num">Remaining (TZS)</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map(row => (
                  <tr key={row.index}>
                    <td className="mf-mono">{String(row.index).padStart(2, '0')}</td>
                    <td>{fmtDay(row.date, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="is-num">{fmt(row.amount)}</td>
                    <td className="is-num">{fmt(row.remaining)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>
                    {quote.periods > SCHEDULE_LIMIT
                      ? `First ${SCHEDULE_LIMIT} of ${quote.periods} periods`
                      : `${quote.periods} period${quote.periods === 1 ? '' : 's'}`}
                  </td>
                  <td className="is-num">{fmt(quote.total)}</td>
                  <td className="is-num">—</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
