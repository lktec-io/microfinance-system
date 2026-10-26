import { useCallback, useEffect, useState } from 'react';
import {
  FiLayers, FiAlertTriangle, FiTrendingUp, FiBookOpen, FiFileText, FiRefreshCw, FiAlertCircle,
} from 'react-icons/fi';
import api from '../../api';
import { Mask } from '../common/MoneyGuard';
import { TableSkeleton, Empty } from '../ui';
import { fmt, fmt0, fmtDay } from '../../utils/format';

/*
 * The three accounting tiers of the executive terminal.
 *
 * Tier 1 — balance sheet readouts (outbound, liabilities, portfolio at risk)
 * Tier 2 — income statement matrix, fees and interest by sector
 * Tier 3 — the debit/credit transaction ledger with a running balance
 *
 * Every figure comes from /api/reports/*; money is masked for restricted roles.
 */

const SHORT = { day: '2-digit', month: 'short' };

function Fig({ value, show, count }) {
  if (!show) return <Mask />;
  return count ? <>{fmt0(value)}</> : <><small>TZS</small>{fmt(value)}</>;
}

/* ── Tier 1 ──────────────────────────────────────────────────────────── */
export function BalanceSheetTier({ statement, showTotals }) {
  const p = statement.portfolio;
  const liabilities = statement.liabilities || {};
  const par = p.par_pct ?? 0;
  const healthy = par < 10;

  return (
    <section className="mf-tier" aria-label="Balance sheet">
      <header className="mf-tier__head">
        <span className="mf-tier__label"><FiLayers size={13} /> Tier 1 <span>·</span> Balance sheet</span>
        <span className="mf-tier__note">as at {fmtDay(statement.generated_at, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      </header>
      <div className="mf-bs">
        <div className="mf-bs__cell">
          <span className="mf-bs__label">Total portfolio outbound</span>
          <span className="mf-bs__value"><Fig value={p.principal_disbursed} show={showTotals} /></span>
          <span className="mf-bs__meta">
            {p.loans} loans · principal disbursed
            {showTotals && (
              <>
                <br />individual {fmt(p.individual_principal)} · group {fmt(p.group_principal)}
              </>
            )}
          </span>
        </div>

        <div className="mf-bs__cell">
          <span className="mf-bs__label">Gross portfolio outstanding</span>
          <span className="mf-bs__value"><Fig value={p.outstanding} show={showTotals} /></span>
          <span className="mf-bs__meta">{p.active_loans} active · {p.closed_loans} closed</span>
        </div>

        <div className="mf-bs__cell mf-bs__cell--liability">
          <span className="mf-bs__label">Total liabilities · 5% refundable</span>
          <span className="mf-bs__value"><Fig value={liabilities.refundable_accrued || 0} show={showTotals} /></span>
          <span className="mf-bs__meta">
            {liabilities.allocations || 0} member allocations · accrued, not yet paid
          </span>
        </div>

        <div className="mf-bs__cell mf-bs__cell--risk">
          <span className="mf-bs__label">Portfolio at risk (PAR)</span>
          <span className="mf-bs__value">{showTotals ? <>{par}<small>%</small></> : <Mask />}</span>
          <div className={`mf-bs__gauge${healthy ? ' is-healthy' : ''}`}>
            <span style={{ width: `${Math.min(100, Math.max(0, par))}%` }} />
          </div>
          <span className="mf-bs__meta">
            {showTotals ? <>TZS {fmt(p.par_balance || 0)} past due · PAR30 {p.par30_pct ?? 0}%</> : <>{p.par_loans || 0} loans past due</>}
          </span>
        </div>
      </div>
    </section>
  );
}

/* ── Tier 2 ──────────────────────────────────────────────────────────── */
export function IncomeMatrixTier({ statement, showTotals }) {
  const s = statement.sectors || { individual: {}, group: {} };
  const inc = statement.income;
  const cell = v => (showTotals ? fmt(v || 0) : '•••••');

  const rows = [
    ['10% processing form fees', s.individual.fees, s.group.fees, inc.processing_fees],
    ['Interest income earned', s.individual.interest, s.group.interest, inc.interest_recognised],
  ];

  return (
    <section className="mf-tier" aria-label="Income statement">
      <header className="mf-tier__head">
        <span className="mf-tier__label"><FiTrendingUp size={13} /> Tier 2 <span>·</span> Income statement</span>
        <span className="mf-tier__note">accrued revenue by sector</span>
      </header>
      <table className="mf-matrix">
        <thead>
          <tr>
            <th scope="col">Revenue line</th>
            <th scope="col">Individual</th>
            <th scope="col">Group</th>
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, ind, grp, total]) => (
            <tr key={label}>
              <td>{label}</td>
              <td className="is-fig">{cell(ind)}</td>
              <td className="is-fig">{cell(grp)}</td>
              <td className="is-fig">{cell(total)}</td>
            </tr>
          ))}
          <tr className="is-total">
            <td>Accrued revenue</td>
            <td className="is-fig">{cell(s.individual.revenue)}</td>
            <td className="is-fig">{cell(s.group.revenue)}</td>
            <td className="is-fig">{cell(inc.revenue)}</td>
          </tr>
          <tr>
            <td>Operating expenses ({inc.expense_count})</td>
            <td className="is-fig">—</td>
            <td className="is-fig">—</td>
            <td className="is-fig">({cell(inc.expenses)})</td>
          </tr>
          <tr className="is-total">
            <td>Net revenue</td>
            <td className="is-fig">—</td>
            <td className="is-fig">—</td>
            <td className="is-fig">{cell(inc.net)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mf-matrix__hint">
        Interest is recognised pro-rata on money actually collected; processing fees are recognised in the month the
        loan was booked. Sector columns reconcile to the total.
      </p>
    </section>
  );
}

