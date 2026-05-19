import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MdPeople, MdAccountBalance, MdPayments,
  MdWarning, MdTrendingUp,
} from 'react-icons/md';
import api        from '../api';
import { fmt }    from '../utils/format';
import StatCard    from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import Spinner     from '../components/common/Spinner';

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [recent,  setRecent]  = useState({ repayments: [], customers: [], loans: [] });
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/reports/summary'),
      api.get('/reports/recent'),
      api.get('/reports/overdue'),
    ]).then(([s, r, o]) => {
      setSummary(s.data);
      setRecent(r.data);
      setOverdue(o.data.slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner text="Loading dashboard…" />;

  return (
    <div className="page">

      {/* ── Overdue Alert Banner ── */}
      {summary.overdue_loans > 0 && (
        <div className="alert-banner alert-banner--warning" onClick={() => navigate('/loans?filter=overdue')}>
          <MdWarning size={20} />
          <span>
            <strong>{summary.overdue_loans} loan{summary.overdue_loans > 1 ? 's' : ''} overdue</strong>
            — click to review
          </span>
          <span className="alert-banner-arrow">→</span>
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="stat-grid">
        <StatCard
          label="Total Customers" color="blue"
          value={summary.customers}
          sub="Registered clients"
          Icon={MdPeople}
          to="/customers"
        />
        <StatCard
          label="Active Loans" color="green"
          value={summary.active_loans}
          sub={`MWK ${fmt(summary.loans_amount)} total issued`}
          Icon={MdAccountBalance}
          to="/loans"
        />
        <StatCard
          label="Total Collected" color="teal"
          value={`MWK ${fmt(summary.collected)}`}
          sub={`${summary.repayments} payments received`}
          Icon={MdPayments}
          to="/repayments"
        />
        <StatCard
          label="Outstanding" color="red"
          value={`MWK ${fmt(summary.outstanding)}`}
          sub={`${summary.overdue_loans} overdue`}
          Icon={MdTrendingUp}
        />
      </div>

      {/* ── Loan Status Pills ── */}
      <div className="loan-status-row">
        {[
          { label: 'Active',  val: summary.loan_status.active,  cls: 'active'  },
          { label: 'Pending', val: summary.loan_status.pending, cls: 'pending' },
          { label: 'Paid',    val: summary.loan_status.paid,    cls: 'paid'    },
          { label: 'Overdue', val: summary.loan_status.overdue, cls: 'overdue' },
        ].map(({ label, val, cls }) => (
          <div key={cls} className={`status-chip status-chip--${cls}`}>
            <span className="status-chip-val">{val || 0}</span>
            <span className="status-chip-lbl">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Main Grid ── */}
      <div className="dashboard-grid">

        {/* Recent Repayments */}
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">
              <MdPayments size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Recent Payments
            </h2>
            <button className="link-btn" onClick={() => navigate('/repayments')}>View all →</button>
          </div>
          {recent.repayments.length === 0
            ? <p className="empty-msg">No payments recorded yet</p>
            : (
              <table className="table">
                <thead>
                  <tr><th>Customer</th><th>Amount</th><th>Date</th><th>Receipt</th></tr>
                </thead>
                <tbody>
                  {recent.repayments.map(r => (
                    <tr key={r.id} className="tr-link" onClick={() => navigate(`/loans/${r.loan_id}`)}>
                      <td><strong>{r.customer_name}</strong></td>
                      <td className="text-green"><strong>MWK {fmt(r.amount)}</strong></td>
                      <td>{r.payment_date?.slice(0, 10)}</td>
                      <td><code>{r.receipt_number}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </section>

        {/* Overdue Loans */}
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">
              <MdWarning size={18} style={{ marginRight: 6, verticalAlign: 'middle', color: 'var(--red)' }} />
              Overdue Loans
            </h2>
            {overdue.length > 0 && (
              <span className="badge badge--red">{overdue.length}</span>
            )}
          </div>
          {overdue.length === 0
            ? <p className="empty-msg" style={{ color: 'var(--green)' }}>✓ No overdue loans</p>
            : (
              <table className="table">
                <thead>
                  <tr><th>Customer</th><th>Due Date</th><th>Balance</th></tr>
                </thead>
                <tbody>
                  {overdue.map(l => (
                    <tr key={l.id} className="tr-link" onClick={() => navigate(`/loans/${l.id}`)}>
                      <td>
                        <strong>{l.customer_name}</strong><br />
                        <small>{l.customer_phone}</small>
                      </td>
                      <td><span className="badge badge--red">{l.due_date?.slice(0, 10)}</span></td>
                      <td><strong className="text-red">MWK {fmt(l.balance)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </section>

        {/* Recent Customers */}
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">
              <MdPeople size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Recent Customers
            </h2>
            <button className="link-btn" onClick={() => navigate('/customers')}>View all →</button>
          </div>
          {recent.customers.length === 0
            ? <p className="empty-msg">No customers yet</p>
            : (
              <table className="table">
                <thead>
                  <tr><th>Name</th><th>Phone</th><th>Loans</th><th>Joined</th></tr>
                </thead>
                <tbody>
                  {recent.customers.map(c => (
                    <tr key={c.id} className="tr-link" onClick={() => navigate('/customers')}>
                      <td><strong>{c.full_name}</strong></td>
                      <td>{c.phone}</td>
                      <td><span className="badge badge--blue">{c.loan_count}</span></td>
                      <td>{c.registration_date?.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </section>

        {/* Recent Loans */}
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">
              <MdAccountBalance size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Recent Loans
            </h2>
            <button className="link-btn" onClick={() => navigate('/loans')}>View all →</button>
          </div>
          {recent.loans.length === 0
            ? <p className="empty-msg">No loans yet</p>
            : (
              <table className="table">
                <thead>
                  <tr><th>Customer</th><th>Amount</th><th>Balance</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {recent.loans.map(l => (
                    <tr key={l.id} className="tr-link" onClick={() => navigate(`/loans/${l.id}`)}>
                      <td><strong>{l.customer_name}</strong></td>
                      <td>MWK {fmt(l.loan_amount)}</td>
                      <td>MWK {fmt(l.balance)}</td>
                      <td><StatusBadge status={l.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </section>

      </div>
    </div>
  );
}
