import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FiPlus, FiList, FiGrid, FiLayers, FiSliders, FiArrowUpRight, FiEdit2,
  FiAlertCircle, FiSearch, FiRefreshCw,
} from 'react-icons/fi';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { fmt0, fmtDay } from '../utils/format';
import {
  PageHeader, Tabs, Segmented, SearchField, ProgressBar, DueChip, Avatar, Empty, TableSkeleton,
} from '../components/ui';
import StatusBadge           from '../components/common/StatusBadge';
import { useCanSeeTotals, Mask } from '../components/common/MoneyGuard';
import LoanApplicationWizard from '../components/loans/LoanApplicationWizard';
import EditLoanModal         from '../components/loans/EditLoanModal';
import LoanCalculator        from '../components/loans/LoanCalculator';
import '../styles/app/lending.css';

const STATUSES   = ['active', 'pending', 'overdue', 'paid'];
const SHORT_DATE = { day: '2-digit', month: 'short', year: '2-digit' };

function repaidPct(loan) {
  const total = Number(loan.total_payable) || 0;
  return total > 0 ? Math.min(100, Math.round(((Number(loan.amount_paid) || 0) / total) * 100)) : 0;
}

function toneFor(status) {
  return status === 'overdue' ? 'crimson' : status === 'paid' ? 'emerald' : 'orange';
}

/* ── Card view item ────────────────────────────────────────────────── */
function LoanCard({ loan, onOpen, onEdit }) {
  const pct = repaidPct(loan);
  return (
    <article className={`mf-loan-card${loan.status === 'overdue' ? ' mf-loan-card--overdue' : ''}`}>
      <div className="mf-loan-card__head">
        <Avatar name={loan.customer_name} size={38} />
        <div className="mf-cell-stack">
          <span className="mf-cell-title">{loan.customer_name}</span>
          <span className="mf-cell-sub">#{loan.id} · {loan.customer_phone}</span>
        </div>
        <StatusBadge status={loan.status} />
      </div>
      <div className="mf-loan-card__balance">
        <div className="mf-loan-card__balance-label">Outstanding balance</div>
        <div className="mf-loan-card__balance-value"><small>TZS</small>{fmt0(loan.balance)}</div>
      </div>
      <div className="mf-loan-card__body">
        <div className="mf-progress-cell">
          <ProgressBar value={pct} tone={toneFor(loan.status)} />
          <div className="mf-progress-cell__meta"><span>{pct}% repaid</span><span>of {fmt0(loan.total_payable)}</span></div>
        </div>
        <div className="mf-kv">
          <div className="mf-kv__row"><span>Principal</span><span>{fmt0(loan.loan_amount)}</span></div>
          <div className="mf-kv__row"><span>Rate · tenor</span><span>{Number(loan.interest_rate)}% · {loan.duration_value} {loan.duration_unit}</span></div>
          <div className="mf-kv__row"><span>Due</span><span>{fmtDay(loan.due_date, SHORT_DATE)}</span></div>
        </div>
      </div>
      <div className="mf-loan-card__foot">
        <DueChip date={loan.due_date} status={loan.status} />
        <div className="mf-actions">
          <button type="button" className="mf-icon-btn" onClick={onOpen} title="Open loan" aria-label="Open loan"><FiArrowUpRight size={16} /></button>
          <button type="button" className="mf-icon-btn" onClick={onEdit} title="Edit loan" aria-label="Edit loan"><FiEdit2 size={16} /></button>
        </div>
      </div>
    </article>
  );
}

/* ════════════════════════════════════════════════════════════════════
   LOAN MANAGEMENT
   ════════════════════════════════════════════════════════════════════ */
