import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiPrinter, FiDownload, FiMapPin, FiAlertCircle, FiRefreshCw, FiLock,
  FiSave, FiUsers, FiTrendingUp, FiTrendingDown, FiCheckCircle,
} from 'react-icons/fi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { PageHeader, Bi, Empty, TableSkeleton } from '../components/ui';
import { useCanSeeTotals, Mask } from '../components/common/MoneyGuard';
import { MASK } from '../utils/rbac';
import { fmt, fmtDay } from '../utils/format';
import { todayISO } from '../utils/finance';
import { BRANCH, computeSheet, loadDraft, saveDraft, validate } from '../utils/dailySummary';
import '../styles/app/daily.css';

const LONG_DATE = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };

/* Sheet labels — Swahili as written on the paper form, English underneath. */
const L = {
  inflows:    { en: 'Inflows', sw: 'Ndani' },
  cashWallet: { en: 'Hand cash wallet', sw: 'Mkononi' },
  mmWallet:   { en: 'Mobile money wallet', sw: 'M-Pesa / Simu' },
  lalaJana:   { en: 'Opening balance', sw: 'Lala Jana' },
  makusanyo:  { en: 'Collections today', sw: 'Makusanyo Leo' },
  double:     { en: 'Double today', sw: 'Double Leo' },
  faini:      { en: 'Penalties', sw: 'Faini' },
  fomu:       { en: 'Form fees today', sw: 'Fomu Leo' },
  ongezeko:   { en: 'Additions today', sw: 'Ongezeko Leo' },
  makato:     { en: 'Withdrawal fees', sw: 'Makato ya Kutoa' },
  jumlaA:     { en: 'Grand total (A)', sw: 'Jumla Kuu (A)' },
  jumlaB:     { en: 'Grand total (B)', sw: 'Jumla Kuu (B)' },
  outflows:   { en: 'Outflows & balancing', sw: 'Nje na Usawazishaji' },
  gawa:       { en: 'Disbursed today', sw: 'Gawa Leo' },
  code:       { en: 'Code number', sw: 'Namba ya Kodi' },
  matumizi:   { en: 'Expenses today', sw: 'Matumizi Leo' },
  malengo:    { en: 'Target', sw: 'Malengo' },
  totalOut:   { en: 'Total outflows', sw: 'Jumla ya Nje' },
  baki:       { en: 'Balance', sw: 'Baki' },
  grandIn:    { en: 'Total inflows (A + B)', sw: 'Jumla ya Ndani (A + B)' },
  tracking:   { en: 'Operations tracking', sw: 'Mahudhurio na Wateja Wapya' },
  idadi:      { en: 'Total', sw: 'Idadi' },
  hai:        { en: 'Active', sw: 'Hai' },
  waliofika:  { en: 'Arrived', sw: 'Waliofika' },
  wasiofika:  { en: 'Absent', sw: 'Wasiofika' },
  wapya:      { en: 'New clients', sw: 'Wapya' },
  passive:    { en: 'Passive', sw: 'Tulivu' },
  newTable:   { en: 'New clients registered today', sw: 'Wateja Wapya Leo' },
  jina:       { en: 'Name', sw: 'Jina' },
  simu:       { en: 'Phone number', sw: 'Namba ya simu' },
  notes:      { en: 'Operational notes', sw: 'Maelezo ya Uendeshaji' },
  notesHint:  { en: 'Reasons for absentees, follow-ups, incidents…', sw: 'Sababu za wasiofika, ufuatiliaji, matukio…' },
  restricted: { en: 'Financial totals are restricted', sw: 'Jumla za fedha zimezuiliwa' },
  auto:       { en: 'from system', sw: 'kutoka mfumo' },
};

