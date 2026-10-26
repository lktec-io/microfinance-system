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
export function IndividualView({ data, showTotals, query, onOpenClient }) {
  const m = data?.metrics;
  const rows = (data?.clients || []).filter(c => {
    const q = query.trim().toLowerCase();
    return !q || [c.full_name, c.phone, c.id_number, clientCode(c.id)].some(v => String(v || '').toLowerCase().includes(q));
  });
  const show = v => (showTotals ? fmt(v) : null);
  const totals = rows.reduce((t, c) => ({
    principal: t.principal + c.principal, repaid: t.repaid + c.repaid, outstanding: t.outstanding + c.outstanding,
  }), { principal: 0, repaid: 0, outstanding: 0 });

  return (
    <>
      <section className="mf-kpi" aria-label="Individual lending metrics">
        <Kpi label="Individual capital disbursed" Icon={FiTrendingUp} value={show(m?.capital_disbursed)}
          meta={`${m?.loans || 0} loans · ${fmt0(m?.outstanding || 0)} outstanding`} />
        <Kpi label="Active single borrowers" Icon={FiUser} value={fmt0(m?.active_borrowers || 0)} money={false}
          meta={`${(data?.clients || []).length} clients on file`} />
        <Kpi label="Monthly repayment rate" Icon={FiPercent}
          value={showTotals ? <>{m?.repayment_rate ?? 0}<small>%</small></> : null} money={false}
          bar={m?.repayment_rate ?? 0}
          tone={(m?.repayment_rate ?? 0) >= 80 ? 'good' : undefined}
          meta={showTotals
            ? `collected ${fmt0(m?.collected_this_month || 0)} of ${fmt0(m?.expected_this_month || 0)} scheduled`
            : 'this month against schedule'} />
        <Kpi label="PAR 30 · non-performing" Icon={FiAlertTriangle}
          value={showTotals ? <>{m?.par30_pct ?? 0}<small>%</small></> : null} money={false}
          bar={m?.par30_pct ?? 0} tone="risk"
          meta={showTotals ? `${fmt0(m?.par30_balance || 0)} over 30 days past due` : 'over 30 days past due'} />
      </section>

      <section className="mf-dl-card" aria-label="Individual client ledger">
        <header className="mf-dl-card__head">
          <h2 className="mf-dl-card__title"><FiBookOpen size={14} /> Individual client ledger</h2>
          <span className="mf-dl-card__note">{rows.length} of {(data?.clients || []).length} clients</span>
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

export function GroupView({ data, showTotals, query }) {
  const m = data?.metrics;
  const [open, setOpen] = useState(null);
  const [members, setMembers] = useState({});

  const groups = (data?.groups || []).filter(g => {
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

  const show = v => (showTotals ? fmt(v) : null);

  return (
    <>
      <section className="mf-kpi" aria-label="Group lending metrics">
        <Kpi label="Groups registered" Icon={FiUsers} value={fmt0(m?.groups_registered || 0)} money={false}
          meta={`${m?.members || 0} members on file`} />
        <Kpi label="Active group portfolio" Icon={FiLayers} value={show(m?.active_portfolio)}
          meta={`${m?.active_loans || 0} of ${m?.loans || 0} group loans open`} />
        <Kpi label="Group capital disbursed" Icon={FiTrendingUp} value={show(m?.capital_disbursed)}
          meta={showTotals ? `${fmt0(m?.total_repaid || 0)} recovered` : 'principal advanced to groups'} />
        <Kpi label="Accrued liabilities · 5% refundable" Icon={FiGift} value={show(m?.liability_accrued)} tone="risk"
          meta={showTotals
            ? `${fmt0(m?.liability_earned || 0)} earned · ${fmt0(m?.liability_paid || 0)} paid out`
            : `${m?.allocations || 0} member allocations`} />
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
export function ExecutiveView({ statement, showTotals, onVoucher }) {
  const cash = statement.cash || {};
  const p = statement.portfolio;
  const baki = cash.net_system_balance ?? 0;
  const positive = baki >= 0;
  const show = v => (showTotals ? fmt(v) : null);

  return (
    <div className="mf-score">
      {/* Tier 1 — what went out against what came back */}
      <section className="mf-score__row" aria-label="Portfolio flow">
        <div className="mf-score__cell mf-score__cell--out">
          <span className="mf-score__tier">Tier 1 · outbound</span>
          <span className="mf-score__label">Gross outbound portfolio</span>
          <span className="mf-score__value">
            {showTotals ? <><small>TZS</small>{fmt(cash.gross_outbound)}</> : <Mask />}
          </span>
          <span className="mf-score__meta">{p.loans} loans advanced</span>
        </div>
        <div className="mf-score__cell mf-score__cell--in">
          <span className="mf-score__tier">Tier 1 · recovered</span>
          <span className="mf-score__label">Gross recovered funds</span>
          <span className="mf-score__value">
            {showTotals ? <><small>TZS</small>{fmt(cash.gross_recovered)}</> : <Mask />}
          </span>
          <span className="mf-score__meta">
            {showTotals ? `${fmt0(p.outstanding)} still outstanding` : `${p.active_loans} loans open`}
          </span>
        </div>
      </section>

      {/* Tier 2 — immediate revenue */}
      <section className="mf-score__row" aria-label="Immediate revenue">
        <div className="mf-score__cell mf-score__cell--rev">
          <span className="mf-score__tier">Tier 2 · revenue</span>
          <span className="mf-score__label">Total immediate revenue · 10% processing form fees</span>
          <span className="mf-score__value">
            {showTotals ? <><small>TZS</small>{fmt(cash.immediate_revenue)}</> : <Mask />}
          </span>
          <span className="mf-score__meta">collected upfront across every category</span>
        </div>
        <div className="mf-score__cell">
          <span className="mf-score__tier">Tier 2 · outgoings</span>
          <span className="mf-score__label">Operating expenses</span>
          <span className="mf-score__value">
            {showTotals ? <><small>TZS</small>{fmt(cash.operating_expenses)}</> : <Mask />}
          </span>
          <span className="mf-score__meta">{statement.income.expense_count} records</span>
        </div>
      </section>

      {/* Tier 3 — BAKI */}
      <section className={`mf-score__baki ${positive ? 'is-positive' : 'is-negative'}`} aria-label="Net system balance">
        <span className="mf-score__baki-label">
          Tier 3 · net system balance
          <b>BAKI</b>
        </span>
        <span className="mf-score__baki-value">
          {showTotals ? <><small>TZS</small>{fmt(baki)}</> : <Mask />}
          {showTotals && (positive ? <FiTrendingUp size={22} /> : <FiTrendingDown size={22} />)}
        </span>
        <span className="mf-score__baki-note">
          recovered + fees − disbursed − expenses · {positive ? 'surplus in the system' : 'capital still out in the field'}
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
    setState(s => ({ status: s.data ? 'ready' : 'loading', data: s.data }));
    try {
      const params = {};
      if (range.from) params.from = range.from;
      if (range.to) params.to = range.to;
      const { data } = await api.get('/reports/ledger', { params });
      setState({ status: 'ready', data });
    } catch {
      setState({ status: 'error', data: null });
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
                  <FiAlertCircle size={15} /> The ledger could not be loaded.
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
