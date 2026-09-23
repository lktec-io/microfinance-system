import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiPrinter, FiDownload, FiMapPin, FiAlertCircle, FiRefreshCw, FiLock, FiArrowUp, FiArrowDown,
} from 'react-icons/fi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { PageHeader, Bi } from '../components/ui';
import { useCanSeeTotals, Mask } from '../components/common/MoneyGuard';
import { MASK } from '../utils/rbac';
import { fmt, fmtDay } from '../utils/format';
import { BRANCH, dayISO, dayMetrics, change } from '../utils/dailySummary';

import '../styles/app/daily.css';

const DAY_FMT = { weekday: 'short', day: '2-digit', month: 'short' };

/* Three rows, read straight off the day's metrics. `money: false` = never masked. */
const ROWS = [
  {
    key: 'inflows',
    title: { en: 'Cashflow inflows', sw: 'Fedha Zilizoingia' },
    cells: [
      { key: 'cashIn',  label: { en: 'Cash wallet', sw: 'Mkononi' } },
      { key: 'mpesaIn', label: { en: 'M-Pesa wallet', sw: 'M-Pesa' } },
    ],
  },
  {
    key: 'outflows',
    title: { en: 'Outflows & fees', sw: 'Fedha Zilizotoka na Ada' },
    cells: [
      { key: 'disbursed', label: { en: 'Disbursed', sw: 'Gawa Leo' } },
      { key: 'formFees',  label: { en: 'Form fees', sw: 'Fomu Leo' } },
      { key: 'spent',     label: { en: 'Expenses', sw: 'Matumizi Leo' }, money: false },
    ],
  },
  {
    key: 'volumes',
    title: { en: 'Operational volumes', sw: 'Idadi za Uendeshaji' },
    count: true,
    cells: [
      { key: 'attendance', label: { en: 'Attendance', sw: 'Waliofika' } },
      { key: 'newClients', label: { en: 'New clients', sw: 'Wapya' } },
    ],
  },
];

/** Movement of today's figure against yesterday's. Money deltas are admin-only. */
function Delta({ today, yesterday, visible }) {
  const { dir, pct } = change(today, yesterday);
  if (!visible || dir === 'flat' || pct === null) return null;
  const Icon = dir === 'up' ? FiArrowUp : FiArrowDown;
  return (
    <span className={`mf-ds-delta is-${dir}`} title={`vs yesterday: ${pct > 0 ? '+' : ''}${pct}%`}>
      <Icon size={11} aria-hidden="true" />{Math.abs(pct)}%
    </span>
  );
}

function Figure({ value, count, visible }) {
  if (count) return <span className="mf-ds-cell__value">{value}</span>;
  if (!visible) return <span className="mf-ds-cell__value"><Mask /></span>;
  return <span className="mf-ds-cell__value"><small>TZS</small>{fmt(value)}</span>;
}

/* ════════════════════════════════════════════════════════════════════
   DAILY OPERATIONS & CASHFLOW — yesterday vs today, read only
   Money in rows 1–2 follows the RBAC rule; expenses and the volume
   row stay open to every role.
   ════════════════════════════════════════════════════════════════════ */