/* ── Tier 3 ──────────────────────────────────────────────────────────── */
export function LedgerTier({ showTotals, onVoucher }) {
  const [range, setRange] = useState({ from: '', to: '' });
  const [state, setState] = useState({ status: 'loading', data: null });

  const load = useCallback(async (r = range) => {
    setState(s => ({ status: s.data ? 'ready' : 'loading', data: s.data }));
    try {
      const params = {};
      if (r.from) params.from = r.from;
      if (r.to) params.to = r.to;
      const { data } = await api.get('/reports/ledger', { params });
      setState({ status: 'ready', data });
    } catch {
      setState({ status: 'error', data: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to]);

  useEffect(() => { load(); }, [load]);

  const money = v => (showTotals ? fmt(v) : '•••••');
  const d = state.data;

  return (
    <section className="mf-tier" aria-label="Transaction ledger">
      <header className="mf-tier__head">
        <span className="mf-tier__label"><FiBookOpen size={13} /> Tier 3 <span>·</span> Transaction ledger</span>
        <span className="mf-tier__note">
          {d ? `${d.count} entries · newest first` : 'loading'}
        </span>
      </header>

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
          <button type="button" className="mf-link-btn" onClick={() => load()}>
            <FiRefreshCw size={12} /> Refresh
          </button>
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
        <TableSkeleton rows={6} cols={7} />
      ) : state.status === 'error' ? (
        <div className="mf-alert mf-alert--error" role="alert">
          <FiAlertCircle size={15} /> The ledger could not be loaded.
          <button type="button" className="mf-btn mf-btn--sm mf-alert__action" onClick={() => load()}>Retry</button>
        </div>
      ) : !d || d.entries.length === 0 ? (
        <Empty Icon={FiFileText} title="No entries in this window"
          message="Widen the date range to see posted repayments and disbursements." />
      ) : (
        <div className="mf-ledger__scroll">
          <table className="mf-ledger-table">
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
                  <td className="mf-ledger__ref">{fmtDay(e.date, SHORT)}</td>
                  <td>
                    <span className="mf-ledger__entity">
                      <b>{e.entity}</b>
                      <span>{e.kind === 'repayment' ? 'Repayment received' : 'Principal disbursed'}</span>
                    </span>
                  </td>
                  <td className="mf-ledger__ref">{e.reference}</td>
                  <td>
                    <span className={`mf-ledger__type is-${e.account_type}`}>{e.account_type}</span>
                  </td>
                  <td className={`is-fig${e.inflow ? ' is-credit' : ''}`}>{e.inflow ? money(e.inflow) : '—'}</td>
                  <td className={`is-fig${e.outflow ? ' is-debit' : ''}`}>{e.outflow ? money(e.outflow) : '—'}</td>
                  <td className="is-fig is-balance">{money(e.balance)}</td>
                  <td className="no-print">
                    <button type="button" className="mf-ledger__voucher" onClick={() => onVoucher(e)}
                      title={`Download the voucher for ${e.reference}`}>
                      Voucher
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Window totals</td>
                <td>{money(d.total_inflow)}</td>
                <td>{money(d.total_outflow)}</td>
                <td>{money(d.closing_balance)}</td>
                <td className="no-print" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {d && d.count >= d.limit && (
        <p className="mf-matrix__hint">
          <FiAlertTriangle size={11} /> Showing the newest {d.limit} entries in this window — narrow the dates to see older movement.
        </p>
      )}
    </section>
  );
}
