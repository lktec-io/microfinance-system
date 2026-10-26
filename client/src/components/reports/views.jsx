import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUser, FiUsers, FiTrendingUp, FiTrendingDown, FiPercent, FiAlertTriangle, FiBookOpen,
  FiChevronRight, FiRefreshCw, FiAlertCircle, FiGift, FiCheckCircle, FiFileText, FiLayers,
} from 'react-icons/fi';
import api from '../../api';
import { Mask } from '../common/MoneyGuard';
import { TableSkeleton, Empty } from '../ui';
import { fmt, fmt0, fmtDay } from '../../utils/format';

/*
 * The three reporting views.
 *
 * Input-free by design: every figure is read from /api/reports/* and rendered
 * as a tabular-monospace ledger. Money passes through the RBAC mask, so a
 * restricted session never has the number in the DOM.
 */

const SHORT = { day: '2-digit', month: 'short' };
const clientCode = id => `CL-${String(id ?? 0).padStart(5, '0')}`;
const n = v => Number(v || 0);
const round = v => Math.round(n(v) * 100) / 100;
const share = (part, whole) => (n(whole) > 0 ? Math.round((n(part) / n(whole)) * 1000) / 10 : 0);

/*
 * The directory endpoints return { metrics, rows }. An older build of the API
 * returned the bare list instead, and a degraded response carries the shape
 * with zeros — so read the list defensively rather than trusting one shape.
 * Without this, `data.clients` is undefined against an out-of-date server and
 * every figure on the page silently reads zero.
 */
function listOf(data, key) {
  if (Array.isArray(data)) return data;
  const rows = data?.[key];
  return Array.isArray(rows) ? rows : [];
}

/* Totals computed from the rows we did receive, so the KPIs are never a lie
   of omission when the server could not send its own aggregates. */
function deriveIndividualMetrics(clients) {
  const t = clients.reduce((a, c) => ({
    capital_disbursed: a.capital_disbursed + n(c.principal),
    outstanding: a.outstanding + n(c.outstanding),
    total_repaid: a.total_repaid + n(c.repaid),
    loans: a.loans + n(c.loans),
    active_borrowers: a.active_borrowers + (n(c.active_loans) > 0 ? 1 : 0),
  }), { capital_disbursed: 0, outstanding: 0, total_repaid: 0, loans: 0, active_borrowers: 0 });
  return {
    ...t,
    capital_disbursed: round(t.capital_disbursed),
    outstanding: round(t.outstanding),
    total_repaid: round(t.total_repaid),
    /* these need history the row payload does not carry */
    collected_this_month: null,
    expected_this_month: null,
    repayment_rate: null,
    par30_balance: null,
    par30_pct: null,
  };
}

function deriveGroupMetrics(groups) {
  const t = groups.reduce((a, g) => ({
    groups_registered: a.groups_registered + 1,
    members: a.members + n(g.members),
    capital_disbursed: a.capital_disbursed + n(g.principal),
    active_portfolio: a.active_portfolio + n(g.outstanding),
    total_repaid: a.total_repaid + n(g.repaid),
    fees: a.fees + n(g.fees),
    loans: a.loans + n(g.loans),
  }), {
    groups_registered: 0, members: 0, capital_disbursed: 0,
    active_portfolio: 0, total_repaid: 0, fees: 0, loans: 0,
  });
  return {
    ...t,
    capital_disbursed: round(t.capital_disbursed),
    active_portfolio: round(t.active_portfolio),
    total_repaid: round(t.total_repaid),
    fees: round(t.fees),
    active_loans: null,
    liability_accrued: null,
    liability_earned: null,
    liability_paid: null,
    allocations: null,
  };
}

/**
 * Says plainly why a figure is missing. A reporting screen that renders a
 * failed query as "TZS 0" is worse than one that renders nothing, so the
 * views announce the gap instead of letting a zero pass as a balance.
 */
/* "not supplied" — visually distinct from the RBAC mask, which means "hidden" */
const NA = <span className="mf-kpi__na" title="Not supplied by the reporting service">n/a</span>;

function DataNotice({ degraded, derived, onRetry }) {
  if (!degraded && !derived) return null;
  return (
    <div className="mf-alert mf-alert--warning mf-rep-notice" role="status">
      <FiAlertCircle size={15} />
      <span>
        {degraded
          ? 'The reporting service could not read the ledger, so these figures are not current.'
          : 'This server is running an older reporting API: totals below are summed from the rows on screen, and the rate and PAR figures are unavailable until it is restarted.'}
      </span>
      {onRetry && (
        <button type="button" className="mf-btn mf-btn--sm mf-alert__action" onClick={onRetry}>Retry</button>
      )}
    </div>
  );
}

