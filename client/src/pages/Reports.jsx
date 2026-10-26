import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUser, FiUsers, FiFileText, FiDownload, FiPrinter, FiSearch, FiChevronRight,
  FiAlertCircle, FiRefreshCw, FiTrendingUp, FiTrendingDown, FiArrowUpRight, FiCheckCircle,
} from 'react-icons/fi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../api';
import { PageHeader, Tabs, SearchField, Empty, TableSkeleton, ProgressBar } from '../components/ui';
import { useCanSeeTotals, Mask } from '../components/common/MoneyGuard';
import { MASK } from '../utils/rbac';
import { BarTrend } from '../components/dashboard/charts';
import { savePdf } from '../utils/download';
import { runPrint } from '../utils/print';
import { fmt, fmt0, fmtShort, fmtDay } from '../utils/format';
import { monthLabel } from '../utils/finance';
import '../styles/app/reports.css';

const LONG_DATE = { day: '2-digit', month: 'short', year: 'numeric' };
const ISSUER = 'RAMOS MICRO-CREDIT';

const TABS = [
  { value: 'individuals', label: 'Individual Loans', Icon: FiUser },
  { value: 'groups',      label: 'Group Loans',      Icon: FiUsers },
  { value: 'statement',   label: 'Financial Statement', Icon: FiFileText },
];