export default function DailySummary() {
  const { showToast } = useToast();
  const showTotals = useCanSeeTotals();

  const [data, setData]       = useState({ loans: [], repayments: [], expenses: [], customers: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  /* Staff-safe endpoints only — /api/reports is admin-only by design */
  const load = useCallback(async () => {
    setError('');
    const [l, r, e, c] = await Promise.allSettled([
      api.get('/loans'), api.get('/repayments'), api.get('/expenses'), api.get('/customers'),
    ]);
    const list = res => (res.status === 'fulfilled' && Array.isArray(res.value.data) ? res.value.data : []);
    if ([l, r, e, c].every(x => x.status === 'rejected')) setError('The day’s figures could not be loaded.');
    setData({ loans: list(l), repayments: list(r), expenses: list(e), customers: list(c) });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const today     = useMemo(() => dayMetrics(data, dayISO(0)),  [data]);
  const yesterday = useMemo(() => dayMetrics(data, dayISO(-1)), [data]);
  const columns = [
    { key: 'yesterday', label: { en: 'Yesterday', sw: 'Jana' }, m: yesterday },
    { key: 'today',     label: { en: 'Today', sw: 'Leo' },      m: today, current: true },
  ];

  // Counts and the expenses cell are never masked; every other money cell follows the role
  const cellVisible = (cell, row) => row.count === true || cell.money === false || showTotals;
  const amount = value => (showTotals ? `TZS ${fmt(value)}` : MASK);

  function downloadPDF() {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFillColor(30, 30, 36);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setFillColor(255, 107, 0);
    doc.rect(0, 26, pageW, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text(BRANCH.name, 14, 12);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(`Daily summary · ${fmtDay(yesterday.date, DAY_FMT)} vs ${fmtDay(today.date, DAY_FMT)}`, 14, 21);

    autoTable(doc, {
      startY: 36,
      head: [['', `Jana · ${fmtDay(yesterday.date, DAY_FMT)}`, `Leo · ${fmtDay(today.date, DAY_FMT)}`]],
      body: [
        ['Mkononi · Cash wallet',  amount(yesterday.cashIn),    amount(today.cashIn)],
        ['M-Pesa wallet',          amount(yesterday.mpesaIn),   amount(today.mpesaIn)],
        ['Gawa Leo · Disbursed',   amount(yesterday.disbursed), amount(today.disbursed)],
        ['Fomu Leo · Form fees',   amount(yesterday.formFees),  amount(today.formFees)],
        ['Matumizi · Expenses',    `TZS ${fmt(yesterday.spent)}`, `TZS ${fmt(today.spent)}`],
        ['Waliofika · Attendance', String(yesterday.attendance), String(today.attendance)],
        ['Wapya · New clients',    String(yesterday.newClients), String(today.newClients)],
        ['BAKI · Net balance',     amount(yesterday.baki),      amount(today.baki)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 30, 36], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      styles: { fontSize: 9.5, cellPadding: 2.6 },
    });

    doc.save(`daily-summary-${today.date}.pdf`);
    showToast('Daily summary exported', 'success');
  }

  return (
    <div className="mf-page mf-ds">
      <PageHeader
        eyebrow="Operations"
        title="Daily Operations & Cashflow"
        subtitle="Jana dhidi ya Leo · yesterday against today"
        actions={
          <div className="mf-ds-actions no-print">
            <span className="mf-ds-branch" title={BRANCH.unit}><FiMapPin size={14} /> {BRANCH.name}</span>
            <button type="button" className="mf-btn mf-btn--ghost" onClick={() => window.print()}>
              <FiPrinter size={15} /> Print
            </button>
            <button type="button" className="mf-btn mf-btn--primary" onClick={downloadPDF}>
              <FiDownload size={15} /> Export PDF
            </button>
          </div>
        }
      />

      {error && (
        <div className="mf-alert mf-alert--error" role="alert">
          <FiAlertCircle size={15} /> {error}
          <button type="button" className="mf-btn mf-btn--sm mf-alert__action" onClick={load}>Retry</button>
        </div>
      )}
      {!showTotals && (
        <div className="mf-alert mf-alert--info no-print" role="note">
          <FiLock size={15} />
          <span><Bi text={{ en: 'Financial totals are restricted', sw: 'Jumla za fedha zimezuiliwa' }} block /></span>
        </div>
      )}

      <div className={`mf-ds-board${loading ? ' is-loading' : ''}`}>
        {/* Column headers */}
        <div className="mf-ds-heads" aria-hidden="true">
          {columns.map(col => (
            <div key={col.key} className={`mf-ds-head${col.current ? ' is-current' : ''}`}>
              <span className="mf-ds-head__day"><Bi text={col.label} /></span>
              <span className="mf-ds-head__date">{fmtDay(col.m.date, DAY_FMT)}</span>
            </div>
          ))}
        </div>

        {ROWS.map(row => (
          <section key={row.key} className="mf-ds-row" aria-label={row.title.en}>
            <h2 className="mf-ds-row__title"><Bi text={row.title} /></h2>
            <div className="mf-ds-row__cols">
              {columns.map(col => (
                <div key={col.key} className={`mf-ds-col${col.current ? ' is-current' : ''}`}>
                  <span className="mf-ds-col__tag">{col.label.sw}</span>
                  {row.cells.map(cell => (
                    <div key={cell.key} className="mf-ds-cell">
                      <span className="mf-ds-cell__label"><Bi text={cell.label} block /></span>
                      <span className="mf-ds-cell__figure">
                        {loading
                          ? <span className="skeleton mf-ds-cell__sk" />
                          : <>
                              <Figure value={col.m[cell.key]} count={row.count} visible={cellVisible(cell, row)} />
                              {col.current && (
                                <Delta today={col.m[cell.key]} yesterday={yesterday[cell.key]} visible={cellVisible(cell, row)} />
                              )}
                            </>}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* BAKI — one per column */}
        <section className="mf-ds-row mf-ds-row--baki" aria-label="Net balance">
          <h2 className="mf-ds-row__title"><Bi text={{ en: 'Net balance', sw: 'Baki' }} /></h2>
          <div className="mf-ds-row__cols">
            {columns.map(col => (
              <div key={col.key} className={`mf-ds-baki${col.m.baki < 0 ? ' is-negative' : ''}${col.current ? ' is-current' : ''}`}>
                <span className="mf-ds-baki__tag">{col.label.sw} · {fmtDay(col.m.date, DAY_FMT)}</span>
                <span className="mf-ds-baki__value">
                  {loading ? <span className="skeleton mf-ds-cell__sk" />
                    : showTotals ? <><small>TZS</small>{fmt(col.m.baki)}</> : <Mask />}
                </span>
                <span className="mf-ds-baki__sub">
                  {showTotals
                    ? <>In {fmt(col.m.inflows)} − Out {fmt(col.m.outflows)}</>
                    : <>{col.m.payments} payment{col.m.payments === 1 ? '' : 's'} · {col.m.loanCount} loan{col.m.loanCount === 1 ? '' : 's'}</>}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <p className="mf-ds-foot">
        Figures are calculated live from posted repayments, loans booked, expenses recorded and clients registered on each day.
        <button type="button" className="mf-link-btn no-print" onClick={() => { setLoading(true); load(); }}>
          <FiRefreshCw size={12} /> Refresh
        </button>
      </p>
    </div>
  );
}
