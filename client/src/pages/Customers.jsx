import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FiUserPlus, FiUsers, FiList, FiGrid, FiEye, FiEdit2, FiTrash2, FiFilePlus,
  FiAlertCircle, FiAlertTriangle, FiUserCheck, FiCalendar, FiSearch, FiRefreshCw,
} from 'react-icons/fi';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { fmt0, fmtDay, fmtShort } from '../utils/format';
import { clientStanding } from '../utils/finance';
import { displayNin, normalizeNin } from '../utils/nida';
import {
  PageHeader, MetricCard, Segmented, SearchField, Avatar, Empty, TableSkeleton, Modal,
} from '../components/ui';
import { ScoreCell, StandingBadge } from '../components/clients/Standing';
import ClientFormModal     from '../components/clients/ClientFormModal';
import ClientProfileDrawer from '../components/clients/ClientProfileDrawer';
import '../styles/app/lending.css';
import '../styles/app/directory.css';

const SEGMENTS = [
  { value: 'all',     label: 'All clients' },
  { value: 'active',  label: 'Borrowing'   },
  { value: 'overdue', label: 'In arrears'  },
  { value: 'settled', label: 'Settled'     },
  { value: 'none',    label: 'No loans'    },
];

const SORTS = {
  recent:   { label: 'Newest first',        fn: (a, b) => String(b.c.registration_date || '').localeCompare(String(a.c.registration_date || '')) || b.c.id - a.c.id },
  name:     { label: 'Name (A–Z)',          fn: (a, b) => String(a.c.full_name).localeCompare(String(b.c.full_name)) },
  score:    { label: 'Score (high–low)',    fn: (a, b) => (b.standing.score ?? -1) - (a.standing.score ?? -1) },
  exposure: { label: 'Exposure (high–low)', fn: (a, b) => b.standing.exposure - a.standing.exposure },
};

const GRADE_BADGE = { emerald: 'green', crimson: 'red', amber: 'yellow' };
const SHORT_DATE  = { day: '2-digit', month: 'short', year: 'numeric' };
const clientCode  = id => `CL-${String(id).padStart(5, '0')}`;