/* ── One figure on the statement ─────────────────────────────────────── */
function Figure({ label, value, sub, tone = 'slate', masked, count }) {
  return (
    <div className={`mf-fig mf-fig--${tone}`}>
      <span className="mf-fig__label">{label}</span>
      <span className="mf-fig__value">
        {masked ? <Mask /> : count ? fmt0(value) : <><small>TZS</small>{fmt(value)}</>}
      </span>
      {sub && <span className="mf-fig__sub">{sub}</span>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   REPORTS — two directories and one executive statement.
   Admin-only module (the API refuses /api/reports for staff); the RBAC
   mask is still applied to every figure, on screen and in the download.
   ════════════════════════════════════════════════════════════════════ */
export default function Reports() {
  const navigate = useNavigate();
  const showTotals = useCanSeeTotals();

  const [tab, setTab] = useState('individuals');
  const [individuals, setIndividuals] = useState([]);
  const [groups, setGroups] = useState([]);
  const [statement, setStatement] = useState(null);
  const [members, setMembers] = useState({});        // groupId → member rows
  const [openGroup, setOpenGroup] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    const [i, g, s] = await Promise.allSettled([
      api.get('/reports/individuals'), api.get('/reports/groups'), api.get('/reports/statement'),
    ]);
    if (i.status === 'fulfilled') setIndividuals(Array.isArray(i.value.data) ? i.value.data : []);
    if (g.status === 'fulfilled') setGroups(Array.isArray(g.value.data) ? g.value.data : []);
    if (s.status === 'fulfilled') setStatement(s.value.data || null);
    if ([i, g, s].every(x => x.status === 'rejected')) {
      setError(i.reason?.response?.data?.message || 'Reports could not be loaded.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Drill-down: a group's member history is fetched the first time it opens */
  const toggleGroup = useCallback(async g => {
    if (openGroup === g.id) { setOpenGroup(null); return; }
    setOpenGroup(g.id);
    if (members[g.id]) return;
    try {
      const { data } = await api.get(`/reports/groups/${g.id}/members`);
      setMembers(m => ({ ...m, [g.id]: Array.isArray(data) ? data : [] }));
    } catch {
      setMembers(m => ({ ...m, [g.id]: [] }));
    }
  }, [openGroup, members]);

  const money = v => (showTotals ? `TZS ${fmt(v)}` : MASK);

  const visibleIndividuals = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? individuals.filter(r => [r.full_name, r.phone, r.id_number].some(v => String(v || '').toLowerCase().includes(q))) : individuals;
  }, [individuals, query]);

  const visibleGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? groups.filter(r => [r.group_name, r.market_name, r.leader_name].some(v => String(v || '').toLowerCase().includes(q))) : groups;
  }, [groups, query]);

  /* ── The downloadable statement ── */
  function downloadStatement() {
    if (!statement) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const p = statement.portfolio;
    const inc = statement.income;

    doc.setFillColor(30, 30, 36);
    doc.rect(0, 0, pageW, 30, 'F');
    doc.setFillColor(255, 107, 0);
    doc.rect(0, 28, pageW, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15); doc.setFont('helvetica', 'bold');
    doc.text(ISSUER, 14, 13);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(`Full financial statement · generated ${fmtDay(new Date().toISOString(), LONG_DATE)}`, 14, 22);

    autoTable(doc, {
      startY: 38,
      head: [['Portfolio', 'Value']],
      body: [
        ['Loans on book', String(p.loans)],
        ['Total principal disbursed', money(p.principal_disbursed)],
        ['— individual lending', money(p.individual_principal)],
        ['— group lending', money(p.group_principal)],
        ['Total payable (principal + interest)', money(p.total_payable)],
        ['Total repaid', money(p.total_repaid)],
        ['Active outstanding balance', money(p.outstanding)],
        ['Active / overdue / closed', `${p.active_loans} / ${p.overdue_loans} / ${p.closed_loans}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 30, 36], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' } },
      styles: { fontSize: 9.5, cellPadding: 2.4 },
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 6,
      head: [['Revenue & fees', 'Value']],
      body: [
        [`Processing fees collected (10% upfront)`, money(inc.processing_fees)],
        ['Interest recognised on collections', money(inc.interest_recognised)],
        ['Gross revenue', money(inc.revenue)],
        [`Operating expenses (${inc.expense_count})`, money(inc.expenses)],
        ['Net revenue', money(inc.net)],
        ['Member incentives due / paid', `${money(statement.refunds.member_due)} / ${money(statement.refunds.member_paid)}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [255, 107, 0], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' } },
      styles: { fontSize: 9.5, cellPadding: 2.4 },
    });

    if (statement.trend.length) {
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 6,
        head: [['Month', 'Disbursed', 'Collected', 'Revenue', 'Net']],
        body: statement.trend.map(m => [
          m.month, money(m.disbursed), money(m.collected), money(m.revenue), money(m.net),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [60, 60, 71], textColor: 255 },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
        styles: { fontSize: 9, cellPadding: 2.2 },
      });
    }

    const y = doc.lastAutoTable.finalY + 8;
    doc.setTextColor(74, 74, 85); doc.setFontSize(7.6);
    doc.text(doc.splitTextToSize(
      'Interest is recognised pro-rata on money actually collected; processing fees are recognised in the month the loan was booked. '
      + 'Figures reflect the ledger at the time of generation.', pageW - 28), 14, y);

    savePdf(doc, 'Full_Financial_Statement.pdf');
  }

  const header = (
    <PageHeader
      eyebrow="Reporting"
      title="Financial Reports"
      subtitle="Individual and group lending directories, and the full financial statement."
      actions={
        <>
          <button type="button" className="mf-btn mf-btn--ghost" onClick={load} disabled={loading}>
            <FiRefreshCw size={14} className={loading ? 'mf-spin' : undefined} /> Refresh
          </button>
          <button type="button" className="mf-btn mf-btn--ghost" onClick={() => runPrint()}>
            <FiPrinter size={15} /> Print
          </button>
          <button type="button" className="mf-btn mf-btn--primary" onClick={downloadStatement} disabled={!statement}>
            <FiDownload size={15} /> Generate Full Financial Statement
          </button>
        </>
      }
    />
  );

  return (
    <div className="mf-page mf-reports">
      {header}

      {error && (
        <div className="mf-alert mf-alert--error" role="alert">
          <FiAlertCircle size={15} /> {error}
          <button type="button" className="mf-btn mf-btn--sm mf-alert__action" onClick={load}>Retry</button>
        </div>
      )}

      <Tabs value={tab} onChange={setTab} tabs={TABS.map(t => ({
        ...t,
        count: t.value === 'individuals' ? individuals.length : t.value === 'groups' ? groups.length : undefined,
      }))} />

      {tab !== 'statement' && (
        <div className="mf-toolbar no-print">
          <div className="mf-toolbar__group">
            <span className="mf-toolbar__meta">
              {tab === 'individuals'
                ? <><strong>{visibleIndividuals.length}</strong> client{visibleIndividuals.length === 1 ? '' : 's'}</>
                : <><strong>{visibleGroups.length}</strong> group{visibleGroups.length === 1 ? '' : 's'}</>}
            </span>
          </div>
          <div className="mf-toolbar__group">
            <SearchField value={query} onChange={setQuery}
              placeholder={tab === 'individuals' ? 'Client, phone or ID' : 'Group, market or leader'} />
          </div>
        </div>
      )}

      {loading ? (
        <div className="mf-card mf-card--flush"><TableSkeleton rows={6} cols={6} /></div>
      ) : tab === 'individuals' ? (
        /* ── Directory 1 · individual loan accounts ── */
        visibleIndividuals.length === 0 ? (
          <div className="mf-card"><Empty Icon={FiSearch} title="No individual accounts" message="Clients with loans appear here." /></div>
        ) : (
          <section className="mf-card mf-card--flush">
            <div className="mf-table-wrap">
              <table className="mf-table mf-table--stack">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th className="is-num">Loans</th>
                    <th className="is-num">Principal (TZS)</th>
                    <th className="is-num">Fees (TZS)</th>
                    <th className="is-num">Repaid (TZS)</th>
                    <th className="is-num">Outstanding (TZS)</th>
                    <th className="is-actions" aria-label="Open" />
                  </tr>
                </thead>
                <tbody>
                  {visibleIndividuals.map(r => (
                    <tr key={r.id} className="is-link" onClick={() => navigate(`/customers?client=${r.id}`)}>
                      <td>
                        <div className="mf-cell-stack">
                          <span className="mf-cell-title">{r.full_name}</span>
                          <span className="mf-cell-sub mf-mono">{r.phone}</span>
                        </div>
                      </td>
                      <td className="is-num" data-label="Loans">{r.loans}</td>
                      <td className="is-num" data-label="Principal (TZS)">{showTotals ? fmt(r.principal) : <Mask />}</td>
                      <td className="is-num" data-label="Fees (TZS)">{showTotals ? fmt(r.fees) : <Mask />}</td>
                      <td className="is-num" data-label="Repaid (TZS)">{showTotals ? fmt(r.repaid) : <Mask />}</td>
                      <td className={`is-num${r.outstanding > 0 ? '' : ' mf-tone--emerald'}`} data-label="Outstanding (TZS)">
                        <strong>{showTotals ? fmt(r.outstanding) : <Mask />}</strong>
                      </td>
                      <td className="is-actions"><FiArrowUpRight size={15} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )
      ) : tab === 'groups' ? (
        /* ── Directory 2 · groups, with the per-member drill-down ── */
        visibleGroups.length === 0 ? (
          <div className="mf-card"><Empty Icon={FiUsers} title="No groups" message="Registered lending groups appear here." /></div>
        ) : (
          <div className="mf-grp-report">
            {visibleGroups.map(g => {
              const open = openGroup === g.id;
              const rows = members[g.id];
              return (
                <section key={g.id} className={`mf-card mf-grp-report__card${open ? ' is-open' : ''}`}>
                  <button type="button" className="mf-grp-report__head" onClick={() => toggleGroup(g)}
                    aria-expanded={open}>
                    <span className="mf-grp-report__chevron" aria-hidden="true">
                      <FiChevronRight size={16} />
                    </span>
                    <span className="mf-grp-report__id">
                      <span className="mf-grp-report__name">{g.group_name}</span>
                      <span className="mf-grp-report__meta">
                        {g.members} member{g.members === 1 ? '' : 's'} · {g.market_name}
                        {g.leader_name ? ` · leader ${g.leader_name}` : ''}
                      </span>
                    </span>
                    <span className="mf-grp-report__figs">
                      <span><i>Loans</i><b>{g.loans}</b></span>
                      <span><i>Principal</i><b>{showTotals ? fmtShort(g.principal) : MASK}</b></span>
                      <span><i>Repaid</i><b>{showTotals ? fmtShort(g.repaid) : MASK}</b></span>
                      <span><i>Outstanding</i><b className={g.outstanding > 0 ? 'mf-tone--orange' : 'mf-tone--emerald'}>
                        {showTotals ? fmtShort(g.outstanding) : MASK}</b></span>
                    </span>
                  </button>

                  {open && (
                    <div className="mf-grp-report__body">
                      {rows === undefined ? (
                        <TableSkeleton rows={3} cols={5} />
                      ) : rows.length === 0 ? (
                        <Empty Icon={FiUsers} title="No member history"
                          message="This group has no agreed member shares yet, so repayments are recorded for the group as a whole." />
                      ) : (
                        <div className="mf-table-wrap">
                          <table className="mf-table mf-table--stack">
                            <thead>
                              <tr>
                                <th>Member</th>
                                <th>Business</th>
                                <th className="is-num">Target (TZS)</th>
                                <th className="is-num">Paid (TZS)</th>
                                <th className="is-num">Balance (TZS)</th>
                                <th>Progress</th>
                                <th className="is-num">Incentive (TZS)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map(m => (
                                <tr key={m.id}>
                                  <td>
                                    <div className="mf-cell-stack">
                                      <span className="mf-cell-title">{m.full_name}</span>
                                      <span className="mf-cell-sub mf-mono">{m.phone_number}</span>
                                    </div>
                                  </td>
                                  <td data-label="Business">
                                    <div className="mf-cell-stack">
                                      <span>{m.business_name || '—'}</span>
                                      <span className="mf-cell-sub">{m.payments} payment{m.payments === 1 ? '' : 's'}</span>
                                    </div>
                                  </td>
                                  <td className="is-num" data-label="Target (TZS)">{showTotals ? fmt(m.target) : <Mask />}</td>
                                  <td className="is-num" data-label="Paid (TZS)">{showTotals ? fmt(m.paid) : <Mask />}</td>
                                  <td className="is-num" data-label="Balance (TZS)">
                                    <strong>{showTotals ? fmt(m.balance) : <Mask />}</strong>
                                  </td>
                                  <td data-label="Progress">
                                    <div className="mf-members__progress">
                                      <ProgressBar value={m.progress} tone={m.balance <= 0 ? 'emerald' : 'orange'} />
                                      <span className="mf-members__pct">
                                        {m.balance <= 0 && m.target > 0
                                          ? <><FiCheckCircle size={11} /> met</>
                                          : `${m.progress}%`}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="is-num" data-label="Incentive (TZS)">
                                    {showTotals
                                      ? <>{fmt(m.refund_total)}{m.refund_paid > 0 ? ' · paid' : m.refund_due > 0 ? ' · due' : ''}</>
                                      : <Mask />}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )
      ) : (
        /* ── The full financial statement ── */
        !statement ? (
          <div className="mf-card"><Empty Icon={FiFileText} title="Statement unavailable" message="Retry once the reports load." /></div>
        ) : (
          <div className="mf-statement" id="statement-print">
            <section className="mf-card mf-statement__block">
              <div className="mf-card__head">
                <div>
                  <h2 className="mf-card__title"><FiFileText size={15} /> Portfolio</h2>
                  <div className="mf-card__sub">Every loan on the book, individual and group</div>
                </div>
              </div>
              <div className="mf-fig-grid">
                <Figure label="Total principal disbursed" value={statement.portfolio.principal_disbursed} masked={!showTotals}
                  tone="charcoal" sub={`${statement.portfolio.loans} loans`} />
                <Figure label="Processing fees collected" value={statement.income.processing_fees} masked={!showTotals}
                  tone="orange" sub="10% upfront, recognised at booking" />
                <Figure label="Total repaid" value={statement.portfolio.total_repaid} masked={!showTotals}
                  tone="emerald" sub="principal + interest banked" />
                <Figure label="Active outstanding" value={statement.portfolio.outstanding} masked={!showTotals}
                  tone="crimson" sub={`${statement.portfolio.overdue_loans} overdue`} />
              </div>
              <dl className="mf-statement__split">
                <div>
                  <dt>Individual lending</dt>
                  <dd>{showTotals ? `TZS ${fmt(statement.portfolio.individual_principal)}` : <Mask />}
                    <span>{statement.portfolio.individual_loans} loans</span></dd>
                </div>
                <div>
                  <dt>Group lending</dt>
                  <dd>{showTotals ? `TZS ${fmt(statement.portfolio.group_principal)}` : <Mask />}
                    <span>{statement.portfolio.group_loans} loans</span></dd>
                </div>
                <div>
                  <dt>Total payable</dt>
                  <dd>{showTotals ? `TZS ${fmt(statement.portfolio.total_payable)}` : <Mask />}
                    <span>interest booked {showTotals ? fmtShort(statement.portfolio.interest_booked) : MASK}</span></dd>
                </div>
              </dl>
            </section>

            <section className="mf-card mf-statement__block">
              <div className="mf-card__head">
                <div>
                  <h2 className="mf-card__title"><FiTrendingUp size={15} /> Net revenue</h2>
                  <div className="mf-card__sub">
                    Interest recognised pro-rata on collections, plus processing fees, less operating expenses
                  </div>
                </div>
              </div>
              <div className="mf-fig-grid">
                <Figure label="Interest recognised" value={statement.income.interest_recognised} masked={!showTotals} tone="slate" />
                <Figure label="Processing fees" value={statement.income.processing_fees} masked={!showTotals} tone="orange" />
                <Figure label="Operating expenses" value={statement.income.expenses} masked={!showTotals} tone="crimson"
                  sub={`${statement.income.expense_count} records`} />
                <Figure label="Net revenue" value={statement.income.net} masked={!showTotals}
                  tone={statement.income.net >= 0 ? 'emerald' : 'crimson'}
                  sub={statement.income.net >= 0 ? 'surplus' : 'deficit'} />
              </div>

              {showTotals ? (
                <BarTrend
                  label="Net revenue trend"
                  points={statement.trend.map(m => ({
                    key: m.month, label: monthLabel(m.month), revenue: m.revenue, expenses: m.expenses,
                  }))}
                  series={[
                    { key: 'revenue', label: 'Revenue', tone: 'orange' },
                    { key: 'expenses', label: 'Expenses', tone: 'charcoal' },
                  ]}
                  format={v => `TZS ${fmt0(v)}`}
                />
              ) : (
                <div className="mf-alert mf-alert--info"><FiAlertCircle size={15} /> Revenue trend is restricted for your role.</div>
              )}
            </section>

            <section className="mf-card mf-card--flush mf-statement__block">
              <div className="mf-card__head">
                <div>
                  <h2 className="mf-card__title"><FiTrendingDown size={15} /> Month by month</h2>
                  <div className="mf-card__sub">Trailing 12 months</div>
                </div>
              </div>
              <div className="mf-table-wrap">
                <table className="mf-table mf-table--stack">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th className="is-num">Disbursed (TZS)</th>
                      <th className="is-num">Collected (TZS)</th>
                      <th className="is-num">Fees (TZS)</th>
                      <th className="is-num">Revenue (TZS)</th>
                      <th className="is-num">Net (TZS)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.trend.map(m => (
                      <tr key={m.month}>
                        <td data-label="Month">{monthLabel(m.month)} {m.month.slice(0, 4)}</td>
                        <td className="is-num" data-label="Disbursed (TZS)">{showTotals ? fmt(m.disbursed) : <Mask />}</td>
                        <td className="is-num" data-label="Collected (TZS)">{showTotals ? fmt(m.collected) : <Mask />}</td>
                        <td className="is-num" data-label="Fees (TZS)">{showTotals ? fmt(m.fees) : <Mask />}</td>
                        <td className="is-num" data-label="Revenue (TZS)">{showTotals ? fmt(m.revenue) : <Mask />}</td>
                        <td className={`is-num ${m.net >= 0 ? 'mf-tone--emerald' : 'mf-tone--crimson'}`} data-label="Net (TZS)">
                          <strong>{showTotals ? fmt(m.net) : <Mask />}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <p className="mf-statement__note">
              Interest is recognised pro-rata on money actually collected; processing fees are recognised in the month the
              loan was booked. Member incentives due {showTotals ? `TZS ${fmt(statement.refunds.member_due)}` : MASK},
              paid {showTotals ? `TZS ${fmt(statement.refunds.member_paid)}` : MASK}.
            </p>
          </div>
        )
      )}
    </div>
  );
}
