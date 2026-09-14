import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiRefreshCw, FiPlus, FiAlertTriangle, FiArrowRight, FiTrendingUp,
  FiBriefcase, FiPieChart, FiPercent, FiActivity, FiLayers, FiBarChart2, FiSmartphone,
} from 'react-icons/fi';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { fmt0, fmtShort, fmtDay, fmtTimestamp } from '../utils/format';
import { providerLabel } from '../utils/labels';
import { t } from '../i18n/bilingual';
import { collectionRate, lastMonthKeys, monthLabel } from '../utils/finance';
import {
  PageHeader, MetricCard, MiniBars, StackBar, Meter, DueChip, Empty, TableSkeleton,
} from '../components/ui';
import StatusBadge from '../components/common/StatusBadge';
import '../styles/app/dashboard.css';

const EMPTY_SUMMARY = {
  customers: 0, total_loans: 0, loans_amount: 0,
  repayments: 0, collected: 0, outstanding: 0,
  active_loans: 0, overdue_loans: 0,
  loan_status: { active: 0, pending: 0, paid: 0, overdue: 0 },
};

const EMPTY_COMMISSIONS = {
  count: 0, total_fees: 0, total_sent: 0, total_credited: 0, month_fees: 0, by_provider: [], recent: [],
};

const STATUS_TONES = [
  { key: 'active',  label: 'Active',  tone: 'orange'  },
  { key: 'pending', label: 'Pending', tone: 'amber'   },
  { key: 'overdue', label: 'Overdue', tone: 'crimson' },
  { key: 'paid',    label: 'Paid',    tone: 'emerald' },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ── Cash-flow chart ───────────────────────────────────────────────── */
function CashFlowChart({ series }) {
  const max = Math.max(1, ...series.flatMap(s => [s.disbursed, s.collected]));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => fmtShort(f * max));
  const lastIdx = series.length - 1;

  return (
    <div className="mf-cashflow">
      <div className="mf-cashflow__axis" aria-hidden="true">
        {ticks.map((t, i) => <span key={i}>{t}</span>)}
      </div>
      <div className="mf-cashflow__plot" role="img"
        aria-label="Monthly disbursements versus collections over the last 12 months">
        {series.map((s, i) => (
          <div key={s.key} className={`mf-cashflow__group${i === lastIdx ? ' is-current' : ''}`}
            tabIndex={0} aria-label={`${monthLabel(s.key, 'long')}: disbursed TZS ${fmt0(s.disbursed)}, collected TZS ${fmt0(s.collected)}`}>
            <span className="mf-cashflow__bar mf-cashflow__bar--out"
              style={{ '--h': `${(s.disbursed / max) * 100}%`, animationDelay: `${i * 35}ms` }} />
            <span className="mf-cashflow__bar mf-cashflow__bar--in"
              style={{ '--h': `${(s.collected / max) * 100}%`, animationDelay: `${i * 35 + 60}ms` }} />
            <div className="mf-cashflow__tip">
              <div className="mf-cashflow__tip-title">{monthLabel(s.key, 'long')} {s.key.slice(0, 4)}</div>
              <div className="mf-cashflow__tip-row"><span>Disbursed</span><span>TZS {fmt0(s.disbursed)}</span></div>
              <div className="mf-cashflow__tip-row"><span>Collected</span><span>TZS {fmt0(s.collected)}</span></div>
              <div className="mf-cashflow__tip-row"><span>Net flow</span><span>{s.collected - s.disbursed >= 0 ? '+' : '−'}{fmt0(Math.abs(s.collected - s.disbursed))}</span></div>
            </div>
          </div>
        ))}
      </div>
      <div className="mf-cashflow__labels" aria-hidden="true">
        {series.map((s, i) => (
          <span key={s.key} className={i === lastIdx ? 'is-current' : ''}>{monthLabel(s.key)}</span>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   DASHBOARD
   ════════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [summary, setSummary]   = useState(EMPTY_SUMMARY);
  const [recent, setRecent]     = useState({ repayments: [], customers: [], loans: [] });
  const [monthly, setMonthly]   = useState({ loans: [], repayments: [] });
  const [pastDue, setPastDue]   = useState([]);
  const [expenses, setExpenses] = useState({ total: 0, count: 0 });
  const [commissions, setCommissions] = useState(EMPTY_COMMISSIONS);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState('');
  const [updatedAt, setUpdatedAt]   = useState(null);

  const load = useCallback(async () => {
    const [sum, rec, mon, due, exp, com] = await Promise.allSettled([
      api.get('/reports/summary'),
      api.get('/reports/recent'),
      api.get('/reports/monthly'),
      api.get('/reports/overdue'),
      api.get('/expenses/summary'),
      api.get('/reports/commissions'),
    ]);

    if (sum.status === 'fulfilled') {
      const raw = sum.value.data ?? {};
      setSummary({
        ...EMPTY_SUMMARY,
        ...raw,
        loan_status: {
          active:  Number(raw.loan_status?.active  || 0),
          pending: Number(raw.loan_status?.pending || 0),
          paid:    Number(raw.loan_status?.paid    || 0),
          overdue: Number(raw.loan_status?.overdue || 0),
        },
      });
      setError('');
    } else {
      setError('Portfolio metrics could not be loaded. Check your connection and retry.');
    }
    if (rec.status === 'fulfilled') {
      const raw = rec.value.data ?? {};
      setRecent({ repayments: raw.repayments || [], customers: raw.customers || [], loans: raw.loans || [] });
    }
    if (mon.status === 'fulfilled') {
      const raw = mon.value.data ?? {};
      setMonthly({ loans: raw.loans || [], repayments: raw.repayments || [] });
    }
    if (due.status === 'fulfilled') setPastDue(Array.isArray(due.value.data) ? due.value.data : []);
    if (exp.status === 'fulfilled') {
      const raw = exp.value.data ?? {};
      setExpenses({ total: Number(raw.total || 0), count: Number(raw.count || 0) });
    }
    if (com.status === 'fulfilled') {
      const raw = com.value.data ?? {};
      setCommissions({
        ...EMPTY_COMMISSIONS,
        ...raw,
        by_provider: Array.isArray(raw.by_provider) ? raw.by_provider : [],
        recent:      Array.isArray(raw.recent) ? raw.recent : [],
      });
    }
    setUpdatedAt(new Date());
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  async function refresh() {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }

  /* ── Derived series & metrics ── */
  const series = useMemo(() => {
    const out = Object.fromEntries(monthly.loans.map(r => [r.month, Number(r.total_issued) || 0]));
    const inc = Object.fromEntries(monthly.repayments.map(r => [r.month, Number(r.total_collected) || 0]));
    return lastMonthKeys(12).map(key => ({ key, disbursed: out[key] || 0, collected: inc[key] || 0 }));
  }, [monthly]);

  const totals12 = useMemo(() => series.reduce(
    (t, s) => ({ disbursed: t.disbursed + s.disbursed, collected: t.collected + s.collected }),
    { disbursed: 0, collected: 0 },
  ), [series]);

  const ls         = summary.loan_status;
  const rate       = collectionRate(summary.collected, summary.outstanding);
  const pastDueBal = pastDue.reduce((s, l) => s + (Number(l.balance) || 0), 0);
  const currentBal = Math.max(0, summary.outstanding - pastDueBal);
  const thisMonth  = series[series.length - 1];
  const activeShare = summary.total_loans ? Math.round((summary.active_loans / summary.total_loans) * 100) : 0;
  const rateTone   = rate == null ? 'slate' : rate >= 80 ? 'emerald' : rate >= 60 ? 'orange' : 'crimson';

  const timeline = useMemo(() => {
    const events = [
      ...recent.repayments.map(r => ({
        id: `r-${r.id}`, kind: 'payment', date: r.payment_date,
        title: r.customer_name || 'Repayment',
        meta: `Repayment posted · ${r.receipt_number || '—'}`,
        amount: Number(r.amount) || 0,
        to: r.loan_id ? `/loans/${r.loan_id}` : null,
      })),
      ...recent.customers.map(c => ({
        id: `c-${c.id}`, kind: 'client', date: c.registration_date,
        title: c.full_name,
        meta: `Client onboarded · ${c.loan_count || 0} loan${Number(c.loan_count) === 1 ? '' : 's'}`,
        to: '/customers',
      })),
    ];
    return events
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
      .slice(0, 9);
  }, [recent]);

  const firstName = user?.name?.split(' ')[0] || 'there';
  const providerMax = Math.max(0, ...commissions.by_provider.map(p => Number(p.total_fees) || 0));
  const commissionTitle = t('dash.commissionTitle');
  const commissionSub   = t('dash.commissionSub');

  return (
    <div className="mf-page">
      <PageHeader
        eyebrow={new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        title="Portfolio Overview"
        subtitle={`${greeting()}, ${firstName}. Here is where the loan book stands today.`}
        actions={
          <>
            {updatedAt && <span className="mf-page-head__meta">Updated {updatedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>}
            <button type="button" className="mf-btn mf-btn--ghost" onClick={refresh} disabled={refreshing}>
              <FiRefreshCw size={14} style={refreshing ? { animation: 'spin .8s linear infinite' } : undefined} />
              Refresh
            </button>
            <button type="button" className="mf-btn mf-btn--primary" onClick={() => navigate('/loans?new=1')}>
              <FiPlus size={15} /> New Loan
            </button>
          </>
        }
      />

      {error && (
        <div className="mf-alert mf-alert--error" role="alert">
          <FiAlertTriangle size={15} /> {error}
          <button type="button" className="mf-btn mf-btn--sm mf-alert__action" onClick={refresh}>Retry</button>
        </div>
      )}

      {!loading && summary.overdue_loans > 0 && (
        <button type="button" className="mf-alert mf-alert--danger" onClick={() => navigate('/repayments?view=collections')}>
          <FiAlertTriangle size={15} />
          <span>
            <strong>{summary.overdue_loans} loan{summary.overdue_loans === 1 ? '' : 's'} overdue</strong>
            {pastDueBal > 0 && <> · TZS {fmt0(pastDueBal)} past due</>} — open the collections queue
          </span>
          <FiArrowRight size={15} className="mf-alert__action" />
        </button>
      )}

      {/* ── KPIs ── */}
      <section className="mf-metric-grid" aria-label="Key portfolio metrics">
        <MetricCard
          label="Total Disbursed" unit="TZS" tone="charcoal" Icon={FiBriefcase} loading={loading}
          value={fmt0(summary.loans_amount)}
          sub={<><strong>{summary.total_loans}</strong> loans · <strong>TZS {fmtShort(thisMonth?.disbursed)}</strong> this month</>}
          tracker={<MiniBars values={series.slice(-8).map(s => s.disbursed)} labels={series.slice(-8).map(s => monthLabel(s.key))} />}
          onClick={() => navigate('/loans')}
        />
        <MetricCard
          label="Active Portfolio" tone="orange" Icon={FiLayers} loading={loading}
          value={summary.active_loans}
          unit="LOANS"
          sub={<><strong>{activeShare}%</strong> of book · <strong>{ls.pending}</strong> pending</>}
          tracker={<StackBar segments={STATUS_TONES.map(s => ({ label: s.label, tone: s.tone, value: ls[s.key] }))} />}
          onClick={() => navigate('/loans?status=active')}
        />
        <MetricCard
          label="Outstanding Balance" unit="TZS" tone={pastDueBal > 0 ? 'crimson' : 'neutral'} Icon={FiPieChart} loading={loading}
          value={fmt0(summary.outstanding)}
          sub={pastDueBal > 0
            ? <><strong className="mf-tone--crimson">TZS {fmtShort(pastDueBal)}</strong> past due · {pastDue.length} loan{pastDue.length === 1 ? '' : 's'}</>
            : <>No balances past due</>}
          tracker={<StackBar segments={[
            { label: 'Current',  tone: 'charcoal', value: currentBal, display: `TZS ${fmt0(currentBal)}` },
            { label: 'Past due', tone: 'crimson',  value: pastDueBal, display: `TZS ${fmt0(pastDueBal)}` },
          ]} />}
          onClick={() => navigate('/repayments?view=collections')}
        />
        <MetricCard
          label="Collection Rate" tone={rateTone === 'crimson' ? 'crimson' : 'emerald'} Icon={FiPercent} loading={loading}
          value={rate == null ? '—' : `${rate.toFixed(1)}%`}
          sub={<><strong>TZS {fmtShort(summary.collected)}</strong> collected of TZS {fmtShort(summary.collected + summary.outstanding)}</>}
          tracker={<Meter value={rate ?? 0} tone={rateTone} />}
          title="Collected ÷ (collected + outstanding balance)"
          onClick={() => navigate('/repayments')}
        />
      </section>

      {/* ── Cash flow + composition ── */}
      <div className="mf-dash-row">
        <section className="mf-card">
          <div className="mf-card__head">
            <div>
              <h2 className="mf-card__title"><FiBarChart2 size={15} /> Cash Flow</h2>
              <div className="mf-card__sub">Disbursements vs. collections · trailing 12 months</div>
            </div>
            <div className="mf-chart-legend">
              <span className="mf-chart-legend__item">
                <span className="mf-chart-legend__swatch mf-tone-bg--charcoal" /> Disbursed <b>{fmtShort(totals12.disbursed)}</b>
              </span>
              <span className="mf-chart-legend__item">
                <span className="mf-chart-legend__swatch mf-tone-bg--orange" /> Collected <b>{fmtShort(totals12.collected)}</b>
              </span>
            </div>
          </div>
          {loading ? <div className="skeleton" style={{ height: 240 }} /> : <CashFlowChart series={series} />}
        </section>

        <section className="mf-card">
          <div className="mf-card__head">
            <div>
              <h2 className="mf-card__title"><FiPieChart size={15} /> Portfolio Composition</h2>
              <div className="mf-card__sub">Loans by lifecycle status</div>
            </div>
          </div>
          <div className="mf-compo">
            <div className="mf-compo__total">
              <span className="mf-compo__total-num">{loading ? '—' : summary.total_loans}</span>
              <span className="mf-compo__total-label">loans on book</span>
            </div>
            <StackBar tall segments={STATUS_TONES.map(s => ({ label: s.label, tone: s.tone, value: ls[s.key] }))} />
            <div className="mf-compo__list">
              {STATUS_TONES.map(s => (
                <button key={s.key} type="button" className="mf-compo__row" onClick={() => navigate(`/loans?status=${s.key}`)}>
                  <span className={`mf-compo__swatch mf-tone-bg--${s.tone}`} />
                  <span className="mf-compo__label">{s.label}</span>
                  <span className="mf-compo__count">{ls[s.key]}</span>
                  <span className="mf-compo__pct">
                    {summary.total_loans ? `${Math.round((ls[s.key] / summary.total_loans) * 100)}%` : '0%'}
                  </span>
                </button>
              ))}
            </div>
            <dl className="mf-compo__aside">
              <div><dt>Clients</dt><dd>{summary.customers}</dd></div>
              <div><dt>Op. expenses</dt><dd title={`${expenses.count} records`}>TZS {fmtShort(expenses.total)}</dd></div>
            </dl>
          </div>
        </section>
      </div>

      {/* ── Mobile money commission ledger ── */}
      <section className="mf-card" aria-labelledby="mf-commission-title">
        <div className="mf-card__head">
          <div>
            <h2 className="mf-card__title" id="mf-commission-title"><FiSmartphone size={15} /> {commissionTitle.en}</h2>
            <div className="mf-card__sub">
              {commissionSub.en}
              <span className="mf-sw" lang="sw">{commissionTitle.sw} — {commissionSub.sw}</span>
            </div>
          </div>
          <button type="button" className="mf-link-btn" onClick={() => navigate('/repayments')}>
            Ledger <FiArrowRight size={12} />
          </button>
        </div>
        {loading ? <div className="skeleton" style={{ height: 160 }} /> : commissions.count === 0 ? (
          <Empty Icon={FiSmartphone} title={t('dash.commissionEmpty').en} message={t('dash.commissionEmptyBody').en} />
        ) : (
          <div className="mf-commission">
            <div className="mf-commission__total">
              <span className="mf-commission__label">
                {t('dash.commissionTotal').en} · {t('dash.commissionTotal').sw}
              </span>
              <span className="mf-commission__value"><small>TZS</small>{fmt0(commissions.total_fees)}</span>
              <div className="mf-kv">
                <div className="mf-kv__row"><span>This month</span><span>TZS {fmt0(commissions.month_fees)}</span></div>
                <div className="mf-kv__row"><span>Mobile money payments</span><span>{commissions.count}</span></div>
                <div className="mf-kv__row"><span>Sent by clients</span><span>TZS {fmt0(commissions.total_sent)}</span></div>
                <div className="mf-kv__row"><span>Credited to loans</span><span>TZS {fmt0(commissions.total_credited)}</span></div>
              </div>
              {commissions.by_provider.length > 0 && (
                <ul className="mf-commission__providers" aria-label="Agent fees by provider">
                  {commissions.by_provider.map(p => (
                    <li key={p.provider} className="mf-commission__provider">
                      <span>{providerLabel(p.provider)}</span>
                      <span className="mf-commission__track" aria-hidden="true">
                        <span style={{ width: `${providerMax > 0 ? (Number(p.total_fees) / providerMax) * 100 : 0}%` }} />
                      </span>
                      <b title={`${p.count} payments`}>TZS {fmtShort(p.total_fees)}</b>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="mf-section-label">Latest agent fees</div>
              <ul className="mf-commission__recent">
                {commissions.recent.map(r => (
                  <li key={r.id}>
                    <button type="button" className="mf-commission__row" onClick={() => navigate(`/loans/${r.loan_id}`)}>
                      <span className="mf-commission__row-title">{r.customer_name}</span>
                      <span className="mf-commission__row-fee">TZS {fmt0(r.agent_fee)}</span>
                      <span className="mf-commission__row-meta">
                        {providerLabel(r.mobile_provider)} · {fmtTimestamp(r.paid_at) || String(r.payment_date || '').slice(0, 10)} · {r.receipt_number}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* ── Activity + latest loans ── */}
      <div className="mf-dash-row mf-dash-row--even">
        <section className="mf-card">
          <div className="mf-card__head">
            <div>
              <h2 className="mf-card__title"><FiActivity size={15} /> Recent Activity</h2>
              <div className="mf-card__sub">Repayments and client onboarding</div>
            </div>
            <button type="button" className="mf-link-btn" onClick={() => navigate('/repayments')}>
              Ledger <FiArrowRight size={12} />
            </button>
          </div>
          {loading ? <TableSkeleton rows={5} cols={3} /> : timeline.length === 0 ? (
            <Empty Icon={FiActivity} title="No activity yet" message="Repayments and new clients will appear here." />
          ) : (
            <ol className="mf-timeline">
              {timeline.map(ev => {
                const Body = ev.to ? 'button' : 'div';
                return (
                  <li key={ev.id} className="mf-timeline__item">
                    <span className="mf-timeline__date">{fmtDay(ev.date)}</span>
                    <span className="mf-timeline__rail"><span className={`mf-timeline__node mf-timeline__node--${ev.kind}`} /></span>
                    <Body type={ev.to ? 'button' : undefined} className="mf-timeline__body"
                      onClick={ev.to ? () => navigate(ev.to) : undefined}>
                      <span className="mf-timeline__title">{ev.title}</span>
                      <span className="mf-timeline__meta">{ev.meta}</span>
                    </Body>
                    {ev.kind === 'payment'
                      ? <span className="mf-timeline__amount">+{fmt0(ev.amount)}</span>
                      : <span className="badge badge--gray" style={{ marginTop: '.45rem' }}>Client</span>}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="mf-card mf-card--flush">
          <div className="mf-card__head">
            <div>
              <h2 className="mf-card__title"><FiTrendingUp size={15} /> Latest Loans</h2>
              <div className="mf-card__sub">Most recently originated</div>
            </div>
            <button type="button" className="mf-link-btn" onClick={() => navigate('/loans')}>
              All loans <FiArrowRight size={12} />
            </button>
          </div>
          {loading ? <TableSkeleton rows={5} cols={4} /> : recent.loans.length === 0 ? (
            <Empty Icon={FiLayers} title="No loans yet" action={
              <button type="button" className="mf-btn mf-btn--primary mf-btn--sm" onClick={() => navigate('/loans?new=1')}>
                <FiPlus size={13} /> New application
              </button>
            } />
          ) : (
            <div className="mf-table-wrap">
              <table className="mf-table mf-table--stack">
                <thead>
                  <tr><th>Loan</th><th className="is-num">Balance</th><th>Due</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {recent.loans.map(l => (
                    <tr key={l.id} className="is-link" onClick={() => navigate(`/loans/${l.id}`)}>
                      <td>
                        <div className="mf-cell-stack">
                          <span className="mf-cell-title">{l.customer_name}</span>
                          <span className="mf-cell-sub mf-mono">#{l.id} · TZS {fmt0(l.loan_amount)}</span>
                        </div>
                      </td>
                      <td className="is-num" data-label="Balance (TZS)">{fmt0(l.balance)}</td>
                      <td data-label="Due"><DueChip date={l.due_date} status={l.status} /></td>
                      <td data-label="Status"><StatusBadge status={l.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