export default function Customers() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [params, setParams] = useSearchParams();

  const [customers, setCustomers]   = useState([]);
  const [loans, setLoans]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [loadError, setLoadError]   = useState('');
  const [loansError, setLoansError] = useState(false);

  const [query, setQuery]     = useState('');
  const [segment, setSegment] = useState('all');
  const [sort, setSort]       = useState('recent');
  const [view, setView]       = useState('table');

  const [editor, setEditor]       = useState(null);  // { mode, customer? }
  const [profileId, setProfileId] = useState(null);
  const [deleting, setDeleting]   = useState(null);  // row

  const load = useCallback(async () => {
    const [c, l] = await Promise.allSettled([api.get('/customers'), api.get('/loans')]);
    if (c.status === 'fulfilled') { setCustomers(c.value.data); setLoadError(''); }
    else setLoadError(c.reason?.response?.data?.message || 'Clients could not be loaded.');
    if (l.status === 'fulfilled') { setLoans(l.value.data); setLoansError(false); }
    else setLoansError(true);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Deep link: ?new=1 */
  useEffect(() => {
    if (params.get('new') === '1') {
      setEditor({ mode: 'add' });
      const next = new URLSearchParams(params);
      next.delete('new');
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  const loansByCustomer = useMemo(() => {
    const map = {};
    for (const l of loans) (map[l.customer_id] ||= []).push(l);
    return map;
  }, [loans]);

  const rows = useMemo(
    () => customers.map(c => ({ c, loans: loansByCustomer[c.id] || [], standing: clientStanding(loansByCustomer[c.id] || []) })),
    [customers, loansByCustomer],
  );

  const counts = useMemo(() => {
    const out = { all: rows.length, active: 0, overdue: 0, settled: 0, none: 0 };
    for (const r of rows) out[r.standing.status] += 1;
    return out;
  }, [rows]);

  const metrics = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    return {
      newThisMonth: rows.filter(r => String(r.c.registration_date || '').slice(0, 7) === month).length,
      exposure: rows.reduce((s, r) => s + r.standing.exposure, 0),
      arrearsExposure: rows.filter(r => r.standing.status === 'overdue').reduce((s, r) => s + r.standing.exposure, 0),
    };
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    // A digits-only query also matches NINs typed with or without hyphens
    const qDigits = /^[\d\s-]+$/.test(q) ? normalizeNin(q) : '';
    return rows
      .filter(r => segment === 'all' || r.standing.status === segment)
      .filter(r => !q
        || r.c.full_name?.toLowerCase().includes(q)
        || r.c.phone?.toLowerCase().includes(q)
        || r.c.id_number?.toLowerCase().includes(q)
        || (qDigits && normalizeNin(r.c.id_number).includes(qDigits))
        || clientCode(r.c.id).toLowerCase().includes(q))
      .sort(SORTS[sort].fn);
  }, [rows, segment, query, sort]);

  const profile = profileId != null ? rows.find(r => r.c.id === profileId) : null;

  const newLoanFor = useCallback(id => navigate(`/loans?new=1&customer=${id}`), [navigate]);

  async function confirmDelete() {
    const id = deleting.c.id;
    try {
      await api.delete(`/customers/${id}`);
      showToast('Client deleted', 'info');
      setDeleting(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed', 'error');
      setDeleting(null);
    }
  }

  function rowActions(r) {
    return (
      <div className="mf-actions">
        <button type="button" className="mf-icon-btn" onClick={() => setProfileId(r.c.id)} title="View profile" aria-label="View profile"><FiEye size={16} /></button>
        <button type="button" className="mf-icon-btn" onClick={() => newLoanFor(r.c.id)} title="New loan for client" aria-label="New loan for client"><FiFilePlus size={16} /></button>
        <button type="button" className="mf-icon-btn" onClick={() => setEditor({ mode: 'edit', customer: r.c })} title="Edit client" aria-label="Edit client"><FiEdit2 size={16} /></button>
        <button type="button" className="mf-icon-btn mf-icon-btn--danger" onClick={() => setDeleting(r)} title="Delete client" aria-label="Delete client"><FiTrash2 size={16} /></button>
      </div>
    );
  }

  return (
    <div className="mf-page">
      <PageHeader
        eyebrow="Lending"
        title="Clients Directory"
        subtitle="Borrower profiles with repayment standing and full loan history."
        actions={
          <button type="button" className="mf-btn mf-btn--primary" onClick={() => setEditor({ mode: 'add' })}>
            <FiUserPlus size={17} /> Register Client
          </button>
        }
      />

      <section className="mf-metric-grid" aria-label="Client metrics">
        <MetricCard compact label="Total clients" tone="charcoal" Icon={FiUsers} loading={loading}
          value={counts.all} sub={<><strong>{metrics.newThisMonth}</strong> registered this month</>} />
        <MetricCard compact label="Borrowing now" tone="orange" Icon={FiUserCheck} loading={loading}
          value={counts.active + counts.overdue}
          sub={<>TZS <strong>{fmtShort(metrics.exposure)}</strong> total exposure</>}
          onClick={() => setSegment('active')} />
        <MetricCard compact label="In arrears" tone="crimson" Icon={FiAlertTriangle} loading={loading}
          value={counts.overdue}
          sub={<>TZS <strong>{fmtShort(metrics.arrearsExposure)}</strong> held by these clients</>}
          onClick={() => setSegment('overdue')} />
        <MetricCard compact label="Without loans" tone="neutral" Icon={FiCalendar} loading={loading}
          value={counts.none} sub={<><strong>{counts.settled}</strong> fully settled</>}
          onClick={() => setSegment('none')} />
      </section>

      <div className="mf-toolbar">
        <div className="mf-toolbar__group">
          <Segmented ariaLabel="Filter clients" value={segment} onChange={setSegment}
            options={SEGMENTS.map(s => ({ ...s, count: counts[s.value] }))} />
        </div>
        <div className="mf-toolbar__group">
          <SearchField value={query} onChange={setQuery} placeholder="Name, phone, NIN or CL-code" />
          <select className="mf-select" value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort clients">
            {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
          <Segmented iconOnly ariaLabel="View mode" value={view} onChange={setView}
            options={[{ value: 'table', label: 'Table view', Icon: FiList }, { value: 'grid', label: 'Grid view', Icon: FiGrid }]} />
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
      {loansError && !loadError && (
        <div className="mf-alert mf-alert--warning">
          <FiAlertTriangle size={17} /> <span>Loan history could not be loaded — scores and exposure are unavailable.</span>
        </div>
      )}

      {loading ? (
        <div className="mf-card mf-card--flush"><TableSkeleton rows={7} cols={5} /></div>
      ) : visible.length === 0 ? (
        <div className="mf-card">
          <Empty
            Icon={query ? FiSearch : FiUsers}
            title={query || segment !== 'all' ? 'No clients match these filters' : 'No clients registered yet'}
            message={query || segment !== 'all' ? 'Adjust the search or segment.' : 'Register a borrower to begin originating loans.'}
            action={query || segment !== 'all'
              ? <button type="button" className="mf-btn mf-btn--sm" onClick={() => { setQuery(''); setSegment('all'); }}>Clear filters</button>
              : <button type="button" className="mf-btn mf-btn--primary mf-btn--sm" onClick={() => setEditor({ mode: 'add' })}><FiUserPlus size={15} /> Register client</button>}
          />
        </div>
      ) : view === 'grid' ? (
        <div className="mf-card-grid">
          {visible.map(r => (
            <article key={r.c.id} className={`mf-client-card${r.standing.status === 'overdue' ? ' mf-client-card--overdue' : ''}`}>
              <button type="button" className="mf-client-card__head" onClick={() => setProfileId(r.c.id)}>
                <Avatar name={r.c.full_name} size={42} />
                <span className="mf-cell-stack">
                  <span className="mf-cell-title">{r.c.full_name}</span>
                  <span className="mf-cell-sub">{clientCode(r.c.id)} · {r.c.phone}</span>
                </span>
                <StandingBadge status={r.standing.status} />
              </button>
              <div className="mf-client-card__score">
                <div>
                  <div className="mf-summary-bar__label">Repayment score</div>
                  <div className="mf-client-card__score-num">{r.standing.score ?? '—'}<small>/100</small></div>
                </div>
                <span className={`badge badge--${GRADE_BADGE[r.standing.grade.tone] || 'gray'}`}>
                  {r.standing.grade.letter} · {r.standing.grade.label}
                </span>
              </div>
              <div className="mf-client-card__body">
                <div className="mf-kv">
                  <div className="mf-kv__row"><span>Loans</span><span>{r.standing.n} ({r.standing.active + r.standing.pending} open · {r.standing.overdue} overdue)</span></div>
                  <div className="mf-kv__row"><span>Exposure</span><span>TZS {fmt0(r.standing.exposure)}</span></div>
                  <div className="mf-kv__row"><span>NIN</span><span>{displayNin(r.c.id_number)}</span></div>
                </div>
              </div>
              <div className="mf-client-card__foot">
                <span className="mf-cell-sub">Since {fmtDay(r.c.registration_date, SHORT_DATE)}</span>
                {rowActions(r)}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="mf-card mf-card--flush">
          <div className="mf-table-wrap">
            <table className="mf-table mf-table--stack">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Contact</th>
                  <th>Loans</th>
                  <th className="is-num">Exposure (TZS)</th>
                  <th>Repayment score</th>
                  <th>Standing</th>
                  <th className="is-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(r => (
                  <tr key={r.c.id} className="is-link" onClick={() => setProfileId(r.c.id)}>
                    <td>
                      <div className="mf-cell-main">
                        <Avatar name={r.c.full_name} size={38} />
                        <div className="mf-cell-stack">
                          <span className="mf-cell-title">{r.c.full_name}</span>
                          <span className="mf-cell-sub">
                            {clientCode(r.c.id)}{r.c.id_number ? ` · NIN ${displayNin(r.c.id_number)}` : ''}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td data-label="Contact">
                      <div className="mf-cell-stack">
                        <span className="mf-num">{r.c.phone}</span>
                        <span className="mf-cell-sub">Since {fmtDay(r.c.registration_date, SHORT_DATE)}</span>
                      </div>
                    </td>
                    <td data-label="Loans">
                      <span className="mf-loans-mini">
                        <span className="mf-loans-mini__count">{r.standing.n}</span>
                        {r.standing.n > 0 && (
                          <span className="mf-loans-mini__split">
                            <b>{r.standing.active + r.standing.pending}</b> open · <b className={r.standing.overdue ? 'mf-tone--crimson' : ''}>{r.standing.overdue}</b> overdue
                          </span>
                        )}
                      </span>
                    </td>
                    <td className={`is-num${r.standing.exposure > 0 ? '' : ' mf-muted'}`} data-label="Exposure (TZS)">{fmt0(r.standing.exposure)}</td>
                    <td data-label="Repayment score"><ScoreCell standing={r.standing} /></td>
                    <td data-label="Standing"><StandingBadge status={r.standing.status} /></td>
                    <td className="is-actions" onClick={e => e.stopPropagation()}>{rowActions(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {editor && (
        <ClientFormModal
          mode={editor.mode}
          customer={editor.customer}
          customers={customers}
          onClose={() => setEditor(null)}
          onSaved={() => {
            showToast(editor.mode === 'add' ? 'Client registered successfully' : 'Client updated', 'success');
            setEditor(null);
            load();
          }}
        />
      )}

      {profile && (
        <ClientProfileDrawer
          customer={profile.c}
          loans={profile.loans}
          standing={profile.standing}
          onClose={() => setProfileId(null)}
          onEdit={() => { setEditor({ mode: 'edit', customer: profile.c }); setProfileId(null); }}
          onNewLoan={() => newLoanFor(profile.c.id)}
          onOpenLoan={l => navigate(`/loans/${l.id}`)}
        />
      )}

      {deleting && (
        <Modal
          size="sm"
          eyebrow={clientCode(deleting.c.id)}
          title={deleting.standing.n > 0 ? 'Client cannot be deleted' : 'Delete client?'}
          onClose={() => setDeleting(null)}
          footer={deleting.standing.n > 0
            ? <button type="button" className="mf-btn mf-btn--ghost" onClick={() => setDeleting(null)}>Close</button>
            : <>
                <button type="button" className="mf-btn mf-btn--ghost" onClick={() => setDeleting(null)}>Cancel</button>
                <button type="button" className="mf-btn mf-btn--danger" onClick={confirmDelete}><FiTrash2 size={15} /> Delete</button>
              </>}
        >
          {deleting.standing.n > 0 ? (
            <p className="mf-muted">
              <strong className="mf-strong">{deleting.c.full_name}</strong> has {deleting.standing.n} loan{deleting.standing.n === 1 ? '' : 's'} on record.
              Clients with loans cannot be deleted.
            </p>
          ) : (
            <p className="mf-muted">
              <strong className="mf-strong">{deleting.c.full_name}</strong> will be permanently removed. This action cannot be undone.
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
