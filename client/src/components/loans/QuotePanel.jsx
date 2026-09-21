import { fmt, fmtDay } from '../../utils/format';
import { GROUP_REFUND_RATE, PROCESSING_FEE_RATE } from '../../utils/finance';
import { frequencyLabel, money, perInterval } from '../../utils/labels';
import { t } from '../../i18n/bilingual';

export default function QuotePanel({ quote, title = 'Live quote', children }) {
  const interestShare = quote && quote.total > 0 ? (quote.interest / quote.total) * 100 : 0;
  const freq = quote ? frequencyLabel(quote.frequency) : null;
  const per  = quote ? perInterval(quote.frequency) : null;
  const plan = quote?.installment
    ? t('freq.installments', { count: quote.installmentCount, amount: money(quote.installment) })
    : null;
  const fee        = t('fee.processing', { rate: PROCESSING_FEE_RATE });
  const feeNote    = t('fee.processingNote');
  const refund     = t('fee.refundTitle', { rate: GROUP_REFUND_RATE });
  const refundNote = quote?.refundIncentive != null ? t('fee.refundNote', { amount: money(quote.refundIncentive) }) : null;

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

      {plan && (
        <div className="mf-installment">
          <span className="mf-quote__label">Installment · {freq.en}</span>
          <span className="mf-installment__value">
            TZS {money(quote.installment)}<small>{per.en}</small>
          </span>
          <span className="mf-installment__meta">{plan.en}</span>
          <span className="mf-installment__meta" lang="sw">TZS {money(quote.installment)} {per.sw} · {plan.sw}</span>
        </div>
      )}

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
          <dt>Repayment frequency</dt>
          <dd>{freq ? `${freq.en} · ${freq.sw}` : '—'}</dd>
        </div>
      </dl>

      {/* Mandatory 10% processing fee — every client, individuals and groups */}
      <div className="mf-quote__fee">
        <div className="mf-quote__fee-row">
          <span>{fee.en}<span className="mf-quote__fee-sw" lang="sw">{fee.sw}</span></span>
          <b>TZS {quote?.processingFee != null ? fmt(quote.processingFee) : '0.00'}</b>
        </div>
        <span className="mf-quote__fee-note">{feeNote.en}</span>
        <span className="mf-quote__fee-note" lang="sw">{feeNote.sw}</span>
      </div>

      {/* Group loans only: 5% refundable incentive on timely full completion */}
      {refundNote && (
        <div className="mf-quote__refund" role="note">
          <div className="mf-quote__fee-row">
            <span>{refund.en}<span className="mf-quote__fee-sw" lang="sw">{refund.sw}</span></span>
            <b>TZS {fmt(quote.refundIncentive)}</b>
          </div>
          <span className="mf-quote__fee-note">{refundNote.en}</span>
          <span className="mf-quote__fee-note" lang="sw">{refundNote.sw}</span>
        </div>
      )}

      {children}
    </aside>
  );
}
