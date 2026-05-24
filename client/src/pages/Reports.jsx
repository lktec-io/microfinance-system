import { useEffect, useState } from 'react';
import { FiDownload, FiPrinter, FiBarChart2, FiGrid, FiCreditCard, FiAlertTriangle, FiTrendingUp } from 'react-icons/fi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api     from '../api';
import { fmt } from '../utils/format';

function cur(n) { return `TZS ${fmt(n)}`; }

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState({ loans: [], repayments: [] });
  const [daily,   setDaily]   = useState({ loans: [], repayments: [] });
  const [overdue, setOverdue] = useState([]);
  const [tab,     setTab]     = useState('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/reports/summary'),
      api.get('/reports/monthly'),
      api.get('/reports/daily'),
      api.get('/reports/overdue'),
    ]).then(([s, m, d, o]) => {
      setSummary(s.data);
      setMonthly(m.data);
      setDaily(d.data);
      setOverdue(o.data);
    }).finally(() => setLoading(false));
  }, []);

  /* ── PDF download ── */
  function downloadPDF() {
    const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const pageW = doc.internal.pageSize.getWidth();

    /* Header */
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageW, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text('Baraka Microcredit', 14, 14);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text(`Financial Report  ·  Generated: ${date}`, 14, 23);

    /* Summary Section */
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text('Summary', 14, 44);

    autoTable(doc, {
      startY: 48,
      head: [['Metric', 'Value']],
      body: [
        ['Total Customers',   String(summary.customers)],
        ['Total Loans',       String(summary.total_loans)],
        ['Loans Issued',      cur(summary.loans_amount)],
        ['Total Collected',   cur(summary.collected)],
        ['Outstanding Balance', cur(summary.outstanding)],
        ['Active Loans',      String(summary.active_loans)],
        ['Overdue Loans',     String(summary.overdue_loans)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [219, 234, 254] },
      margin: { left: 14, right: 14 },
    });

    let y = doc.lastAutoTable.finalY + 12;

    /* Tab-specific data */
    if (tab === 'monthly') {
      doc.setFontSize(13); doc.setFont('helvetica', 'bold');
      doc.text('Loans Issued — Monthly', 14, y);
      if (monthly.loans.length > 0) {
        autoTable(doc, {
          startY: y + 4,
          head: [['Month', 'Loans Issued', 'Total Amount (TZS)']],
          body: monthly.loans.map(r => [r.month, String(r.loans_issued), cur(r.total_issued)]),
          theme: 'grid',
          headStyles: { fillColor: [5, 150, 105], fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        });
        y = doc.lastAutoTable.finalY + 10;
      } else { y += 8; }

      doc.setFontSize(13); doc.setFont('helvetica', 'bold');
      doc.text('Repayments — Monthly', 14, y);
      if (monthly.repayments.length > 0) {
        autoTable(doc, {
          startY: y + 4,
          head: [['Month', 'Payments', 'Total Collected (TZS)']],
          body: monthly.repayments.map(r => [r.month, String(r.payments), cur(r.total_collected)]),
          theme: 'grid',
          headStyles: { fillColor: [5, 150, 105], fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        });
      }
    } else if (tab === 'daily') {
      doc.setFontSize(13); doc.setFont('helvetica', 'bold');
      doc.text('Loans — Last 30 Days', 14, y);
      if (daily.loans.length > 0) {
        autoTable(doc, {
          startY: y + 4,
          head: [['Date', 'Loans Issued', 'Total Amount (TZS)']],
          body: daily.loans.map(r => [r.date?.slice(0,10), String(r.loans_issued), cur(r.total_issued)]),
          theme: 'grid',
          headStyles: { fillColor: [8, 145, 178], fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        });
        y = doc.lastAutoTable.finalY + 10;
      } else { y += 8; }

      doc.setFontSize(13); doc.setFont('helvetica', 'bold');
      doc.text('Repayments — Last 30 Days', 14, y);
      if (daily.repayments.length > 0) {
        autoTable(doc, {
          startY: y + 4,
          head: [['Date', 'Payments', 'Total Collected (TZS)']],
          body: daily.repayments.map(r => [r.date?.slice(0,10), String(r.payments), cur(r.total_collected)]),
          theme: 'grid',
          headStyles: { fillColor: [8, 145, 178], fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        });
      }
    } else if (tab === 'overdue') {
      doc.setFontSize(13); doc.setFont('helvetica', 'bold');
      doc.text('Overdue Loans', 14, y);
      autoTable(doc, {
        startY: y + 4,
        head: [['Customer', 'Phone', 'Loan Amount', 'Balance (TZS)', 'Due Date']],
        body: overdue.map(l => [
          l.customer_name, l.customer_phone,
          cur(l.loan_amount), cur(l.balance),
          l.due_date?.slice(0,10),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [220, 38, 38], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });
    }

    /* Footer */
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8); doc.setTextColor(150);
      doc.text(`Baraka Microcredit  ·  Page ${i} of ${pages}`, pageW / 2, 290, { align: 'center' });
    }

    doc.save(`MF_Report_${tab}_${new Date().toISOString().slice(0,10)}.pdf`);
  }

  /* ── CSV export ── */
  function downloadCSV() {
    const date = new Date().toLocaleDateString('en-GB');
    let csv = `Baraka Microcredit — Financial Report\nGenerated: ${date}\n\n`;

    csv += 'SUMMARY\nMetric,Value\n';
    csv += `Total Customers,${summary.customers}\n`;
    csv += `Total Loans,${summary.total_loans}\n`;
    csv += `Loans Issued,${cur(summary.loans_amount)}\n`;
    csv += `Total Collected,${cur(summary.collected)}\n`;
    csv += `Outstanding,${cur(summary.outstanding)}\n`;
    csv += `Active Loans,${summary.active_loans}\n`;
    csv += `Overdue Loans,${summary.overdue_loans}\n\n`;

    if (tab === 'monthly') {
      csv += 'MONTHLY LOANS\nMonth,Loans Issued,Total Amount (TZS)\n';
      monthly.loans.forEach(r => { csv += `${r.month},${r.loans_issued},${r.total_issued}\n`; });
      csv += '\nMONTHLY REPAYMENTS\nMonth,Payments,Total Collected (TZS)\n';
      monthly.repayments.forEach(r => { csv += `${r.month},${r.payments},${r.total_collected}\n`; });
    } else if (tab === 'daily') {
      csv += 'DAILY LOANS (LAST 30 DAYS)\nDate,Loans Issued,Total Amount (TZS)\n';
      daily.loans.forEach(r => { csv += `${r.date?.slice(0,10)},${r.loans_issued},${r.total_issued}\n`; });
      csv += '\nDAILY REPAYMENTS (LAST 30 DAYS)\nDate,Payments,Total Collected (TZS)\n';
      daily.repayments.forEach(r => { csv += `${r.date?.slice(0,10)},${r.payments},${r.total_collected}\n`; });
    } else if (tab === 'overdue') {
      csv += 'OVERDUE LOANS\nCustomer,Phone,Loan Amount (TZS),Balance (TZS),Due Date\n';
      overdue.forEach(l => { csv += `${l.customer_name},${l.customer_phone},${l.loan_amount},${l.balance},${l.due_date?.slice(0,10)}\n`; });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `MF_Report_${tab}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return (
    <div className="page-loader"><div className="spinner" /><span>Loading reports…</span></div>
  );

  return (
    <div className="page" id="report-print">

      {/* ── Toolbar ── */}
      <div className="page-toolbar no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <FiBarChart2 size={22} style={{ color: 'var(--primary)' }} />
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--gray-800)' }}>
            Financial Reports
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
          <button className="btn btn--ghost" onClick={() => window.print()}>
            <FiPrinter size={16} /> Print
          </button>
          <button className="btn btn--ghost" onClick={downloadCSV}>
            <FiGrid size={16} /> Export CSV
          </button>
          <button className="btn btn--primary" onClick={downloadPDF}>
            <FiDownload size={16} /> Download PDF
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="stat-grid">
        <div className="stat-card stat-card--blue">
          <div className="stat-card-inner">
            <div>
              <div className="stat-value">{summary.customers}</div>
              <div className="stat-label">Total Customers</div>
            </div>
          </div>
        </div>
        <div className="stat-card stat-card--green">
          <div className="stat-card-inner">
            <div>
              <div className="stat-value">{summary.total_loans}</div>
              <div className="stat-label">Total Loans</div>
              <div className="stat-sub">{cur(summary.loans_amount)}</div>
            </div>
          </div>
        </div>
        <div className="stat-card stat-card--teal">
          <div className="stat-card-inner">
            <div>
              <div className="stat-value">{cur(summary.collected)}</div>
              <div className="stat-label">Total Collected</div>
              <div className="stat-sub">{summary.repayments} payments</div>
            </div>
          </div>
        </div>
        <div className="stat-card stat-card--red">
          <div className="stat-card-inner">
            <div>
              <div className="stat-value">{cur(summary.outstanding)}</div>
              <div className="stat-label">Outstanding</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="tabs no-print">
        {['monthly','daily','overdue'].map(t => (
          <button key={t} className={`tab${tab === t ? ' tab--active' : ''}`}
            onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'monthly' && (
        <div className="dashboard-grid">
          <div className="card">
            <h3 className="card-title"><FiTrendingUp size={15} /> Loans Issued — Monthly</h3>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Month</th><th>Count</th><th>Amount (TZS)</th></tr></thead>
                <tbody>
                  {monthly.loans.length === 0
                    ? <tr><td colSpan={3} className="text-center">No data yet</td></tr>
                    : monthly.loans.map(r => (
                      <tr key={r.month}>
                        <td>{r.month}</td>
                        <td>{r.loans_issued}</td>
                        <td><strong className="amount-cell">{cur(r.total_issued)}</strong></td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
          <div className="card">
            <h3 className="card-title"><FiCreditCard size={15} /> Repayments — Monthly</h3>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Month</th><th>Count</th><th>Collected (TZS)</th></tr></thead>
                <tbody>
                  {monthly.repayments.length === 0
                    ? <tr><td colSpan={3} className="text-center">No data yet</td></tr>
                    : monthly.repayments.map(r => (
                      <tr key={r.month}>
                        <td>{r.month}</td>
                        <td>{r.payments}</td>
                        <td><strong className="amount-cell">{cur(r.total_collected)}</strong></td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'daily' && (
        <div className="dashboard-grid">
          <div className="card">
            <h3 className="card-title"><FiTrendingUp size={15} /> Loans — Last 30 Days</h3>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Date</th><th>Count</th><th>Amount (TZS)</th></tr></thead>
                <tbody>
                  {daily.loans.length === 0
                    ? <tr><td colSpan={3} className="text-center">No data yet</td></tr>
                    : daily.loans.map(r => (
                      <tr key={r.date}>
                        <td>{r.date?.slice(0,10)}</td>
                        <td>{r.loans_issued}</td>
                        <td><strong className="amount-cell">{cur(r.total_issued)}</strong></td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
          <div className="card">
            <h3 className="card-title"><FiCreditCard size={15} /> Repayments — Last 30 Days</h3>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Date</th><th>Count</th><th>Collected (TZS)</th></tr></thead>
                <tbody>
                  {daily.repayments.length === 0
                    ? <tr><td colSpan={3} className="text-center">No data yet</td></tr>
                    : daily.repayments.map(r => (
                      <tr key={r.date}>
                        <td>{r.date?.slice(0,10)}</td>
                        <td>{r.payments}</td>
                        <td><strong className="amount-cell">{cur(r.total_collected)}</strong></td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'overdue' && (
        <div className="card">
          <h3 className="card-title"><FiAlertTriangle size={15} /> Overdue Loans</h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th><th>Customer</th><th>Phone</th>
                  <th>Loan Amount</th><th>Balance (TZS)</th><th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {overdue.length === 0
                  ? <tr><td colSpan={6} className="text-center" style={{ color: 'var(--green)' }}>✓ No overdue loans</td></tr>
                  : overdue.map((l, i) => (
                    <tr key={l.id}>
                      <td>{i + 1}</td>
                      <td><strong>{l.customer_name}</strong></td>
                      <td>{l.customer_phone}</td>
                      <td>{cur(l.loan_amount)}</td>
                      <td><strong className="text-red">{cur(l.balance)}</strong></td>
                      <td><span className="badge badge--red">{l.due_date?.slice(0, 10)}</span></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
