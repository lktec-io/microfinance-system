import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FiPlus, FiBookOpen, FiInbox, FiArrowUpRight, FiAlertCircle, FiRefreshCw,
  FiDollarSign, FiCalendar, FiPieChart, FiAlertTriangle, FiSearch, FiCreditCard,
} from 'react-icons/fi';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { fmt, fmt0, fmtDay, fmtShort, fmtTimestamp } from '../utils/format';
import { daysUntil, isoDate, lastMonthKeys, monthLabel, repaymentStatus } from '../utils/finance';
import { frequencyLabel, money, paymentModeLabel } from '../utils/labels';
import {
  PageHeader, Tabs, Segmented, SearchField, MetricCard, MiniBars, StackBar,
  ProgressBar, DueChip, Avatar, Empty, TableSkeleton,
} from '../components/ui';
import StatusBadge        from '../components/common/StatusBadge';
import RecordPaymentModal from '../components/repayments/RecordPaymentModal';
import '../styles/app/lending.css';
import '../styles/app/directory.css';

const SHORT_DATE = { day: '2-digit', month: 'short', year: 'numeric' };

function localISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function presetRange(preset) {
  const now = new Date();
  const today = localISO(now);
  const back = days => { const d = new Date(now); d.setDate(d.getDate() - days); return localISO(d); };
  switch (preset) {
    case 'today': return { from: today, to: today };
    case '7d':    return { from: back(6), to: today };
    case '30d':   return { from: back(29), to: today };
    case 'mtd':   return { from: `${today.slice(0, 7)}-01`, to: today };
    default:      return { from: '', to: '' };
  }
}

function isPastDue(loan) {
  if (loan.status === 'paid' || !(Number(loan.balance) > 0)) return false;
  if (loan.status === 'overdue') return true;
  const d = daysUntil(loan.due_date);
  return d != null && d < 0;
}

