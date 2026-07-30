import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  FiDownload, FiPrinter, FiBarChart2, FiGrid, FiCreditCard,
  FiAlertTriangle, FiTrendingUp, FiUsers, FiDollarSign, FiActivity,
  FiCalendar, FiClock,
} from 'react-icons/fi';
import jsPDF      from 'jspdf';
import autoTable  from 'jspdf-autotable';
import api                    from '../api';
import { cur, fmtShort }      from '../utils/format';
import StatCard               from '../components/common/StatCard';

/* ── Animation variants ─────────────────────────────────────────── */
const pageIn = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};
const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 26 } },
};
const sectionReveal = {
  hidden:  { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0, 0, 0.2, 1] } },
};

/* ── Mini line chart ──────────────────────────────────────────────── */
function MiniLineChart({ data = [], yKey, color = '#22C55E', gradId }) {
  const W = 500, H = 130, pad = { t: 12, r: 10, b: 28, l: 44 };
  const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;
  if (!data.length) return <p className="chart-empty-msg">No data yet</p>;
  const vals = data.map(d => Number(d[yKey]) || 0);
  const maxV = Math.max(...vals, 1);
  const pts  = data.map((d, i) => ({
    x: pad.l + (data.length > 1 ? i / (data.length - 1) : 0.5) * iW,
    y: pad.t + iH - (vals[i] / maxV) * iH,
    lbl: String(d.month || d.date || '').slice(5, 7),
  }));
  const linePath = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    const prev = pts[i - 1], cx = ((prev.x + p.x) / 2).toFixed(1);
    return `${acc} C ${cx} ${prev.y.toFixed(1)} ${cx} ${p.y.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }, '');
  const fillPath = `${linePath} L ${pts[pts.length-1].x.toFixed(1)} ${(pad.t+iH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(pad.t+iH).toFixed(1)} Z`;
  const yTicks = [0, 0.5, 1].map(f => ({ y: pad.t + iH*(1-f), label: fmtShort(f * maxV) }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
        <clipPath id={`rclip-${gradId}`}><rect x={pad.l} y={pad.t} width={iW} height={iH} /></clipPath>
      </defs>
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} y1={t.y} x2={pad.l+iW} y2={t.y} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 4" />
          <text x={pad.l-4} y={t.y+4} textAnchor="end" fill="var(--gray-400)" fontSize="8" fontFamily="Poppins,sans-serif">{t.label}</text>
        </g>
      ))}
      <path d={fillPath} fill={`url(#${gradId})`} clipPath={`url(#rclip-${gradId})`} />
      <motion.path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: [0.16,1,0.3,1], delay: 0.1 }} />
      {pts.filter((_, i) => pts.length <= 8 || i % Math.ceil(pts.length/8) === 0 || i === pts.length-1)
        .map((p, i) => (
          <text key={i} x={p.x} y={H-4} textAnchor="middle" fill="var(--gray-400)" fontSize="8.5" fontFamily="Poppins,sans-serif">{p.lbl}</text>
        ))}
    </svg>
  );
}