function Kpi({ label, Icon, value, meta, money = true, bar, tone }) {
  return (
    <div className={`mf-kpi__cell${tone ? ` mf-kpi__cell--${tone}` : ''}`}>
      <span className="mf-kpi__label">{Icon && <Icon size={12} />}{label}</span>
      <span className="mf-kpi__value">
        {value === null ? <Mask /> : money ? <><small>TZS</small>{value}</> : value}
      </span>
      {bar != null && (
        <div className={`mf-kpi__bar${tone === 'risk' ? ' is-risk' : tone === 'good' ? ' is-good' : ''}`}>
          <span style={{ width: `${Math.min(100, Math.max(0, bar))}%` }} />
        </div>
      )}
      {meta && <span className="mf-kpi__meta">{meta}</span>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   VIEW 1 · Individual loans directory
   ════════════════════════════════════════════════════════════════════ */
export function IndividualView({ data, showTotals, query, onOpenClient, onRetry }) {
  const clients = listOf(data, 'clients');
  const derived = !data?.metrics && clients.length > 0;
  const m = data?.metrics || deriveIndividualMetrics(clients);
  const rows = clients.filter(c => {
    const q = query.trim().toLowerCase();
    return !q || [c.full_name, c.phone, c.id_number, clientCode(c.id)].some(v => String(v || '').toLowerCase().includes(q));
  });
  /* null means the server could not supply it — never render that as zero */
  const show = v => (!showTotals ? null : v == null ? NA : fmt(v));
  const pctValue = v => (!showTotals ? null : v == null ? NA : <>{v}<small>%</small></>);
  const totals = rows.reduce((t, c) => ({
    principal: t.principal + n(c.principal), repaid: t.repaid + n(c.repaid), outstanding: t.outstanding + n(c.outstanding),
  }), { principal: 0, repaid: 0, outstanding: 0 });

  return (
    <>
      <DataNotice degraded={data?.degraded} derived={derived} onRetry={onRetry} />
      <section className="mf-kpi" aria-label="Individual lending metrics">
        <Kpi label="Individual capital disbursed" Icon={FiTrendingUp} value={show(m.capital_disbursed)}
          meta={`${n(m.loans)} loans · ${fmt0(n(m.outstanding))} outstanding`} />
        <Kpi label="Active single borrowers" Icon={FiUser} value={fmt0(n(m.active_borrowers))} money={false}
          meta={`${clients.length} clients on file`} />
        <Kpi label="Monthly repayment rate" Icon={FiPercent}
          value={pctValue(m.repayment_rate)} money={false}
          bar={m.repayment_rate ?? 0}
          tone={n(m.repayment_rate) >= 80 ? 'good' : undefined}
          meta={!showTotals ? 'this month against schedule'
            : m.collected_this_month == null ? 'unavailable from this server'
              : `collected ${fmt0(n(m.collected_this_month))} of ${fmt0(n(m.expected_this_month))} scheduled`} />
        <Kpi label="PAR 30 · non-performing" Icon={FiAlertTriangle}
          value={pctValue(m.par30_pct)} money={false}
          bar={m.par30_pct ?? 0} tone="risk"
          meta={!showTotals ? 'over 30 days past due'
            : m.par30_balance == null ? 'unavailable from this server'
              : `${fmt0(n(m.par30_balance))} over 30 days past due`} />
      </section>

      <section className="mf-dl-card" aria-label="Individual client ledger">
        <header className="mf-dl-card__head">
          <h2 className="mf-dl-card__title"><FiBookOpen size={14} /> Individual client ledger</h2>
          <span className="mf-dl-card__note">{rows.length} of {clients.length} clients</span>
        </header>
        {rows.length === 0 ? (
          <Empty Icon={FiUser} title="No individual clients" message="Clients with loans appear here." />
        ) : (
          <div className="mf-grid__scroll">
            <table className="mf-grid">
              <thead>
                <tr>
                  <th scope="col">Client ID / name</th>
                  <th scope="col" className="is-fig">Loans</th>
                  <th scope="col" className="is-fig">Disbursed (TZS)</th>
                  <th scope="col" className="is-fig">Total repaid (TZS)</th>
                  <th scope="col" className="is-fig">Outstanding (TZS)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(c => (
                  <tr key={c.id} onClick={() => onOpenClient?.(c)} style={{ cursor: onOpenClient ? 'pointer' : undefined }}>
                    <td>
                      <span className="mf-grid__who">
                        <b>{c.full_name}</b>
                        <span>{clientCode(c.id)} · {c.phone || '—'}</span>
                      </span>
                    </td>
                    <td className="is-fig">{c.loans}</td>
                    <td className="is-fig">{showTotals ? fmt(c.principal) : <Mask />}</td>
                    <td className="is-fig">{showTotals ? fmt(c.repaid) : <Mask />}</td>
                    <td className={`is-fig is-strong${c.outstanding > 0 ? '' : ' is-credit'}`}>
                      {showTotals ? fmt(c.outstanding) : <Mask />}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Directory total</td>
                  <td className="is-fig">{rows.reduce((t, c) => t + c.loans, 0)}</td>
                  <td className="is-fig">{showTotals ? fmt(totals.principal) : '•••••'}</td>
                  <td className="is-fig">{showTotals ? fmt(totals.repaid) : '•••••'}</td>
                  <td className="is-fig">{showTotals ? fmt(totals.outstanding) : '•••••'}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════
   VIEW 2 · Group lending performance, with the member drill-down
   ════════════════════════════════════════════════════════════════════ */
const BONUS_LABEL = {
  eligible: 'Qualified',
  paid: 'Refunded',
  forfeited: 'Forfeited',
  pending: 'In progress',
};

export function GroupView({ data, showTotals, query, onRetry }) {
  const all = listOf(data, 'groups');
  const derived = !data?.metrics && all.length > 0;
  const m = data?.metrics || deriveGroupMetrics(all);
  const [open, setOpen] = useState(null);
  const [members, setMembers] = useState({});

  const groups = all.filter(g => {
    const q = query.trim().toLowerCase();
    return !q || [g.group_name, g.market_name, g.leader_name].some(v => String(v || '').toLowerCase().includes(q));
  });

  const toggle = useCallback(async g => {
    if (open === g.id) { setOpen(null); return; }
    setOpen(g.id);
    if (members[g.id]) return;
    try {
      const { data: rows } = await api.get(`/reports/groups/${g.id}/members`);
      setMembers(prev => ({ ...prev, [g.id]: Array.isArray(rows) ? rows : [] }));
    } catch {
      setMembers(prev => ({ ...prev, [g.id]: [] }));
    }
  }, [open, members]);

  const show = v => (!showTotals ? null : v == null ? NA : fmt(v));

  return (
    <>
      <DataNotice degraded={data?.degraded} derived={derived} onRetry={onRetry} />
      <section className="mf-kpi" aria-label="Group lending metrics">
        <Kpi label="Groups registered" Icon={FiUsers} value={fmt0(n(m.groups_registered))} money={false}
          meta={`${n(m.members)} members on file`} />
        <Kpi label="Active group portfolio" Icon={FiLayers} value={show(m.active_portfolio)}
          meta={m.active_loans == null
            ? `${n(m.loans)} group loans on file`
            : `${n(m.active_loans)} of ${n(m.loans)} group loans open`} />
        <Kpi label="Group capital disbursed" Icon={FiTrendingUp} value={show(m.capital_disbursed)}
          meta={showTotals ? `${fmt0(n(m.total_repaid))} recovered` : 'principal advanced to groups'} />
        <Kpi label="Accrued liabilities · 5% refundable" Icon={FiGift} value={show(m.liability_accrued)} tone="risk"
          meta={!showTotals ? `${n(m.allocations)} member allocations`
            : m.liability_earned == null ? 'unavailable from this server'
              : `${fmt0(n(m.liability_earned))} earned · ${fmt0(n(m.liability_paid))} paid out`} />
      </section>

      <section className="mf-dl-card" aria-label="Group performance">
        <header className="mf-dl-card__head">
          <h2 className="mf-dl-card__title"><FiUsers size={14} /> Group performance</h2>
          <span className="mf-dl-card__note">open a group to drill into its members</span>
        </header>

        {groups.length === 0 ? (
          <Empty Icon={FiUsers} title="No groups" message="Registered lending groups appear here." />
        ) : groups.map(g => {
          const isOpen = open === g.id;
          const rows = members[g.id];
          return (
            <div key={g.id}>
              <button type="button" className={`mf-master__row${isOpen ? ' is-open' : ''}`}
                onClick={() => toggle(g)} aria-expanded={isOpen}>
                <span className="mf-master__chev" aria-hidden="true"><FiChevronRight size={15} /></span>
                <span className="mf-grid__who">
                  <span className="mf-master__name">{g.group_name}</span>
                  <span className="mf-master__meta">
                    {g.members} members · {g.market_name}{g.leader_name ? ` · leader ${g.leader_name}` : ''}
                  </span>
                </span>
                <span className="mf-master__figs" style={{ display: 'contents' }}>
                  <span className="mf-master__fig"><i>Loans</i><b>{g.loans}</b></span>
                  <span className="mf-master__fig"><i>Disbursed</i><b>{showTotals ? fmt0(g.principal) : '•••••'}</b></span>
                  <span className="mf-master__fig"><i>Repaid</i><b>{showTotals ? fmt0(g.repaid) : '•••••'}</b></span>
                  <span className="mf-master__fig"><i>Outstanding</i><b>{showTotals ? fmt0(g.outstanding) : '•••••'}</b></span>
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    className="mf-master__detail"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: .28, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="mf-master__detail-inner">
                      <div className="mf-master__detail-label">Members of {g.group_name}</div>
                      {rows === undefined ? (
                        <TableSkeleton rows={3} cols={6} />
                      ) : rows.length === 0 ? (
                        <Empty Icon={FiUsers} title="No member allocations"
                          message="This group has no agreed member shares yet, so repayments are recorded for the group as a whole." />
                      ) : (
                        <table className="mf-grid">
                          <thead>
                            <tr>
                              <th scope="col">Member</th>
                              <th scope="col" className="is-fig">Allocated share (TZS)</th>
                              <th scope="col" className="is-fig">Repaid to date (TZS)</th>
                              <th scope="col" className="is-fig">10% fee paid (TZS)</th>
                              <th scope="col" className="is-fig">5% bonus (TZS)</th>
                              <th scope="col">Qualification</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map(mem => {
                              const status = mem.bonus_status || 'pending';
                              return (
                                <tr key={mem.id}>
                                  <td>
                                    <span className="mf-grid__who">
                                      <b>{mem.full_name}</b>
                                      <span>{mem.phone_number} · {mem.payments} payment{mem.payments === 1 ? '' : 's'}</span>
                                    </span>
                                  </td>
                                  <td className="is-fig">{showTotals ? fmt(mem.target) : <Mask />}</td>
                                  <td className="is-fig">{showTotals ? fmt(mem.paid) : <Mask />}</td>
                                  <td className="is-fig">{showTotals ? fmt(mem.fee_share) : <Mask />}</td>
                                  <td className="is-fig">{showTotals ? fmt(mem.refund_total) : <Mask />}</td>
                                  <td>
                                    <span className={`mf-bonus is-${status}`}>
                                      {mem.qualified && <FiCheckCircle size={10} />}
                                      {BONUS_LABEL[status] || status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
        <p className="mf-rep-note">
          A member qualifies for the 5% refundable bonus by clearing their allocated share on or before the loan due date.
          The 10% fee column is that member&apos;s share of the processing fee the loan paid upfront.
        </p>
      </section>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════
   VIEW 3 · The grand executive financial sheet
   ════════════════════════════════════════════════════════════════════ */
export function ExecutiveView({ statement, showTotals, onVoucher, onRetry }) {
  /*
   * Every branch here is read defensively. A statement that arrives without
   * `portfolio` or `income` — an older API, or a degraded response — used to
   * throw on `p.loans` and take the whole terminal down with a blank screen.
   */
  const p = statement?.portfolio || {};
  const income = statement?.income || {};
  const cash = statement?.cash || null;
  /* BAKI is only meaningful if the server computed the cash block; otherwise
     fall back to the income identity rather than asserting a balance of 0. */
  const baki = cash?.net_system_balance ?? (
    statement?.portfolio
      ? round(n(p.total_repaid) + n(income.processing_fees) - n(p.principal_disbursed) - n(income.expenses))
      : null
  );
  const positive = n(baki) >= 0;
  const flow = {
    gross_outbound: cash?.gross_outbound ?? p.principal_disbursed,
    gross_recovered: cash?.gross_recovered ?? p.total_repaid,
    immediate_revenue: cash?.immediate_revenue ?? income.processing_fees,
    operating_expenses: cash?.operating_expenses ?? income.expenses,
  };
  const show = v => (!showTotals ? null : v == null ? NA : fmt(v));

  if (!statement?.portfolio && !cash) {
    return (
      <div className="mf-alert mf-alert--error" role="alert">
        <FiAlertCircle size={15} /> The executive sheet is unavailable — the reporting service returned no figures.
        {onRetry && (
          <button type="button" className="mf-btn mf-btn--sm mf-alert__action" onClick={onRetry}>Retry</button>
        )}
      </div>
    );
  }

  return (
    <div className="mf-score">
      <DataNotice degraded={statement?.degraded} derived={!cash} onRetry={onRetry} />
      {/* Tier 1 — what went out against what came back */}
      <section className="mf-score__row" aria-label="Portfolio flow">
        <div className="mf-score__cell mf-score__cell--out">
          <span className="mf-score__tier">Tier 1 · outbound</span>
          <span className="mf-score__label">Gross outbound portfolio</span>
          <span className="mf-score__value">
            {showTotals ? <><small>TZS</small>{show(flow.gross_outbound)}</> : <Mask />}
          </span>
          <span className="mf-score__meta">{n(p.loans)} loans advanced</span>
        </div>
        <div className="mf-score__cell mf-score__cell--in">
          <span className="mf-score__tier">Tier 1 · recovered</span>
          <span className="mf-score__label">Gross recovered funds</span>
          <span className="mf-score__value">
            {showTotals ? <><small>TZS</small>{show(flow.gross_recovered)}</> : <Mask />}
          </span>
          <span className="mf-score__meta">
            {showTotals ? `${fmt0(n(p.outstanding))} still outstanding` : `${n(p.active_loans)} loans open`}
          </span>
        </div>
      </section>

      {/* Tier 2 — immediate revenue */}
      <section className="mf-score__row" aria-label="Immediate revenue">
        <div className="mf-score__cell mf-score__cell--rev">
          <span className="mf-score__tier">Tier 2 · revenue</span>
          <span className="mf-score__label">Total immediate revenue · 10% processing form fees</span>
          <span className="mf-score__value">
            {showTotals ? <><small>TZS</small>{show(flow.immediate_revenue)}</> : <Mask />}
          </span>
          <span className="mf-score__meta">collected upfront across every category</span>
        </div>
        <div className="mf-score__cell">
          <span className="mf-score__tier">Tier 2 · outgoings</span>
          <span className="mf-score__label">Operating expenses</span>
          <span className="mf-score__value">
            {showTotals ? <><small>TZS</small>{show(flow.operating_expenses)}</> : <Mask />}
          </span>
          <span className="mf-score__meta">{n(income.expense_count)} records</span>
        </div>
      </section>

      {/* Tier 3 — BAKI */}
      <section className={`mf-score__baki ${baki == null ? '' : positive ? 'is-positive' : 'is-negative'}`}
        aria-label="Net system balance">
        <span className="mf-score__baki-label">
          Tier 3 · net system balance
          <b>BAKI</b>
        </span>
        <span className="mf-score__baki-value">
          {showTotals ? <><small>TZS</small>{show(baki)}</> : <Mask />}
          {showTotals && baki != null && (positive ? <FiTrendingUp size={22} /> : <FiTrendingDown size={22} />)}
        </span>
        <span className="mf-score__baki-note">
          recovered + fees − disbursed − expenses
          {baki == null ? '' : ` · ${positive ? 'surplus in the system' : 'capital still out in the field'}`}
        </span>
      </section>

      <LedgerPanel showTotals={showTotals} onVoucher={onVoucher} />
    </div>
  );
}

/* ── The debit/credit ledger, folded away under the scorecard ──────── */
export function LedgerPanel({ showTotals, onVoucher }) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState({ from: '', to: '' });
  const [state, setState] = useState({ status: 'idle', data: null });

  const load = useCallback(async () => {
    setState({ status: 'loading', data: null });
    try {
      const params = {};
      if (range.from) params.from = range.from;
      if (range.to) params.to = range.to;
      const { data } = await api.get('/reports/ledger', { params });
      /* An empty window is a valid answer; a payload without `entries` is not */
      setState({ status: 'ready', data: { ...data, entries: Array.isArray(data?.entries) ? data.entries : [] } });
    } catch (err) {
      /*
       * 404 means this build of the API has no ledger route — the server is
       * running an older release. Saying so beats "could not be loaded",
       * which sends the operator looking for a data problem that isn't there.
       */
      const code = err?.response?.status;
      setState({
        status: 'error',
        data: null,
        reason: code === 404
          ? 'This server has no ledger endpoint yet — it is running an older build of the reporting API and needs to be restarted on the current release.'
          : code === 403
            ? 'Your account is not permitted to view the transaction ledger.'
            : err?.response?.data?.error || 'The ledger could not be loaded.',
      });
    }
  }, [range.from, range.to]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const money = v => (showTotals ? fmt(v) : '•••••');
  const d = state.data;

  return (
    <section className={`mf-fold${open ? ' is-open' : ''}`} aria-label="Transaction ledger">
      <button type="button" className="mf-fold__toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <FiChevronRight size={15} />
        <FiBookOpen size={14} /> Transaction ledger · inflow / outflow
        <span className="mf-fold__count">{d ? `${d.count} entries` : 'open to load'}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: .28, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="mf-fold__body">
              <DataNotice degraded={d?.degraded} onRetry={load} />
              <div className="mf-ledger__bar no-print">
                <div className="mf-ledger__range">
                  <label htmlFor="led-from">From</label>
                  <input id="led-from" type="date" value={range.from}
                    onChange={e => setRange(r => ({ ...r, from: e.target.value }))} />
                  <label htmlFor="led-to">To</label>
                  <input id="led-to" type="date" value={range.to}
                    onChange={e => setRange(r => ({ ...r, to: e.target.value }))} />
                  {(range.from || range.to) && (
                    <button type="button" className="mf-link-btn" onClick={() => setRange({ from: '', to: '' })}>Clear</button>
                  )}
                  <button type="button" className="mf-link-btn" onClick={load}><FiRefreshCw size={12} /> Refresh</button>
                </div>
                {d && (
                  <div className="mf-ledger__totals">
                    <span>Opening <b>{money(d.opening_balance)}</b></span>
                    <span className="is-credit">Inflow <b>{money(d.total_inflow)}</b></span>
                    <span className="is-debit">Outflow <b>{money(d.total_outflow)}</b></span>
                    <span>Closing <b>{money(d.closing_balance)}</b></span>
                  </div>
                )}
              </div>

              {state.status === 'loading' ? (
                <TableSkeleton rows={5} cols={7} />
              ) : state.status === 'error' ? (
                <div className="mf-alert mf-alert--error" role="alert">
                  <FiAlertCircle size={15} /> {state.reason || 'The ledger could not be loaded.'}
                  <button type="button" className="mf-btn mf-btn--sm mf-alert__action" onClick={load}>Retry</button>
                </div>
              ) : !d || d.entries.length === 0 ? (
                <Empty Icon={FiFileText} title="No entries in this window"
                  message="Widen the date range to see posted repayments and disbursements." />
              ) : (
                <div className="mf-grid__scroll">
                  <table className="mf-grid">
                    <thead>
                      <tr>
                        <th scope="col">Date</th>
                        <th scope="col">Entity / client</th>
                        <th scope="col">Reference</th>
                        <th scope="col">Account</th>
                        <th scope="col" className="is-fig">Inflow (+)</th>
                        <th scope="col" className="is-fig">Outflow (−)</th>
                        <th scope="col" className="is-fig">Balance</th>
                        <th scope="col" className="no-print" aria-label="Voucher" />
                      </tr>
                    </thead>
                    <tbody>
                      {d.entries.map(e => (
                        <tr key={e.id}>
                          <td className="mf-grid__id">{fmtDay(e.date, SHORT)}</td>
                          <td>
                            <span className="mf-grid__who">
                              <b>{e.entity}</b>
                              <span>{e.kind === 'repayment' ? 'Repayment received' : 'Principal disbursed'}</span>
                            </span>
                          </td>
                          <td className="mf-grid__id">{e.reference}</td>
                          <td><span className={`mf-ledger__type is-${e.account_type}`}>{e.account_type}</span></td>
                          <td className={`is-fig${e.inflow ? ' is-credit' : ''}`}>{e.inflow ? money(e.inflow) : '—'}</td>
                          <td className={`is-fig${e.outflow ? ' is-debit' : ''}`}>{e.outflow ? money(e.outflow) : '—'}</td>
                          <td className="is-fig is-strong">{money(e.balance)}</td>
                          <td className="no-print">
                            <button type="button" className="mf-ledger__voucher" onClick={() => onVoucher(e)}
                              title={`Download the ticket for ${e.reference}`}>Ticket</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={4}>Window totals</td>
                        <td className="is-fig">{money(d.total_inflow)}</td>
                        <td className="is-fig">{money(d.total_outflow)}</td>
                        <td className="is-fig">{money(d.closing_balance)}</td>
                        <td className="no-print" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
