import { repaymentStatus } from '../../utils/finance';
import { fmtDay } from '../../utils/format';
import { frequencyLabel, money } from '../../utils/labels';
import { t } from '../../i18n/bilingual';

const LONG_DATE = { day: '2-digit', month: 'short', year: 'numeric' };
const BAR_LIMIT = 90;

function Line({ text, strong }) {
  return (
    <div className={strong ? 'mf-plan__expected' : 'mf-plan__line'}>
      {text.en}
      <span className="mf-sw" lang="sw">{text.sw}</span>
    </div>
  );
}

/** Cumulative due status of a loan against its installment plan. */
export default function PlanStatus({ loan }) {
  const s = repaymentStatus(loan);
  if (!s) {
    return <div className="mf-plan"><Line text={t('pay.noSchedule')} /></div>;
  }

  const settled = loan.status === 'paid' || s.paid >= s.total - 0.005;
  const freq    = frequencyLabel(s.frequency);
  const tone    = settled ? null : s.arrears > 0 ? t('pay.arrears', { amount: money(s.arrears) })
    : s.ahead > 0 ? t('pay.ahead', { amount: money(s.ahead) }) : t('pay.onTrack');

  return (
    <div className="mf-plan" aria-live="polite">
      <Line strong text={t('pay.expected', { count: s.count, amount: money(s.amount) })} />
      <Line text={t('pay.dueByToday', { due: s.due, count: s.count, expected: money(s.expected) })} />

      {s.count <= BAR_LIMIT && (
        <div className="mf-plan__bar" aria-hidden="true">
          {Array.from({ length: s.count }, (_, i) => (
            <i key={i} className={i < s.covered ? 'is-paid' : i < s.due ? 'is-due' : undefined} />
          ))}
        </div>
      )}

      <div className="mf-plan__chips">
        <span className="badge badge--gray" title={freq.sw}>{freq.en}</span>
        <span className="badge badge--gray">{s.covered}/{s.count} covered</span>
        {settled
          ? <span className="badge badge--green" title={t('pay.settled').sw}>{t('pay.settled').en}</span>
          : <span className={`badge ${s.arrears > 0 ? 'badge--red' : 'badge--green'}`} title={tone.sw}>{tone.en}</span>}
      </div>

      {s.nextDue && !settled && <Line text={t('pay.nextDue', { date: fmtDay(s.nextDue, LONG_DATE) })} />}
    </div>
  );
}