/* ── Mini bar chart ───────────────────────────────────────────────── */
function MiniBarChart({ data = [], yKey, color = '#2563EB', gradId }) {
  const W = 500, H = 130, pad = { t: 12, r: 10, b: 28, l: 44 };
  const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;
  if (!data.length) return <p className="chart-empty-msg">No data yet</p>;
  const vals  = data.map(d => Number(d[yKey]) || 0);
  const maxV  = Math.max(...vals, 1);
  const slotW = iW / data.length;
  const barW  = Math.max(6, slotW * 0.6);
  const yTicks = [0, 0.5, 1].map(f => ({ y: pad.t + iH*(1-f), label: fmtShort(f * maxV) }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.85" />
          <stop offset="100%" stopColor={color} stopOpacity="0.3" />
        </linearGradient>
      </defs>
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} y1={t.y} x2={pad.l+iW} y2={t.y} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 4" />
          <text x={pad.l-4} y={t.y+4} textAnchor="end" fill="var(--gray-400)" fontSize="8" fontFamily="Poppins,sans-serif">{t.label}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const h = (vals[i] / maxV) * iH;
        const x = pad.l + i * slotW + (slotW - barW) / 2;
        return (
          <g key={i}>
            <motion.rect x={x} width={barW} rx="2" ry="2" fill={`url(#${gradId})`}
              initial={{ y: pad.t + iH, height: 0 }}
              animate={{ y: pad.t + iH - h, height: h }}
              transition={{ delay: i * 0.05, duration: 0.5, ease: [0.16,1,0.3,1] }} />
            {(data.length <= 12 || i % Math.ceil(data.length/8) === 0) && (
              <text x={x + barW/2} y={H-4} textAnchor="middle" fill="var(--gray-400)" fontSize="8.5" fontFamily="Poppins,sans-serif">
                {String(d.month || d.date || '').slice(5,7)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ── Tab definitions ──────────────────────────────────────────────── */
const TABS = [
  { id: 'monthly', label: 'Monthly', Icon: FiCalendar      },
  { id: 'daily',   label: 'Daily',   Icon: FiClock         },
  { id: 'overdue', label: 'Overdue', Icon: FiAlertTriangle },
];

/* ════════════════════════════════════════════════════════════════════
   REPORTS PAGE
   ════════════════════════════════════════════════════════════════════ */
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

  /* ── PDF download ─────────────────────────────────────────────── */
  function downloadPDF() {
    const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const date  = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 36, 'F');
    doc.setFillColor(22, 163, 74);
    doc.rect(0, 34, pageW, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text('Baraka Microcredit', 14, 14);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 210, 160);
    doc.text(`Financial Report  ·  ${tab.charAt(0).toUpperCase() + tab.slice(1)} View  ·  ${date}`, 14, 24);

    try {
      const userData = JSON.parse(localStorage.getItem('mf_user') || 'null');
      const imgData  = userData?.email ? localStorage.getItem(`mf_avatar_${userData.email}`) : null;
      if (imgData?.startsWith('data:image')) {
        const imgType = imgData.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(imgData, imgType, pageW - 44, 4, 26, 26);
      }
      if (userData?.name) {
        doc.setFontSize(7.5); doc.setTextColor(130, 180, 130);
        doc.text(`By: ${userData.name}`, pageW - 14, 33, { align: 'right' });
      }
    } catch {}

    doc.setTextColor(31, 41, 55);
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text('Summary', 14, 46);
    autoTable(doc, {
      startY: 50,
      head: [['Metric', 'Value']],
      body: [
        ['Total Customers',   String(summary.customers)],
        ['Total Loans',       String(summary.total_loans)],
        ['Loans Issued',      cur(summary.loans_amount)],
        ['Total Collected',   cur(summary.collected)],
        ['Outstanding',       cur(summary.outstanding)],
        ['Active Loans',      String(summary.active_loans)],
        ['Overdue Loans',     String(summary.overdue_loans)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [240, 247, 255] },
      margin: { left: 14, right: 14 },
    });

    let y = doc.lastAutoTable.finalY + 12;

    if (tab === 'monthly') {
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('Loans Issued — Monthly', 14, y);
      if (monthly.loans.length > 0) {
        autoTable(doc, {
          startY: y + 4,
          head: [['Month', 'Loans Issued', 'Total Amount (TZS)']],
          body: monthly.loans.map(r => [r.month, String(r.loans_issued), cur(r.total_issued)]),
          theme: 'grid', headStyles: { fillColor: [22, 163, 74], fontSize: 9 }, bodyStyles: { fontSize: 9 }, margin: { left: 14, right: 14 },
        });
        y = doc.lastAutoTable.finalY + 10;
      } else { y += 8; }
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('Repayments — Monthly', 14, y);
      if (monthly.repayments.length > 0) {
        autoTable(doc, {
          startY: y + 4,
          head: [['Month', 'Payments', 'Total Collected (TZS)']],
          body: monthly.repayments.map(r => [r.month, String(r.payments), cur(r.total_collected)]),
          theme: 'grid', headStyles: { fillColor: [22, 163, 74], fontSize: 9 }, bodyStyles: { fontSize: 9 }, margin: { left: 14, right: 14 },
        });
      }
    } else if (tab === 'daily') {
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('Loans — Last 30 Days', 14, y);
      if (daily.loans.length > 0) {
        autoTable(doc, {
          startY: y + 4,
          head: [['Date', 'Loans Issued', 'Total Amount (TZS)']],
          body: daily.loans.map(r => [r.date?.slice(0,10), String(r.loans_issued), cur(r.total_issued)]),
          theme: 'grid', headStyles: { fillColor: [8, 145, 178], fontSize: 9 }, bodyStyles: { fontSize: 9 }, margin: { left: 14, right: 14 },
        });
        y = doc.lastAutoTable.finalY + 10;
      } else { y += 8; }
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('Repayments — Last 30 Days', 14, y);
      if (daily.repayments.length > 0) {
        autoTable(doc, {
          startY: y + 4,
          head: [['Date', 'Payments', 'Total Collected (TZS)']],
          body: daily.repayments.map(r => [r.date?.slice(0,10), String(r.payments), cur(r.total_collected)]),
          theme: 'grid', headStyles: { fillColor: [8, 145, 178], fontSize: 9 }, bodyStyles: { fontSize: 9 }, margin: { left: 14, right: 14 },
        });
      }
    } else if (tab === 'overdue') {
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('Overdue Loans', 14, y);
      autoTable(doc, {
        startY: y + 4,
        head: [['Customer', 'Phone', 'Loan Amount', 'Balance (TZS)', 'Due Date']],
        body: overdue.map(l => [l.customer_name, l.customer_phone, cur(l.loan_amount), cur(l.balance), l.due_date?.slice(0,10)]),
        theme: 'grid', headStyles: { fillColor: [220, 38, 38], fontSize: 9 }, bodyStyles: { fontSize: 9 }, margin: { left: 14, right: 14 },
      });
    }

    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5); doc.setTextColor(150);
      doc.text(`Baraka Microcredit  ·  Page ${i} of ${pages}`, pageW / 2, 290, { align: 'center' });
    }
    doc.save(`MF_Report_${tab}_${new Date().toISOString().slice(0,10)}.pdf`);
  }

  /* ── CSV export ───────────────────────────────────────────────── */
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
      csv += 'DAILY LOANS\nDate,Loans Issued,Total Amount (TZS)\n';
      daily.loans.forEach(r => { csv += `${r.date?.slice(0,10)},${r.loans_issued},${r.total_issued}\n`; });
      csv += '\nDAILY REPAYMENTS\nDate,Payments,Total Collected (TZS)\n';
      daily.repayments.forEach(r => { csv += `${r.date?.slice(0,10)},${r.payments},${r.total_collected}\n`; });
    } else if (tab === 'overdue') {
      csv += 'OVERDUE LOANS\nCustomer,Phone,Loan Amount (TZS),Balance (TZS),Due Date\n';
      overdue.forEach(l => { csv += `${l.customer_name},${l.customer_phone},${l.loan_amount},${l.balance},${l.due_date?.slice(0,10)}\n`; });
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `MF_Report_${tab}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return (
    <div className="page-loader"><div className="spinner" /><span>Loading reports…</span></div>
  );

  return (
    <motion.div className="page" id="report-print" variants={pageIn} initial="hidden" animate="visible">

      {/* ── Premium page header ─────────────────────────────── */}
      <motion.div className="rpt-header" variants={sectionReveal}>
        <div className="rpt-header-left">
          <div className="rpt-header-icon"><FiBarChart2 size={20} /></div>
          <div>
            <h1 className="rpt-title">Financial Reports</h1>
            <p className="rpt-subtitle">Analytics, trends &amp; data exports</p>
          </div>
        </div>
        <div className="rpt-header-actions no-print">
          <button className="btn btn--ghost btn--sm" onClick={() => window.print()}>
            <FiPrinter size={14} /> Print
          </button>
          <button className="btn btn--ghost btn--sm" onClick={downloadCSV}>
            <FiGrid size={14} /> CSV
          </button>
          <button className="btn btn--primary btn--sm" onClick={downloadPDF}>
            <FiDownload size={14} /> PDF
          </button>
        </div>
      </motion.div>

      {/* ── Animated stat cards ─────────────────────────────── */}
      <motion.div className="stat-grid" variants={pageIn}>
        <StatCard label="Total Customers"    color="blue"   value={summary.customers}     sub="Registered clients"         Icon={FiUsers}         variants={fadeUp} />
        <StatCard label="Total Loans"        color="green"  value={summary.total_loans}   sub={cur(summary.loans_amount)}  Icon={FiDollarSign}    variants={fadeUp} />
        <StatCard label="Payments Received"  color="teal"   value={summary.repayments}    sub={cur(summary.collected)}     Icon={FiCreditCard}    variants={fadeUp} />
        <StatCard label="Overdue Loans"      color="orange" value={summary.overdue_loans} sub={cur(summary.outstanding)}   Icon={FiAlertTriangle} variants={fadeUp} />
      </motion.div>

      {/* ── Premium tab pills ───────────────────────────────── */}
      <motion.div className="rpt-tabs no-print" variants={sectionReveal}>
        {TABS.map(t => (
          <motion.button
            key={t.id}
            className={`rpt-tab${tab === t.id ? ' rpt-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
          >
            <t.Icon size={13} />
            {t.label}
          </motion.button>
        ))}
      </motion.div>

      {/* ── Tab content ─────────────────────────────────────── */}
      <AnimatePresence mode="wait">

        {tab === 'monthly' && (
          <motion.div key="monthly"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}>
            <div className="rpt-chart-grid">
              <div className="card" style={{ marginBottom: 0 }}>
                <div className="card-header">
                  <h3 className="card-title"><FiTrendingUp size={14} /> Collection Trend</h3>
                </div>
                <MiniLineChart data={monthly.repayments} yKey="total_collected" color="#22C55E" gradId="rpt-col" />
              </div>
              <div className="card" style={{ marginBottom: 0 }}>
                <div className="card-header">
                  <h3 className="card-title"><FiActivity size={14} /> Loan Disbursements</h3>
                </div>
                <MiniBarChart data={monthly.loans} yKey="total_issued" color="#2563EB" gradId="rpt-disb" />
              </div>
            </div>
            <div className="dashboard-grid" style={{ marginTop: '1.25rem' }}>
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title"><FiDollarSign size={14} /> Loans Issued — Monthly</h3>
                </div>
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>Month</th><th>Count</th><th>Amount (TZS)</th></tr></thead>
                    <tbody>
                      {monthly.loans.length === 0
                        ? <tr><td colSpan={3} className="text-center">No data yet</td></tr>
                        : monthly.loans.map(r => (
                          <tr key={r.month}>
                            <td>{r.month}</td>
                            <td><strong>{r.loans_issued}</strong></td>
                            <td><strong className="amount-cell">{cur(r.total_issued)}</strong></td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title"><FiCreditCard size={14} /> Repayments — Monthly</h3>
                </div>
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>Month</th><th>Count</th><th>Collected (TZS)</th></tr></thead>
                    <tbody>
                      {monthly.repayments.length === 0
                        ? <tr><td colSpan={3} className="text-center">No data yet</td></tr>
                        : monthly.repayments.map(r => (
                          <tr key={r.month}>
                            <td>{r.month}</td>
                            <td><strong>{r.payments}</strong></td>
                            <td><strong className="amount-cell">{cur(r.total_collected)}</strong></td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'daily' && (
          <motion.div key="daily"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}>
            <div className="rpt-chart-grid">
              <div className="card" style={{ marginBottom: 0 }}>
                <div className="card-header">
                  <h3 className="card-title"><FiTrendingUp size={14} /> Daily Collection Trend</h3>
                </div>
                <MiniLineChart data={daily.repayments} yKey="total_collected" color="#0D9488" gradId="rpt-dcol" />
              </div>
              <div className="card" style={{ marginBottom: 0 }}>
                <div className="card-header">
                  <h3 className="card-title"><FiActivity size={14} /> Daily Disbursements</h3>
                </div>
                <MiniBarChart data={daily.loans} yKey="total_issued" color="#7C3AED" gradId="rpt-ddisb" />
              </div>
            </div>
            <div className="dashboard-grid" style={{ marginTop: '1.25rem' }}>
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title"><FiDollarSign size={14} /> Loans — Last 30 Days</h3>
                </div>
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>Date</th><th>Count</th><th>Amount (TZS)</th></tr></thead>
                    <tbody>
                      {daily.loans.length === 0
                        ? <tr><td colSpan={3} className="text-center">No data yet</td></tr>
                        : daily.loans.map(r => (
                          <tr key={r.date}>
                            <td>{r.date?.slice(0,10)}</td>
                            <td><strong>{r.loans_issued}</strong></td>
                            <td><strong className="amount-cell">{cur(r.total_issued)}</strong></td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title"><FiCreditCard size={14} /> Repayments — Last 30 Days</h3>
                </div>
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>Date</th><th>Count</th><th>Collected (TZS)</th></tr></thead>
                    <tbody>
                      {daily.repayments.length === 0
                        ? <tr><td colSpan={3} className="text-center">No data yet</td></tr>
                        : daily.repayments.map(r => (
                          <tr key={r.date}>
                            <td>{r.date?.slice(0,10)}</td>
                            <td><strong>{r.payments}</strong></td>
                            <td><strong className="amount-cell">{cur(r.total_collected)}</strong></td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'overdue' && (
          <motion.div key="overdue"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title" style={{ color: 'var(--red)' }}>
                  <FiAlertTriangle size={14} /> Overdue Loans
                </h3>
                <span className="badge badge--red">{overdue.length} loan{overdue.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>#</th><th>Customer</th><th>Phone</th><th>Loan Amount</th><th>Balance (TZS)</th><th>Due Date</th></tr>
                  </thead>
                  <tbody>
                    {overdue.length === 0
                      ? <tr><td colSpan={6} className="text-center" style={{ color: 'var(--green)', padding: '2rem' }}>✓ No overdue loans</td></tr>
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
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
}