export default function Loans() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [params, setParams] = useSearchParams();
  // Portfolio-wide money totals are super-admin only (per-loan amounts stay visible)
  const showTotals = useCanSeeTotals();

  const [loans, setLoans]         = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState('');

  const [tab, setTab]       = useState('portfolio');
  const [status, setStatus] = useState(() => (STATUSES.includes(params.get('status')) ? params.get('status') : 'all'));
  const [query, setQuery]   = useState('');
  const [view, setView]     = useState('table');

  const [wizard, setWizard]   = useState(null);   // { customerId, terms }
  const [editing, setEditing] = useState(null);   // loan

  const load = useCallback(async () => {
    try {
      const [l, c] = await Promise.all([api.get('/loans'), api.get('/customers')]);
      setLoans(l.data);
      setCustomers(c.data);
      setLoadError('');
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Loans could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Deep links: ?new=1[&customer=ID] · ?status=overdue · ?tab=calculator */
  useEffect(() => {
    const s = params.get('status');
    if (STATUSES.includes(s)) { setStatus(s); setTab('portfolio'); }
    if (params.get('tab') === 'calculator') setTab('calculator');
    if (params.get('new') === '1') {
      setWizard({ customerId: params.get('customer') || '' });
      const next = new URLSearchParams(params);
      next.delete('new');
      next.delete('customer');
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  const counts = useMemo(() => {
    const c = { all: loans.length };
    for (const s of STATUSES) c[s] = loans.filter(l => l.status === s).length;
    return c;
  }, [loans]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, '');
    return loans.filter(l => {
      if (status !== 'all' && l.status !== status) return false;
      if (!q) return true;
      return l.customer_name?.toLowerCase().includes(q)
        || l.customer_phone?.toLowerCase().includes(q)
        || String(l.id) === q;
    });
  }, [loans, status, query]);

  const totals = useMemo(() => filtered.reduce((t, l) => ({
    principal: t.principal + (Number(l.loan_amount) || 0),
    payable:   t.payable   + (Number(l.total_payable) || 0),
    repaid:    t.repaid    + (Number(l.amount_paid) || 0),
    balance:   t.balance   + (l.status !== 'paid' ? Number(l.balance) || 0 : 0),
  }), { principal: 0, payable: 0, repaid: 0, balance: 0 }), [filtered]);

  const openLoan = useCallback(loan => loan?.id && navigate(`/loans/${loan.id}`), [navigate]);

  return (
    <div className="mf-page">
      <PageHeader
        eyebrow="Lending"
        title="Loan Management"
        subtitle="Originate new credit, monitor the portfolio and service existing loans."
        actions={
          <>
            <button type="button" className="mf-btn mf-btn--ghost" onClick={() => setTab('calculator')}>
              <FiSliders size={16} /> Calculator
            </button>
            <button type="button" className="mf-btn mf-btn--primary" onClick={() => setWizard({})}>
              <FiPlus size={17} /> New Application
            </button>
          </>
        }
      />

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'portfolio',  label: 'Portfolio',       Icon: FiLayers,  count: loans.length },
          { value: 'calculator', label: 'Loan Calculator', Icon: FiSliders },
        ]}
      />

      {tab === 'calculator' ? (
        <LoanCalculator onStartApplication={terms => setWizard({ terms })} />
      ) : (
        <>
          <div className="mf-summary-bar">
            <div className="mf-summary-bar__cell">
              <div className="mf-summary-bar__label">Loans in view</div>
              <div className="mf-summary-bar__value">{filtered.length}</div>
            </div>
            {/* Cumulative portfolio money — super admins only; per-loan figures in the table stay visible */}
            <div className="mf-summary-bar__cell">
              <div className="mf-summary-bar__label">Principal</div>
              <div className="mf-summary-bar__value"><small>TZS</small>{showTotals ? fmt0(totals.principal) : <Mask />}</div>
            </div>
            <div className="mf-summary-bar__cell">
              <div className="mf-summary-bar__label">Total payable</div>
              <div className="mf-summary-bar__value"><small>TZS</small>{showTotals ? fmt0(totals.payable) : <Mask />}</div>
            </div>
            <div className="mf-summary-bar__cell">
              <div className="mf-summary-bar__label">Repaid</div>
              <div className={`mf-summary-bar__value${showTotals ? ' mf-tone--emerald' : ''}`}><small>TZS</small>{showTotals ? fmt0(totals.repaid) : <Mask />}</div>
            </div>
            <div className="mf-summary-bar__cell">
              <div className="mf-summary-bar__label">Outstanding</div>
              <div className={`mf-summary-bar__value${showTotals ? ' mf-tone--orange' : ''}`}><small>TZS</small>{showTotals ? fmt0(totals.balance) : <Mask />}</div>
            </div>
          </div>

          <div className="mf-toolbar">
            <div className="mf-toolbar__group">
              <Segmented
                ariaLabel="Filter by status"
                value={status}
                onChange={setStatus}
                options={[{ value: 'all', label: 'All' }, ...STATUSES.map(s => ({ value: s, label: s }))]
                  .map(o => ({ ...o, count: counts[o.value] }))}
              />
            </div>
            <div className="mf-toolbar__group">
              <SearchField value={query} onChange={setQuery} placeholder="Client, phone or #loan" />
              <Segmented
                iconOnly
                ariaLabel="View mode"
                value={view}
                onChange={setView}
                options={[{ value: 'table', label: 'Table view', Icon: FiList }, { value: 'cards', label: 'Card view', Icon: FiGrid }]}
              />
            </div>
          </div>

          {loadError && (
            <div className="mf-alert mf-alert--error" role="alert">
              <FiAlertCircle size={17} /> <span>{loadError}</span>
              <button type="button" className="mf-btn mf-btn--sm mf-alert__action" onClick={() => { setLoading(true); load(); }}>
                <FiRefreshCw size={14} /> Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="mf-card mf-card--flush"><TableSkeleton rows={7} cols={6} /></div>
          ) : filtered.length === 0 ? (
            <div className="mf-card">
              <Empty
                Icon={query ? FiSearch : FiLayers}
                title={query || status !== 'all' ? 'No loans match these filters' : 'No loans yet'}
                message={query || status !== 'all' ? 'Clear the search or choose another status.' : 'Start an application to originate the first loan.'}
                action={(query || status !== 'all')
                  ? <button type="button" className="mf-btn mf-btn--sm" onClick={() => { setQuery(''); setStatus('all'); }}>Clear filters</button>
                  : <button type="button" className="mf-btn mf-btn--primary mf-btn--sm" onClick={() => setWizard({})}><FiPlus size={15} /> New application</button>}
              />
            </div>
          ) : view === 'cards' ? (
            <div className="mf-card-grid">
              {filtered.map(l => (
                <LoanCard key={l.id} loan={l} onOpen={() => openLoan(l)} onEdit={() => setEditing(l)} />
              ))}
            </div>
          ) : (
            <section className="mf-card mf-card--flush">
              <div className="mf-table-wrap">
                <table className="mf-table mf-table--stack">
                  <thead>
                    <tr>
                      <th>Client · Loan</th>
                      <th className="is-num">Principal</th>
                      <th>Repaid / Payable</th>
                      <th className="is-num">Balance</th>
                      <th>Due</th>
                      <th>Status</th>
                      <th className="is-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(l => {
                      const pct = repaidPct(l);
                      return (
                        <tr key={l.id} className="is-link" onClick={() => openLoan(l)}>
                          <td>
                            <div className="mf-cell-main">
                              <Avatar name={l.customer_name} size={36} />
                              <div className="mf-cell-stack">
                                <span className="mf-cell-title">{l.customer_name}</span>
                                <span className="mf-cell-sub">#{l.id} · {l.customer_phone}</span>
                              </div>
                            </div>
                          </td>
                          <td className="is-num" data-label="Principal">
                            <div className="mf-cell-stack" style={{ alignItems: 'flex-end' }}>
                              <span>{fmt0(l.loan_amount)}</span>
                              <span className="mf-cell-sub">{Number(l.interest_rate)}% · {l.duration_value} {l.duration_unit}</span>
                            </div>
                          </td>
                          <td data-label="Repaid">
                            <div className="mf-progress-cell">
                              <ProgressBar value={pct} tone={toneFor(l.status)} />
                              <div className="mf-progress-cell__meta"><span>{pct}%</span><span>{fmt0(l.amount_paid)} / {fmt0(l.total_payable)}</span></div>
                            </div>
                          </td>
                          <td className={`is-num${Number(l.balance) > 0 ? '' : ' mf-tone--emerald'}`} data-label="Balance (TZS)">
                            <strong>{fmt0(l.balance)}</strong>
                          </td>
                          <td data-label="Due">
                            <div className="mf-cell-stack" style={{ gap: '.3rem' }}>
                              <span className="mf-num">{fmtDay(l.due_date, SHORT_DATE)}</span>
                              <DueChip date={l.due_date} status={l.status} />
                            </div>
                          </td>
                          <td data-label="Status"><StatusBadge status={l.status} /></td>
                          <td className="is-actions" onClick={e => e.stopPropagation()}>
                            <div className="mf-actions">
                              <button type="button" className="mf-icon-btn" onClick={() => openLoan(l)} title="Open loan" aria-label="Open loan">
                                <FiArrowUpRight size={16} />
                              </button>
                              <button type="button" className="mf-icon-btn" onClick={() => setEditing(l)} title="Edit loan" aria-label="Edit loan">
                                <FiEdit2 size={16} />
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

      {wizard && (
        <LoanApplicationWizard
          customers={customers}
          loans={loans}
          initialCustomerId={wizard.customerId}
          initialTerms={wizard.terms}
          onClose={() => setWizard(null)}
          onCreated={loan => { showToast(`Loan #${loan.id} booked for ${loan.customer_name}`, 'success'); load(); }}
          onCustomerCreated={c => {
            setCustomers(cs => [{ ...c, loan_count: 0 }, ...cs]);
            showToast('Client registered', 'success');
          }}
          onViewLoan={loan => { setWizard(null); openLoan(loan); }}
        />
      )}

      {editing && (
        <EditLoanModal
          loan={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); showToast('Loan updated', 'success'); load(); }}
        />
      )}
    </div>
  );
}
