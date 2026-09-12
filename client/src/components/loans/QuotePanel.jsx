import { fmt, fmtDay } from '../../utils/format';

const UNIT_SINGULAR = { days: 'day', weeks: 'week', months: 'month' };

export default function QuotePanel({ quote, title = 'Live quote', children }) {
  const interestShare = quote && quote.total > 0 ? (quote.interest / quote.total) * 100 : 0;

  return (
    <aside className="mf-quote" aria-live="polite">
      <div className="mf-quote__head">
        <span className="mf-quote__eyebrow">{title}</span>
        <span className="mf-quote__method">FLAT RATE</span>
      </div>

      <div>
        <div className="mf-quote__label">Total payable</div>
        <div className="mf-quote__total" style={{ marginTop: '.45rem' }}>
          <span>TZS</span>{quote ? fmt(quote.total) : '0.00'}
        </div>
      </div>

      <div className="mf-quote__split" aria-hidden="true">
        <span className="is-principal" style={{ flexGrow: quote ? quote.principal : 1 }} />
        <span className="is-interest" style={{ flexGrow: quote ? quote.interest : 0 }} />
      </div>
      <div className="mf-quote__legend">
        <span><i className="is-principal" /> Principal</span>
        <span><i className="is-interest" /> Interest{quote ? ` · ${interestShare.toFixed(1)}%` : ''}</span>
      </div>

      <dl className="mf-quote__grid">
        <div><dt>Principal</dt><dd>{quote ? fmt(quote.principal) : '—'}</dd></div>
        <div><dt>Interest</dt><dd>{quote ? fmt(quote.interest) : '—'}</dd></div>
        <div><dt>Tenor</dt><dd>{quote?.periods ? `${quote.periods} ${quote.unit}` : '—'}</dd></div>
        <div>
          <dt>Due date</dt>
          <dd>{quote?.dueDate ? fmtDay(quote.dueDate, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</dd>
        </div>
        <div className="is-span">
          <dt>Indicative installment</dt>
          <dd>{quote?.installment ? `TZS ${fmt(quote.installment)} / ${UNIT_SINGULAR[quote.unit] || 'period'}` : '—'}</dd>
        </div>
      </dl>

      {children}
    </aside>
  );
}