/* ── One money line: figure for super admins, mask for everyone else ── */
function MoneyRow({ label, value, auto, strong, tone, showTotals, children }) {
  return (
    <div className={`mf-ds-row${strong ? ' is-total' : ''}${tone ? ` is-${tone}` : ''}`}>
      <span className="mf-ds-row__label">
        <Bi text={label} block />
        {auto && <span className="mf-ds-chip">{L.auto.en}</span>}
      </span>
      <span className="mf-ds-row__value">
        {showTotals ? (children ?? <><small>TZS</small>{fmt(value)}</>) : <Mask />}
      </span>
    </div>
  );
}

/* ── Editable money line — masked and locked for restricted roles ───── */
function MoneyInput({ label, name, manual, errors, onChange, showTotals, auto, hint }) {
  const error = errors[name];
  return (
    <div className={`mf-ds-row mf-ds-row--input${error ? ' has-error' : ''}`}>
      <label className="mf-ds-row__label" htmlFor={`ds-${name}`}>
        <Bi text={label} block />
        {auto != null && <span className="mf-ds-chip">{L.auto.en}</span>}
      </label>
      <span className="mf-ds-row__value">
        {showTotals ? (
          <input
            id={`ds-${name}`} className="mf-ds-input" type="number" min="0" step="0.01"
            inputMode="decimal" placeholder={auto != null ? fmt(auto) : '0.00'}
            value={manual[name]} onChange={e => onChange(name, e.target.value)}
            aria-invalid={error ? true : undefined}
          />
        ) : (
          <Mask />
        )}
      </span>
      {showTotals && error && <span className="mf-ds-error"><Bi text={error} block /></span>}
      {showTotals && !error && hint && <span className="mf-ds-hint">{hint}</span>}
    </div>
  );
}

