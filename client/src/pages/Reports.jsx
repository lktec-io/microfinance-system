import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  FiUser, FiUsers, FiFileText, FiDownload, FiPrinter, FiRefreshCw, FiAlertCircle,
} from 'react-icons/fi';
import api from '../api';
import { PageHeader, Tabs, SearchField } from '../components/ui';
import { useCanSeeTotals } from '../components/common/MoneyGuard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { IndividualView, GroupView, ExecutiveView } from '../components/reports/views';
import TicketSheet from '../components/reports/TicketSheet';
import { downloadStatementTicket, downloadTransactionTicket } from '../utils/voucher';
import { runPrint } from '../utils/print';
import '../styles/app/ledger.css';

const TABS = [
  { value: 'individuals', label: 'Individual Loans', Icon: FiUser },
  { value: 'groups',      label: 'Group Lending',    Icon: FiUsers },
  { value: 'executive',   label: 'Executive Sheet',  Icon: FiFileText },
];

/* ════════════════════════════════════════════════════════════════════
   EXECUTIVE MICROCREDIT FINANCIAL TERMINAL
   Three input-free views over the reporting API. Admin-only module (the
   API refuses /api/reports for staff); the RBAC mask is still applied to
   every figure on screen and inside every generated file.
   ════════════════════════════════════════════════════════════════════ */
export default function Reports() {
  const navigate = useNavigate();
  const showTotals = useCanSeeTotals();
  const { user } = useAuth();
  const { showToast } = useToast();
  const operator = user?.name || null;

  const [tab, setTab] = useState('individuals');
  const [query, setQuery] = useState('');
  const [individuals, setIndividuals] = useState(null);
  const [groups, setGroups] = useState(null);
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ticket, setTicket] = useState(null);

  const load = useCallback(async () => {
    setError('');
    const [i, g, s] = await Promise.allSettled([
      api.get('/reports/individuals'), api.get('/reports/groups'), api.get('/reports/statement'),
    ]);
    if (i.status === 'fulfilled') setIndividuals(i.value.data || null);
    if (g.status === 'fulfilled') setGroups(g.value.data || null);
    if (s.status === 'fulfilled') setStatement(s.value.data || null);
    if ([i, g, s].every(x => x.status === 'rejected')) {
      setError(i.reason?.response?.data?.message || 'Reports could not be loaded.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Tickets: both paths produce the same perforated 80mm layout ── */
  function downloadTicket() {
    const saved = downloadStatementTicket(statement, { showTotals, operator });
    showToast(saved ? 'Financial_Statement_Ticket.pdf saved to your device' : 'The browser blocked the download',
      saved ? 'success' : 'error');
  }

  function downloadEntryTicket(entry) {
    const saved = downloadTransactionTicket(entry, { showTotals, operator });
    showToast(saved ? `Ticket_${entry.reference}.pdf saved to your device` : 'The browser blocked the download',
      saved ? 'success' : 'error');
  }

  function printTicket(kind = 'statement', entry = null) {
    setTicket({ kind, entry });
    runPrint({ receipt: true, onDone: () => setTicket(null) });
  }

  const searchable = tab !== 'executive';

  return (
    <div className="mf-page mf-reports">
      <PageHeader
        eyebrow="Reporting"
        title="Financial Terminal"
        subtitle="Individual lending, group performance and the grand executive sheet."
        actions={
          <>
            <button type="button" className="mf-btn mf-btn--ghost" onClick={load} disabled={loading}>
              <FiRefreshCw size={14} className={loading ? 'mf-spin' : undefined} /> Refresh
            </button>
            <button type="button" className="mf-btn mf-btn--ghost" onClick={() => printTicket('statement')}
              disabled={!statement}>
              <FiPrinter size={15} /> Print ticket
            </button>
            <button type="button" className="mf-btn mf-btn--primary" onClick={downloadTicket} disabled={!statement}>
              <FiDownload size={15} /> Download ticket
            </button>
          </>
        }
      />

      {error && (
        <div className="mf-alert mf-alert--error" role="alert">
          <FiAlertCircle size={15} /> {error}
          <button type="button" className="mf-btn mf-btn--sm mf-alert__action" onClick={load}>Retry</button>
        </div>
      )}

      <Tabs
        value={tab}
        onChange={t => { setTab(t); setQuery(''); }}
        tabs={TABS.map(t => ({
          ...t,
          count: t.value === 'individuals' ? individuals?.clients?.length
            : t.value === 'groups' ? groups?.groups?.length : undefined,
        }))}
      />

      {searchable && (
        <div className="mf-toolbar no-print">
          <div className="mf-toolbar__group">
            <span className="mf-toolbar__meta">
              {tab === 'individuals' ? 'Single-client operations' : 'Group portfolios and their members'}
            </span>
          </div>
          <div className="mf-toolbar__group">
            <SearchField value={query} onChange={setQuery}
              placeholder={tab === 'individuals' ? 'Client, phone or ID' : 'Group, market or leader'} />
          </div>
        </div>
      )}

      {loading ? (
        <div className="mf-kpi" aria-busy="true">
          {[0, 1, 2, 3].map(i => (
            <div className="mf-kpi__cell" key={i}><span className="skeleton" style={{ height: 52 }} /></div>
          ))}
        </div>
      ) : tab === 'individuals' ? (
        <IndividualView
          data={individuals}
          showTotals={showTotals}
          query={query}
          onOpenClient={c => navigate(`/customers?client=${c.id}`)}
        />
      ) : tab === 'groups' ? (
        <GroupView data={groups} showTotals={showTotals} query={query} />
      ) : statement ? (
        <ExecutiveView statement={statement} showTotals={showTotals} onVoucher={downloadEntryTicket} />
      ) : (
        <div className="mf-alert mf-alert--error" role="alert">
          <FiAlertCircle size={15} /> The executive sheet is unavailable.
          <button type="button" className="mf-btn mf-btn--sm mf-alert__action" onClick={load}>Retry</button>
        </div>
      )}

      {/* The thermal ticket lives off-screen; print CSS reveals it */}
      {ticket && createPortal(
        <div className="mf-print-surface" aria-hidden="true">
          <TicketSheet
            kind={ticket.kind}
            entry={ticket.entry}
            statement={statement}
            operator={operator}
            showTotals={showTotals}
          />
        </div>,
        document.body,
      )}
    </div>
  );
}