export default function Repayments() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [params, setParams] = useSearchParams();

  const [repayments, setRepayments] = useState([]);
  const [loans, setLoans]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [loadError, setLoadError]   = useState('');

  const [tab, setTab] = useState(() => (params.get('view') === 'collections' ? 'collections' : 'ledger'));

  const [query, setQuery]   = useState('');
  const [preset, setPreset] = useState('all');
  const [range, setRange]   = useState({ from: '', to: '' });

  const [bucket, setBucket] = useState('all');
  const [cQuery, setCQuery] = useState('');

  const [record, setRecord] = useState(null);   // { loanId }

  const load = useCallback(async () => {
    const [r, l] = await Promise.allSettled([api.get('/repayments'), api.get('/loans')]);
    if (r.status === 'fulfilled') { setRepayments(r.value.data); setLoadError(''); }
    else setLoadError(r.reason?.response?.data?.message || 'Repayments could not be loaded.');
    if (l.status === 'fulfilled') setLoans(l.value.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Deep links: ?record=1[&loan=ID] · ?view=collections */
  useEffect(() => {
    const view = params.get('view');
    if (view === 'collections' || view === 'ledger') setTab(view);
    if (params.get('record') === '1') {
      setRecord({ loanId: params.get('loan') || '' });
      const next = new URLSearchParams(params);
      next.delete('record');
      next.delete('loan');
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  function choosePreset(p) {
    setPreset(p);
    if (p !== 'custom') setRange(presetRange(p));
  }

  /* ── Metrics ── */
  const metrics = useMemo(() => {
    const monthKeys = lastMonthKeys(6);
    const byMonth = Object.fromEntries(monthKeys.map(k => [k, 0]));
    let total = 0;
    for (const r of repayments) {
      const amt = Number(r.amount) || 0;
      total += amt;
      const k = String(r.payment_date || '').slice(0, 7);
      if (k in byMonth) byMonth[k] += amt;
    }
    const open = loans.filter(l => l.status !== 'paid' && Number(l.balance) > 0);
    const receivable = open.reduce((s, l) => s + (Number(l.balance) || 0), 0);
    const pastDue = open.filter(isPastDue);
    const pastDueBal = pastDue.reduce((s, l) => s + (Number(l.balance) || 0), 0);
    return {
      total,
      count: repayments.length,
      mtd: byMonth[monthKeys[monthKeys.length - 1]],
      monthKeys,
      monthSeries: monthKeys.map(k => byMonth[k]),
      openCount: open.length,
      receivable,
      pastDueCount: pastDue.length,
      pastDueBal,
    };
  }, [repayments, loans]);

  /* ── Ledger ── */
  const ledger = useMemo(() => {
    const q = query.trim().toLowerCase();
    return repayments.filter(r => {
      const d = String(r.payment_date || '').slice(0, 10);
      if (range.from && d < range.from) return false;
      if (range.to && d > range.to) return false;
      if (!q) return true;
      return r.customer_name?.toLowerCase().includes(q)
        || r.receipt_number?.toLowerCase().includes(q)
        || `#${r.loan_id}` === q || String(r.loan_id) === q
        || paymentModeLabel(r).toLowerCase().includes(q);
    });
  }, [repayments, query, range]);

  const ledgerTotal = ledger.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  // Mobile money agent fees are reported separately — never part of the collected total
  const ledgerFees  = ledger.reduce((s, r) => s + (Number(r.agent_fee) || 0), 0);

  /* ── Collections queue ── */
  const queue = useMemo(() => {
    const q = cQuery.trim().toLowerCase().replace(/^#/, '');
    return loans
      .filter(l => l.status !== 'paid' && Number(l.balance) > 0)
      .map(l => ({ loan: l, days: daysUntil(l.due_date), pastDue: isPastDue(l) }))
      .filter(({ loan, days, pastDue }) => {
        if (bucket === 'overdue' && !pastDue) return false;
        if (bucket === 'due7' && (pastDue || days == null || days > 7)) return false;
        if (bucket === 'later' && (pastDue || (days != null && days <= 7))) return false;
        if (!q) return true;
        return loan.customer_name?.toLowerCase().includes(q) || loan.customer_phone?.includes(q) || String(loan.id) === q;
      })
      .sort((a, b) => (a.days ?? 1e9) - (b.days ?? 1e9));
  }, [loans, bucket, cQuery]);

  const bucketCounts = useMemo(() => {
    const open = loans.filter(l => l.status !== 'paid' && Number(l.balance) > 0);
    const out = { all: open.length, overdue: 0, due7: 0, later: 0 };
    for (const l of open) {
      const d = daysUntil(l.due_date);
      if (isPastDue(l)) out.overdue += 1;
      else if (d != null && d <= 7) out.due7 += 1;
      else out.later += 1;
    }
    return out;
  }, [loans]);

  return (
    <div className="mf-page">
      <PageHeader
        eyebrow="Collections"
        title="Repayments & Collections"
        subtitle="The posted payment ledger and a prioritised collections queue."
        actions={
          <button type="button" className="mf-btn mf-btn--primary" onClick={() => setRecord({})}>
            <FiPlus size={17} /> Record Payment
          </button>
        }
      />

      <section className="mf-metric-grid" aria-label="Collection metrics">
        <MetricCard label="Total collected" unit="TZS" tone="emerald" Icon={FiDollarSign} loading={loading}
          value={fmt0(metrics.total)} sub={<><strong>{metrics.count}</strong> payments posted</>} />
        <MetricCard label="Collected this month" unit="TZS" tone="orange" Icon={FiCalendar} loading={loading}
          value={fmt0(metrics.mtd)}
          sub={<>Last 6 months</>}
          tracker={<MiniBars values={metrics.monthSeries} labels={metrics.monthKeys.map(k => monthLabel(k))} />} />
        <MetricCard label="Receivable" unit="TZS" tone="charcoal" Icon={FiPieChart} loading={loading}
          value={fmt0(metrics.receivable)}
          sub={<><strong>{metrics.openCount}</strong> open loans</>}
          tracker={<StackBar segments={[
            { label: 'Current',  tone: 'charcoal', value: metrics.receivable - metrics.pastDueBal, display: `TZS ${fmt0(metrics.receivable - metrics.pastDueBal)}` },
            { label: 'Past due', tone: 'crimson',  value: metrics.pastDueBal, display: `TZS ${fmt0(metrics.pastDueBal)}` },
          ]} />}
          onClick={() => { setTab('collections'); setBucket('all'); }} />
        <MetricCard label="Past due" unit="TZS" tone="crimson" Icon={FiAlertTriangle} loading={loading}
          value={fmt0(metrics.pastDueBal)}
          sub={<><strong>{metrics.pastDueCount}</strong> loan{metrics.pastDueCount === 1 ? '' : 's'} need follow-up</>}
          onClick={() => { setTab('collections'); setBucket('overdue'); }} />
      </section>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'ledger',      label: 'Payment Ledger',    Icon: FiBookOpen, count: repayments.length },
          { value: 'collections', label: 'Collections Queue', Icon: FiInbox,    count: bucketCounts.all },
        ]}
      />

      {loadError && (
        <div className="mf-alert mf-alert--error" role="alert">
          <FiAlertCircle size={17} /> <span>{loadError}</span>
          <button type="button" className="mf-btn mf-btn--sm mf-alert__action" onClick={() => { setLoading(true); load(); }}>
            <FiRefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {tab === 'ledger' ? (
        <>
          <div className="mf-toolbar">
            <div className="mf-toolbar__group">
              <Segmented ariaLabel="Date range" value={preset} onChange={choosePreset}
                options={[
                  { value: 'all', label: 'All time' }, { value: 'today', label: 'Today' },
                  { value: '7d', label: '7D' }, { value: '30d', label: '30D' },
                  { value: 'mtd', label: 'MTD' }, { value: 'custom', label: 'Custom' },
                ]} />
              {preset === 'custom' && (
                <span className="mf-date-range">
                  <input type="date" className="mf-input" aria-label="From date" value={range.from}
                    onChange={e => setRange(r => ({ ...r, from: e.target.value }))} />
                  <span className="mf-date-range__sep">→</span>
                  <input type="date" className="mf-input" aria-label="To date" value={range.to}
                    onChange={e => setRange(r => ({ ...r, to: e.target.value }))} />
                </span>
              )}
            </div>
            <div className="mf-toolbar__group">
              <span className="mf-toolbar__meta">
                <strong>{ledger.length}</strong> entries · <strong>TZS {fmtShort(ledgerTotal)}</strong>
                {ledgerFees > 0 && <> · agent fees <strong>TZS {fmtShort(ledgerFees)}</strong></>}
              </span>
              <SearchField value={query} onChange={setQuery} placeholder="Client, receipt or #loan" />
            </div>
          </div>

          {loading ? (
            <div className="mf-card mf-card--flush"><TableSkeleton rows={8} cols={5} /></div>
          ) : ledger.length === 0 ? (
            <div className="mf-card">
              <Empty Icon={query || preset !== 'all' ? FiSearch : FiBookOpen}
                title={query || preset !== 'all' ? 'No payments in this view' : 'No payments recorded yet'}
                message={query || preset !== 'all' ? 'Widen the date range or clear the search.' : 'Posted repayments will appear in this ledger.'}
                action={query || preset !== 'all'
                  ? <button type="button" className="mf-btn mf-btn--sm" onClick={() => { setQuery(''); choosePreset('all'); }}>Reset filters</button>
                  : <button type="button" className="mf-btn mf-btn--primary mf-btn--sm" onClick={() => setRecord({})}><FiPlus size={15} /> Record payment</button>} />
            </div>
          ) : (
            <section className="mf-card mf-card--flush">
              <div className="mf-table-wrap">
                <table className="mf-table mf-table--stack">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th className="mf-col-stamp">Date &amp; time</th>
                      <th>Receipt</th>
                      <th>Loan</th>
                      <th className="is-num">Amount (TZS)</th>
                      <th>Mode</th>
                      <th>Recorded by</th>
                      <th>Notes</th>
                      <th>Status</th>
                      <th className="is-actions" aria-label="Open loan" />
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map(r => (
                      <tr key={r.id} className={r.loan_id ? 'is-link' : ''} onClick={() => r.loan_id && navigate(`/loans/${r.loan_id}`)}>
                        <td>
                          <div className="mf-cell-main">
                            <Avatar name={r.customer_name} size={34} />
                            <span className="mf-cell-title">{r.customer_name}</span>
                          </div>
                        </td>
                        <td data-label="Date & time" className="mf-col-stamp">
                          {r.paid_at ? (
                            <span className="mf-stamp">{fmtTimestamp(r.paid_at)}</span>
                          ) : (
                            <span className="mf-cell-stack">
                              <span className="mf-stamp">{isoDate(r.payment_date)}</span>
                              <span className="mf-stamp mf-stamp--muted">time not recorded</span>
                            </span>
                          )}
                        </td>
                        <td data-label="Receipt"><span className="mf-code">{r.receipt_number}</span></td>
                        <td data-label="Loan" className="mf-num">#{r.loan_id}</td>
                        <td data-label="Amount (TZS)" className="is-num"><span className="mf-ledger-amount">{fmt(r.amount)}</span></td>
                        <td data-label="Mode">
                          <span className="mf-cell-stack">
                            <span className={`badge ${r.payment_mode === 'mobile_money' ? 'badge--orange' : 'badge--gray'}`}>{paymentModeLabel(r)}</span>
                            {Number(r.agent_fee) > 0 && <span className="mf-cell-sub">Fee TZS {money(r.agent_fee)}</span>}
                          </span>
                        </td>
                        <td data-label="Recorded by">{r.recorded_by || <span className="mf-muted">—</span>}</td>
                        <td data-label="Notes"><div className="mf-ledger-note" title={r.notes || ''}>{r.notes || '—'}</div></td>
                        <td data-label="Status"><span className="badge badge--green badge--dot">Posted</span></td>
                        <td className="is-actions" onClick={e => e.stopPropagation()}>
                          {r.loan_id && (
                            <button type="button" className="mf-btn mf-btn--ghost mf-btn--sm" onClick={() => navigate(`/loans/${r.loan_id}`)}
                              title="Open loan" aria-label={`Open loan #${r.loan_id}`}>
                              Loan <FiArrowUpRight size={15} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4}>{ledger.length} entr{ledger.length === 1 ? 'y' : 'ies'}{range.from || range.to ? ` · ${range.from || '…'} → ${range.to || '…'}` : ''}</td>
                      <td className="is-num" data-label="Total (TZS)">{fmt(ledgerTotal)}</td>
                      <td colSpan={5} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          <div className="mf-toolbar">
            <div className="mf-toolbar__group">
              <Segmented ariaLabel="Collection bucket" value={bucket} onChange={setBucket}
                options={[
                  { value: 'all',     label: 'All open',      count: bucketCounts.all },
                  { value: 'overdue', label: 'Past due',      count: bucketCounts.overdue },
                  { value: 'due7',    label: 'Due in 7 days', count: bucketCounts.due7 },
                  { value: 'later',   label: 'Later',         count: bucketCounts.later },
                ]} />
            </div>
            <div className="mf-toolbar__group">
              <SearchField value={cQuery} onChange={setCQuery} placeholder="Client, phone or #loan" />
            </div>
          </div>

          {loading ? (
            <div className="mf-card mf-card--flush"><TableSkeleton rows={7} cols={5} /></div>
          ) : queue.length === 0 ? (
            <div className="mf-card">
              <Empty Icon={FiInbox} title="Queue is clear" message={cQuery ? 'No open loans match the search.' : 'No open loans in this bucket.'} />
            </div>
          ) : (
            <section className="mf-card mf-card--flush">
              <div className="mf-table-wrap">
                <table className="mf-table mf-table--stack">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Loan</th>
                      <th className="is-num">Balance (TZS)</th>
                      <th>Repaid</th>
                      <th>Due date</th>
                      <th>Aging</th>
                      <th>Status</th>
                      <th className="is-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queue.map(({ loan: l }) => {
                      const total = Number(l.total_payable) || 0;
                      const pct = total > 0 ? Math.min(100, Math.round(((Number(l.amount_paid) || 0) / total) * 100)) : 0;
                      const plan = repaymentStatus(l);
                      return (
                        <tr key={l.id} className="is-link" onClick={() => navigate(`/loans/${l.id}`)}>
                          <td>
                            <div className="mf-cell-main">
                              <Avatar name={l.customer_name} size={36} />
                              <div className="mf-cell-stack">
                                <span className="mf-cell-title">{l.customer_name}</span>
                                <span className="mf-cell-sub">{l.customer_phone}</span>
                              </div>
                            </div>
                          </td>
                          <td data-label="Loan"><span className="mf-code">#{l.id}</span></td>
                          <td className="is-num" data-label="Balance (TZS)"><strong>{fmt0(l.balance)}</strong></td>
                          <td data-label="Repaid">
                            <div className="mf-progress-cell">
                              <ProgressBar value={pct} tone={isPastDue(l) ? 'crimson' : 'orange'} />
                              <div className="mf-progress-cell__meta"><span>{pct}%</span><span>{fmt0(l.amount_paid)}</span></div>
                              {plan && (
                                <div className="mf-progress-cell__meta">
                                  <span>{plan.covered}/{plan.count} · {frequencyLabel(plan.frequency).en}</span>
                                  {plan.arrears > 0
                                    ? <span className="mf-tone--crimson" title="Behind schedule">−{fmt0(plan.arrears)}</span>
                                    : <span>On schedule</span>}
                                </div>
                              )}
                            </div>
                          </td>
                          <td data-label="Due date" className="mf-num" style={{ whiteSpace: 'nowrap' }}>{fmtDay(l.due_date, SHORT_DATE)}</td>
                          <td data-label="Aging"><DueChip date={l.due_date} status={l.status} /></td>
                          <td data-label="Status"><StatusBadge status={l.status} /></td>
                          <td className="is-actions" onClick={e => e.stopPropagation()}>
                            <div className="mf-actions">
                              <button type="button" className="mf-btn mf-btn--primary mf-btn--sm" onClick={() => setRecord({ loanId: l.id })}>
                                <FiCreditCard size={15} /> Collect
                              </button>
                              <button type="button" className="mf-icon-btn" onClick={() => navigate(`/loans/${l.id}`)}
                                title="Open loan" aria-label={`Open loan #${l.id}`}>
                                <FiArrowUpRight size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {record && (
        <RecordPaymentModal
          loans={loans}
          initialLoanId={record.loanId}
          onClose={() => setRecord(null)}
          onRecorded={data => { showToast(`Payment ${data.receipt_number} posted`, 'success'); load(); }}
          onViewLoan={loan => { setRecord(null); navigate(`/loans/${loan.id}`); }}
        />
      )}
    </div>
  );
}