function CountInput({ label, name, manual, errors, onChange }) {
  const error = errors[name];
  return (
    <div className={`mf-ds-count${error ? ' has-error' : ''}`}>
      <label className="mf-ds-count__label" htmlFor={`ds-${name}`}><Bi text={label} block /></label>
      <input
        id={`ds-${name}`} className="mf-ds-count__input" type="number" min="0" step="1" inputMode="numeric"
        placeholder="0" value={manual[name]} onChange={e => onChange(name, e.target.value)}
        aria-invalid={error ? true : undefined}
      />
      {error && <span className="mf-ds-error"><Bi text={error} block /></span>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   DAILY OPERATIONS & CASHFLOW SUMMARY
   Money in Sections A and B follows the RBAC rule; counts, the client
   table, the notes and the expenses field stay open to every role.
   ════════════════════════════════════════════════════════════════════ */
export default function DailySummary() {
  const { showToast } = useToast();
  const showTotals = useCanSeeTotals();
  const sheetRef = useRef(null);

  const [date, setDate]       = useState(todayISO());
  const [manual, setManual]   = useState(() => loadDraft(todayISO()));
  const [data, setData]       = useState({ loans: [], repayments: [], expenses: [], customers: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [savedAt, setSavedAt] = useState(null);

  /* Staff-safe endpoints only — /api/reports is admin-only by design */
  const load = useCallback(async () => {
    setError('');
    const [l, r, e, c] = await Promise.allSettled([
      api.get('/loans'), api.get('/repayments'), api.get('/expenses'), api.get('/customers'),
    ]);
    const list = res => (res.status === 'fulfilled' && Array.isArray(res.value.data) ? res.value.data : []);
    if ([l, r, e, c].every(x => x.status === 'rejected')) setError('The day’s data could not be loaded.');
    setData({ loans: list(l), repayments: list(r), expenses: list(e), customers: list(c) });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Each date carries its own draft */
  useEffect(() => { setManual(loadDraft(date)); setSavedAt(null); }, [date]);

  const { errors, warnings } = useMemo(() => validate(manual), [manual]);
  const sheet = useMemo(() => computeSheet({ ...data, date }, manual), [data, date, manual]);

  const onChange = useCallback((name, value) => {
    setManual(prev => {
      const next = { ...prev, [name]: value };
      if (saveDraft(date, next)) setSavedAt(new Date());
      return next;
    });
  }, [date]);

  const money = value => (showTotals ? `TZS ${fmt(value)}` : MASK);

  /* ── PDF ── */
  function downloadPDF() {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const day = fmtDay(date, LONG_DATE);

    doc.setFillColor(30, 30, 36);
    doc.rect(0, 0, pageW, 30, 'F');
    doc.setFillColor(255, 107, 0);
    doc.rect(0, 28, pageW, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text(BRANCH.name, 14, 13);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(`Daily Operations & Cashflow · ${day}`, 14, 22);

    const rows = [
      [`${L.lalaJana.sw} / ${L.lalaJana.en}`, money(sheet.cash.lalaJana), money(sheet.mobile.lalaJana)],
      [`${L.makusanyo.sw}`, money(sheet.cash.collections), money(sheet.mobile.collections)],
      [`${L.double.sw}`,    money(sheet.cash.double),      money(sheet.mobile.double)],
      [`${L.faini.sw}`,     money(sheet.cash.faini),       money(sheet.mobile.faini)],
      [`${L.fomu.sw}`,      money(sheet.cash.formFees),    '—'],
      [`${L.ongezeko.sw}`,  money(sheet.cash.ongezeko),    money(sheet.mobile.ongezeko)],
      [`${L.makato.sw}`,    '—',                           showTotals ? `− TZS ${fmt(sheet.mobile.makato)}` : MASK],
      [`${L.jumlaA.sw} / ${L.jumlaB.sw}`, money(sheet.cash.total), money(sheet.mobile.total)],
    ];
    autoTable(doc, {
      startY: 38,
      head: [['NDANI (Inflows)', 'MKONONI (Cash)', 'M-PESA']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [30, 30, 36], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      styles: { fontSize: 9, cellPadding: 2.4 },
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 6,
      head: [['NJE (Outflows & balancing)', 'Amount']],
      body: [
        [L.gawa.sw, money(sheet.outflow.disbursed)],
        [`${L.matumizi.sw} (${sheet.outflow.expenseCount})`, money(sheet.outflow.expenses)],
        [L.malengo.sw, money(sheet.outflow.target)],
        [L.code.sw, sheet.outflow.codeNumber || '—'],
        [L.totalOut.sw, money(sheet.outflow.totalOut)],
        [`${L.baki.sw} (A + B − ${L.totalOut.sw})`, money(sheet.outflow.baki)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [255, 107, 0], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' } },
      styles: { fontSize: 9, cellPadding: 2.4 },
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 6,
      head: [['MAHUDHURIO', L.idadi.sw, L.hai.sw, L.waliofika.sw, L.wasiofika.sw, L.wapya.sw, 'Double', L.passive.sw]],
      body: [['Wateja', sheet.attendance.total, sheet.attendance.active, sheet.attendance.arrived,
        sheet.attendance.absent, sheet.attendance.newCount, sheet.attendance.double, sheet.attendance.passive].map(String)],
      theme: 'grid',
      headStyles: { fillColor: [30, 30, 36], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2.4, halign: 'center' },
    });

    if (sheet.newClients.length) {
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 6,
        head: [[L.jina.sw, L.simu.sw]],
        body: sheet.newClients.map(c => [c.full_name, c.phone || '—']),
        theme: 'striped',
        headStyles: { fillColor: [60, 60, 71], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 2.4 },
      });
    }
    if (manual.notes.trim()) {
      const y = doc.lastAutoTable.finalY + 8;
      doc.setTextColor(31, 41, 55); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.text(`${L.notes.sw}:`, 14, y);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      doc.text(doc.splitTextToSize(manual.notes.trim(), pageW - 28), 14, y + 5);
    }

    doc.save(`daily-summary-${date}.pdf`);
    showToast('Daily summary exported', 'success');
  }

  const savedLabel = savedAt
    ? `Draft saved ${savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Entries are kept on this device';

  return (
    <div className="mf-page mf-ds" ref={sheetRef}>
      <PageHeader
        eyebrow="Operations"
        title="Daily Operations & Cashflow"
        subtitle="Muhtasari wa shughuli na mtiririko wa fedha wa siku"
        actions={
          <div className="mf-ds-actions no-print">
            <span className="mf-ds-branch" title={BRANCH.unit}>
              <FiMapPin size={14} /> {BRANCH.name}
            </span>
            <label className="mf-ds-date">
              <span className="mf-sr-only">Report date</span>
              <input type="date" className="mf-input" value={date} max={todayISO()}
                onChange={e => setDate(e.target.value || todayISO())} />
            </label>
            <button type="button" className="mf-btn mf-btn--ghost" onClick={() => window.print()}>
              <FiPrinter size={15} /> Print
            </button>
            <button type="button" className="mf-btn mf-btn--primary" onClick={downloadPDF}>
              <FiDownload size={15} /> Export PDF
            </button>
          </div>
        }
      />

      <div className="mf-ds-meta">
        <span className="mf-ds-meta__day">{fmtDay(date, LONG_DATE)}</span>
        <span className="mf-ds-meta__dot" aria-hidden="true">·</span>
        <span className="mf-ds-meta__save"><FiSave size={12} /> {savedLabel}</span>
        <button type="button" className="mf-link-btn no-print" onClick={() => { setLoading(true); load(); }}>
          <FiRefreshCw size={12} /> Refresh
        </button>
      </div>

      {error && (
        <div className="mf-alert mf-alert--error" role="alert">
          <FiAlertCircle size={15} /> {error}
          <button type="button" className="mf-btn mf-btn--sm mf-alert__action" onClick={load}>Retry</button>
        </div>
      )}
      {!showTotals && (
        <div className="mf-alert mf-alert--info no-print" role="note">
          <FiLock size={15} /> <span><Bi text={L.restricted} block /></span>
        </div>
      )}
      {warnings.map((w, i) => (
        <div key={i} className="mf-alert mf-alert--warning" role="status">
          <FiAlertCircle size={15} /> <span><Bi text={w} block /></span>
        </div>
      ))}

      {loading ? (
        <div className="mf-card"><TableSkeleton rows={8} cols={4} /></div>
      ) : (
        <>
          {/* ── SECTION A — INFLOWS / NDANI ── */}
          <section className="mf-ds-section" aria-label="Inflows">
            <header className="mf-ds-section__head">
              <span className="mf-ds-section__tag">A</span>
              <h2 className="mf-ds-section__title"><FiTrendingUp size={15} /> <Bi text={L.inflows} /></h2>
            </header>

            <div className="mf-ds-grid">
              <article className="mf-ds-panel">
                <div className="mf-ds-panel__head"><Bi text={L.cashWallet} block /></div>
                <MoneyInput label={L.lalaJana} name="cash_lala_jana" manual={manual} errors={errors} onChange={onChange} showTotals={showTotals} />
                <MoneyRow label={L.makusanyo} value={sheet.cash.collections} auto showTotals={showTotals} />
                <MoneyInput label={L.double} name="cash_double" manual={manual} errors={errors} onChange={onChange} showTotals={showTotals} />
                <MoneyInput label={L.faini} name="cash_faini" manual={manual} errors={errors} onChange={onChange} showTotals={showTotals} />
                <MoneyRow label={L.fomu} value={sheet.cash.formFees} auto showTotals={showTotals} />
                <MoneyInput label={L.ongezeko} name="cash_ongezeko" manual={manual} errors={errors} onChange={onChange} showTotals={showTotals} />
                <MoneyRow label={L.jumlaA} value={sheet.cash.total} strong showTotals={showTotals} />
              </article>

              <article className="mf-ds-panel">
                <div className="mf-ds-panel__head"><Bi text={L.mmWallet} block /></div>
                <MoneyInput label={L.lalaJana} name="mm_lala_jana" manual={manual} errors={errors} onChange={onChange} showTotals={showTotals} />
                <MoneyRow label={L.makusanyo} value={sheet.mobile.collections} auto showTotals={showTotals} />
                <MoneyInput label={L.double} name="mm_double" manual={manual} errors={errors} onChange={onChange} showTotals={showTotals} />
                <MoneyInput label={L.faini} name="mm_faini" manual={manual} errors={errors} onChange={onChange} showTotals={showTotals} />
                <MoneyInput label={L.ongezeko} name="mm_ongezeko" manual={manual} errors={errors} onChange={onChange} showTotals={showTotals} />
                <MoneyInput label={L.makato} name="mm_makato" manual={manual} errors={errors} onChange={onChange}
                  showTotals={showTotals} auto={sheet.mobile.autoMakato} hint="Deducted from (B)" />
                <MoneyRow label={L.jumlaB} value={sheet.mobile.total} strong showTotals={showTotals} />
              </article>
            </div>
          </section>

          {/* ── SECTION B — OUTFLOWS / NJE ── */}
          <section className="mf-ds-section" aria-label="Outflows and balancing">
            <header className="mf-ds-section__head">
              <span className="mf-ds-section__tag">B</span>
              <h2 className="mf-ds-section__title"><FiTrendingDown size={15} /> <Bi text={L.outflows} /></h2>
            </header>

            <div className="mf-ds-outflow">
              <div className="mf-ds-stat">
                <span className="mf-ds-stat__label"><Bi text={L.gawa} block /><span className="mf-ds-chip">{L.auto.en}</span></span>
                <span className="mf-ds-stat__value">{showTotals ? <><small>TZS</small>{fmt(sheet.outflow.disbursed)}</> : <Mask />}</span>
                <span className="mf-ds-stat__sub">{sheet.counts.loans} loan{sheet.counts.loans === 1 ? '' : 's'} today</span>
              </div>

              <div className="mf-ds-stat">
                <span className="mf-ds-stat__label"><Bi text={L.code} block /></span>
                <input id="ds-code_number" className={`mf-ds-input mf-ds-input--code${errors.code_number ? ' has-error' : ''}`}
                  type="text" maxLength={40} placeholder="e.g. RM/2026/09" value={manual.code_number}
                  onChange={e => onChange('code_number', e.target.value)}
                  aria-invalid={errors.code_number ? true : undefined} aria-label="Code number" />
                {errors.code_number && <span className="mf-ds-error"><Bi text={errors.code_number} block /></span>}
              </div>

              {/* Expenses stay readable and editable for every role */}
              <div className="mf-ds-stat">
                <span className="mf-ds-stat__label"><Bi text={L.matumizi} block /><span className="mf-ds-chip">{L.auto.en}</span></span>
                <span className="mf-ds-stat__value"><small>TZS</small>{fmt(sheet.outflow.expenses)}</span>
                <span className="mf-ds-stat__sub">{sheet.outflow.expenseCount} record{sheet.outflow.expenseCount === 1 ? '' : 's'}</span>
              </div>

              <div className="mf-ds-stat">
                <span className="mf-ds-stat__label"><Bi text={L.malengo} block /></span>
                <span className="mf-ds-stat__value">
                  {showTotals
                    ? <input id="ds-target" className={`mf-ds-input${errors.target ? ' has-error' : ''}`} type="number" min="0" step="0.01"
                        inputMode="decimal" placeholder="0.00" value={manual.target}
                        onChange={e => onChange('target', e.target.value)} aria-label="Target" />
                    : <Mask />}
                </span>
                {showTotals && errors.target && <span className="mf-ds-error"><Bi text={errors.target} block /></span>}
              </div>

              <div className="mf-ds-stat mf-ds-stat--out">
                <span className="mf-ds-stat__label"><Bi text={L.totalOut} block /></span>
                <span className="mf-ds-stat__value">{showTotals ? <><small>TZS</small>{fmt(sheet.outflow.totalOut)}</> : <Mask />}</span>
                <span className="mf-ds-stat__sub">Gawa + Matumizi</span>
              </div>

              <div className={`mf-ds-stat mf-ds-stat--baki${sheet.outflow.baki < 0 ? ' is-negative' : ''}`}>
                <span className="mf-ds-stat__label"><Bi text={L.baki} block /></span>
                <span className="mf-ds-stat__value">{showTotals ? <><small>TZS</small>{fmt(sheet.outflow.baki)}</> : <Mask />}</span>
                <span className="mf-ds-stat__sub">(A + B) − {L.totalOut.sw}</span>
              </div>
            </div>

            <div className="mf-ds-balance">
              <span><Bi text={L.grandIn} /></span>
              <b>{showTotals ? `TZS ${fmt(sheet.outflow.grandIn)}` : <Mask />}</b>
            </div>
          </section>

          {/* ── SECTION C — OPERATIONS TRACKING ── */}
          <section className="mf-ds-section" aria-label="Operations tracking">
            <header className="mf-ds-section__head">
              <span className="mf-ds-section__tag">C</span>
              <h2 className="mf-ds-section__title"><FiUsers size={15} /> <Bi text={L.tracking} /></h2>
            </header>

            <div className="mf-ds-attendance">
              <CountInput label={L.idadi} name="att_total" manual={manual} errors={errors} onChange={onChange} />
              <CountInput label={L.hai} name="att_active" manual={manual} errors={errors} onChange={onChange} />
              <CountInput label={L.waliofika} name="att_arrived" manual={manual} errors={errors} onChange={onChange} />
              <CountInput label={L.wasiofika} name="att_absent" manual={manual} errors={errors} onChange={onChange} />
              <div className="mf-ds-count mf-ds-count--auto">
                <span className="mf-ds-count__label"><Bi text={L.wapya} block /></span>
                <span className="mf-ds-count__value">{sheet.attendance.newCount}</span>
                <span className="mf-ds-chip">{L.auto.en}</span>
              </div>
              <CountInput label={{ en: 'Double', sw: 'Double' }} name="att_double" manual={manual} errors={errors} onChange={onChange} />
              <CountInput label={L.passive} name="att_passive" manual={manual} errors={errors} onChange={onChange} />
            </div>

            <div className="mf-ds-grid mf-ds-grid--wide">
              <article className="mf-ds-panel mf-ds-panel--flush">
                <div className="mf-ds-panel__head"><Bi text={L.newTable} block /></div>
                {sheet.newClients.length === 0 ? (
                  <Empty Icon={FiCheckCircle} title="No new clients on this date"
                    message="Clients registered on the selected day appear here automatically." />
                ) : (
                  <table className="mf-table mf-ds-table">
                    <thead>
                      <tr>
                        <th className="mf-ds-table__idx">#</th>
                        <th>{L.jina.sw} · {L.jina.en}</th>
                        <th>{L.simu.sw} · {L.simu.en}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sheet.newClients.map((c, i) => (
                        <tr key={c.id}>
                          <td className="mf-ds-table__idx">{String(i + 1).padStart(2, '0')}</td>
                          <td>{c.full_name}</td>
                          <td className="mf-mono">{c.phone || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </article>

              <article className="mf-ds-panel">
                <div className="mf-ds-panel__head"><Bi text={L.notes} block /></div>
                <textarea
                  className="mf-ds-notes" rows={9} maxLength={2000} value={manual.notes}
                  onChange={e => onChange('notes', e.target.value)}
                  placeholder={`${L.notesHint.en}\n${L.notesHint.sw}`}
                  aria-label={L.notes.en}
                />
                <div className="mf-ds-notes__count">{manual.notes.length} / 2000</div>
              </article>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
