import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FiRefreshCw, FiPlus, FiAlertTriangle, FiArrowRight, FiTrendingUp, FiLock, FiX,
  FiBriefcase, FiPieChart, FiActivity, FiLayers, FiBarChart2, FiSmartphone,
  FiUsers, FiFileText,
} from 'react-icons/fi';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useProfileImage } from '../context/ProfileContext';
import { fmt0, fmtShort, fmtDay, fmtTimestamp } from '../utils/format';
import { providerLabel } from '../utils/labels';
import { t } from '../i18n/bilingual';
import { collectionRate, lastMonthKeys, monthLabel } from '../utils/finance';
import { DueChip, Empty, TableSkeleton } from '../components/ui';
import StatusBadge from '../components/common/StatusBadge';
import { useCanSeeTotals, Mask, RestrictedPanel } from '../components/common/MoneyGuard';
import WelcomeHero from '../components/dashboard/WelcomeHero';
import StatTile from '../components/dashboard/StatTile';
import { TrendDots, BarTrend, Donut } from '../components/dashboard/charts';
import '../styles/app/dashboard.css';

const EMPTY_SUMMARY = {
  customers: 0, total_loans: 0, loans_amount: 0,
  repayments: 0, collected: 0, outstanding: 0,
  active_loans: 0, overdue_loans: 0, processing_fees: 0,
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

/* ── Mobile money commission ledger — ADMIN ONLY ───────────────────── */
function CommissionLedgerCard({ commissions, loading, onNavigate }) {
  const providerMax = Math.max(0, ...commissions.by_provider.map(p => Number(p.total_fees) || 0));
  const title    = t('dash.commissionTitle');
  const sub      = t('dash.commissionSub');
  const total    = t('dash.commissionTotal');
  const heading  = t('dash.providerHeading');

  return (
    <section className="mf-card mf-commission-card" aria-labelledby="mf-commission-title">
      <div className="mf-card__head">
        <div>
          <div className="mf-commission-card__eyebrow">Mobile money · Pesa kwa simu</div>
          <h2 className="mf-card__title" id="mf-commission-title"><FiSmartphone size={15} /> {title.en}</h2>
          <div className="mf-card__sub">
            {sub.en}
            <span className="mf-sw" lang="sw">{title.sw} — {sub.sw}</span>
          </div>
        </div>
        <button type="button" className="mf-link-btn" onClick={() => onNavigate('/repayments')}>
          Ledger <FiArrowRight size={12} />
        </button>
      </div>

      {loading ? <div className="skeleton" style={{ height: 180 }} /> : commissions.count === 0 ? (
        <Empty Icon={FiSmartphone} title={t('dash.commissionEmpty').en} message={t('dash.commissionEmptyBody').en} />
      ) : (
        <div className="mf-commission">
          <div className="mf-commission__total">
            <span className="mf-commission__label">{total.en} · {total.sw}</span>
            <span className="mf-commission__value"><small>TZS</small>{fmt0(commissions.total_fees)}</span>
            <dl className="mf-commission__stats">
              <div><dt>This month</dt><dd>TZS {fmt0(commissions.month_fees)}</dd></div>
              <div><dt>Mobile money payments</dt><dd>{commissions.count}</dd></div>
              <div><dt>Sent by clients</dt><dd>TZS {fmt0(commissions.total_sent)}</dd></div>
              <div><dt>Credited to loans</dt><dd>TZS {fmt0(commissions.total_credited)}</dd></div>
            </dl>
          </div>

          <div className="mf-commission__side">
            {commissions.by_provider.length > 0 && (
              <div>
                <div className="mf-commission__heading">{heading.en} · {heading.sw}</div>
                <ul className="mf-commission__providers" aria-label="Agent fees by provider">
                  {commissions.by_provider.map(p => {
                    const fees  = Number(p.total_fees) || 0;
                    const share = commissions.total_fees > 0 ? Math.round((fees / commissions.total_fees) * 100) : 0;
                    return (
                      <li key={p.provider} className="mf-commission__provider">
                        <div className="mf-commission__provider-row">
                          <span className="mf-commission__provider-name">{providerLabel(p.provider)}</span>
                          <b>TZS {fmt0(fees)}</b>
                        </div>
                        <span className="mf-commission__track" aria-hidden="true">
                          <span style={{ width: `${providerMax > 0 ? (fees / providerMax) * 100 : 0}%` }} />
                        </span>
                        <span className="mf-commission__provider-meta">
                          {t('dash.providerPayments', { count: p.count }).en} · {share}% of all agent fees
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {commissions.recent.length > 0 && (
              <div>
                <div className="mf-commission__heading">Latest agent fees · Makato ya karibuni</div>
                <ul className="mf-commission__recent">
                  {commissions.recent.map(r => (
                    <li key={r.id}>
                      <button type="button" className="mf-commission__row" onClick={() => onNavigate(`/loans/${r.loan_id}`)}>
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
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   DASHBOARD
   ════════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const profileImg = useProfileImage();
  // Cumulative currency totals are super-admin only; counts stay visible to everyone
  const showTotals = useCanSeeTotals();
  // Set by ProtectedRoute when a non-admin tried to open an admin-only page
  const deniedPath = location.state?.accessDenied;
  const forbidden  = t('auth.forbidden');

  const [summary, setSummary]   = useState(EMPTY_SUMMARY);
  const [recent, setRecent]     = useState({ repayments: [], customers: [], loans: [] });
  const [monthly, setMonthly]   = useState({ loans: [], repayments: [] });
  const [pastDue, setPastDue]   = useState([]);
  const [expenses, setExpenses] = useState({ total: 0, count: 0 });
  const [commissions, setCommissions] = useState(EMPTY_COMMISSIONS);   // admin sessions only
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState('');
  const [updatedAt, setUpdatedAt]   = useState(null);

  const load = useCallback(async () => {
    const [sum, rec, mon, due, exp, com] = await Promise.allSettled([
      api.get('/dashboard/summary'),
      api.get('/dashboard/recent'),
      api.get('/dashboard/monthly'),
      api.get('/dashboard/overdue'),
      api.get('/expenses/summary'),
      // Agent-fee ledger is admin-only — staff sessions never request it
      isAdmin ? api.get('/dashboard/commissions') : Promise.resolve(null),
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
    if (isAdmin && com.status === 'fulfilled' && com.value) {
      const raw = com.value.data ?? {};
      setCommissions({
        ...EMPTY_COMMISSIONS,
        ...raw,
        by_provider: Array.isArray(raw.by_provider) ? raw.by_provider : [],
        recent:      Array.isArray(raw.recent) ? raw.recent : [],
      });
    } else {
      setCommissions(EMPTY_COMMISSIONS);
    }
    setUpdatedAt(new Date());
  }, [isAdmin]);

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
  const prevMonth  = series[series.length - 2];
  const thisMonth  = series[series.length - 1];
  const activeShare = summary.total_loans ? Math.round((summary.active_loans / summary.total_loans) * 100) : 0;
  /* Month-on-month movement shown as a small chip on the money tiles */
  const movement = (now, before) => {
    const a = Number(now) || 0;
    const b = Number(before) || 0;
    if (!b) return null;
    const pct = Math.round(((a - b) / b) * 100);
    return { pct, dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' };
  };
  const collectedDelta = movement(thisMonth?.collected, prevMonth?.collected);
  const disbursedDelta = movement(thisMonth?.disbursed, prevMonth?.disbursed);

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

  return (
    <div className="mf-page">
      <WelcomeHero user={user} avatar={profileImg}>
        {updatedAt && (
          <span className="mf-hero__updated">
            Updated {updatedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <button type="button" className="mf-btn mf-btn--ghost" onClick={refresh} disabled={refreshing}>
          <FiRefreshCw size={14} style={refreshing ? { animation: 'spin .8s linear infinite' } : undefined} />
          Refresh
        </button>
        <button type="button" className="mf-btn mf-btn--primary" onClick={() => navigate('/loans?new=1')}>
          <FiPlus size={15} /> New Loan
        </button>
      </WelcomeHero>

      {deniedPath && (
        <div className="mf-alert mf-alert--error mf-access-denied" role="alert">
          <FiLock size={18} aria-hidden="true" />
          <span>
            <strong className="mf-access-denied__title">{forbidden.sw} / {forbidden.en}</strong>
            <span className="mf-access-denied__path">Blocked: <code>{deniedPath}</code></span>
          </span>
          <button type="button" className="mf-icon-btn mf-alert__action" aria-label="Dismiss"
            onClick={() => navigate('/', { replace: true, state: null })}>
            <FiX size={15} />
          </button>
        </div>
      )}

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
            {pastDueBal > 0 && <> · TZS {showTotals ? fmt0(pastDueBal) : <Mask compact />} past due</>} — open the collections queue
          </span>
          <FiArrowRight size={15} className="mf-alert__action" />
        </button>
      )}

      {/* ── Statistics ─────────────────────────────────────────────────
           Flat tiles: elevation, typography and spacing instead of borders.
           Figures count up once; money follows the RBAC mask.           */}
      <section className="mf-tile-grid" aria-label="Key portfolio metrics">
        <StatTile
          label="Total Collected" unit="TZS" tone="emerald" Icon={FiTrendingUp}
          value={summary.collected} masked={!showTotals} format={fmt0}
          delta={collectedDelta} meter={rate ?? 0}
          sub={rate == null ? `${summary.repayments} payments posted` : `${rate.toFixed(1)}% collection rate`}
          onClick={() => navigate('/repayments')}
        />
        <StatTile
          label="Total Disbursed" unit="TZS" tone="charcoal" Icon={FiBriefcase}
          value={summary.loans_amount} masked={!showTotals} format={fmt0}
          delta={disbursedDelta}
          sub={`${summary.total_loans} loans on book`}
          onClick={() => navigate('/loans')}
        />
        <StatTile
          label="Outstanding" unit="TZS" tone={pastDueBal > 0 ? 'crimson' : 'slate'} Icon={FiPieChart}
          value={summary.outstanding} masked={!showTotals} format={fmt0}
          sub={pastDueBal > 0
            ? `${pastDue.length} loan${pastDue.length === 1 ? '' : 's'} past due`
            : 'No balances past due'}
          onClick={() => navigate('/repayments?view=collections')}
        />
        <StatTile
          label="Active Loans" unit="LOANS" tone="orange" Icon={FiLayers}
          value={summary.active_loans} count
          sub={`${activeShare}% of book · ${ls.pending} pending`}
          onClick={() => navigate('/loans?status=active')}
        />
        <StatTile
          label="Total Customers" unit="CLIENTS" tone="slate" Icon={FiUsers}
          value={summary.customers} count
          sub={`${recent.customers.length} onboarded recently`}
          onClick={() => navigate('/customers')}
        />
        {/* Expenses stay readable for every role — the agreed exception */}
        <StatTile
          label="Operating Expenses" unit="TZS" tone="amber" Icon={FiFileText}
          value={expenses.total} format={fmt0}
          sub={`${expenses.count} record${expenses.count === 1 ? '' : 's'}`}
          onClick={() => navigate('/expenses')}
        />
      </section>

      {/* ── Charts ── */}
      <div className="mf-dash-row">
        <section className="mf-card mf-card--chart">
          <div className="mf-card__head">
            <div>
              <h2 className="mf-card__title"><FiBarChart2 size={15} /> Cash Flow</h2>
              <div className="mf-card__sub">Disbursed vs. collected · trailing 12 months</div>
            </div>
            {showTotals && (
              <div className="mf-chart-legend">
                <span className="mf-chart-legend__item">
                  <i className="mf-chart__swatch is-charcoal" /> Disbursed <b>{fmtShort(totals12.disbursed)}</b>
                </span>
                <span className="mf-chart-legend__item">
                  <i className="mf-chart__swatch is-orange" /> Collected <b>{fmtShort(totals12.collected)}</b>
                </span>
              </div>
            )}
          </div>
          {loading ? <div className="skeleton" style={{ height: 240 }} />
            : showTotals ? (
              <BarTrend
                label="Cash flow"
                points={series.map(s => ({ key: s.key, label: monthLabel(s.key), disbursed: s.disbursed, collected: s.collected }))}
                series={[
                  { key: 'disbursed', label: 'Disbursed', tone: 'charcoal' },
                  { key: 'collected', label: 'Collected', tone: 'orange' },
                ]}
                format={v => `TZS ${fmt0(v)}`}
              />
            ) : <RestrictedPanel />}
        </section>

        <section className="mf-card mf-card--chart">
          <div className="mf-card__head">
            <div>
              <h2 className="mf-card__title"><FiPieChart size={15} /> Portfolio Composition</h2>
              <div className="mf-card__sub">Loans by lifecycle status</div>
            </div>
          </div>
          {loading ? <div className="skeleton" style={{ height: 240 }} /> : (
            <Donut
              centerLabel="loans on book"
              total={summary.total_loans}
              segments={STATUS_TONES.map(s => ({
                key: s.key, label: s.label, tone: s.tone, value: ls[s.key],
                onSelect: () => navigate(`/loans?status=${s.key}`),
              }))}
            />
          )}
          <dl className="mf-compo__aside">
            <div><dt>Clients</dt><dd>{summary.customers}</dd></div>
            <div><dt>Op. expenses</dt><dd title={`${expenses.count} records`}>TZS {fmtShort(expenses.total)}</dd></div>
            {isAdmin && (
              <div><dt>Form fees</dt><dd title="10% processing fees collected upfront">TZS {fmtShort(summary.processing_fees)}</dd></div>
            )}
          </dl>
        </section>
      </div>

      {/* ── Collections trend ── */}
      <section className="mf-card mf-card--chart">
        <div className="mf-card__head">
          <div>
            <h2 className="mf-card__title"><FiActivity size={15} /> Collections Trend</h2>
            <div className="mf-card__sub">Repayments banked each month · hover a point for the figure</div>
          </div>
          {showTotals && thisMonth && (
            <span className="mf-card__chip">This month <b>TZS {fmtShort(thisMonth.collected)}</b></span>
          )}
        </div>
        {loading ? <div className="skeleton" style={{ height: 240 }} />
          : showTotals ? (
            <TrendDots
              label="Collections trend"
              points={series.map(s => ({ key: s.key, label: monthLabel(s.key), value: s.collected }))}
              format={v => `TZS ${fmt0(v)}`}
            />
          ) : <RestrictedPanel />}
      </section>

      {/* ── Mobile money commission ledger — admins only; staff never see or fetch it ── */}
      {isAdmin && <CommissionLedgerCard commissions={commissions} loading={loading} onNavigate={navigate} />}

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
