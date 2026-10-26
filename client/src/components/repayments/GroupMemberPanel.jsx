import { useCallback, useEffect, useState } from 'react';
import {
  FiUsers, FiPlus, FiAlertCircle, FiCheckCircle, FiGift, FiRefreshCw, FiClock,
} from 'react-icons/fi';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Empty, TableSkeleton, ProgressBar } from '../ui';
import { fmt } from '../../utils/format';
import { t } from '../../i18n/bilingual';
import '../../styles/app/members.css';

const REFUND_BADGE = {
  pending:   'badge--gray',
  eligible:  'badge--green',
  forfeited: 'badge--red',
  paid:      'badge--blue',
};

/**
 * Member-by-member collections for one group loan.
 *
 * A group loan is still one loan, but each member carries their own agreed
 * share. Every row posts its own repayment, so Joyce, Mary and Lulu are
 * recorded independently and each earns (or forfeits) her own 5% incentive.
 *
 * `onRecord(member)` opens the shared Record Payment modal for that member.
 */
export default function GroupMemberPanel({ loan, onRecord, reloadKey = 0 }) {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const [state, setState] = useState({ status: 'loading', rows: [] });
  const [payingOut, setPayingOut] = useState(null);

  const load = useCallback(async () => {
    if (!loan?.id) return;
    setState(s => ({ ...s, status: s.rows.length ? 'ready' : 'loading' }));
    try {
      const { data } = await api.get(`/loans/${loan.id}/members`);
      setState({ status: 'ready', rows: Array.isArray(data) ? data : [] });
    } catch {
      setState({ status: 'error', rows: [] });
    }
  }, [loan?.id]);

  useEffect(() => { load(); }, [load, reloadKey]);

  async function payOut(row) {
    setPayingOut(row.group_member_id);
    try {
      await api.patch(`/loans/${loan.id}/members/${row.group_member_id}/refund`);
      showToast(`${row.full_name}'s refund marked as paid`, 'success');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not mark the refund as paid', 'error');
    } finally {
      setPayingOut(null);
    }
  }

  if (state.status === 'loading') return <div className="mf-card mf-card--flush"><TableSkeleton rows={3} cols={5} /></div>;

  if (state.status === 'error') {
    return (
      <div className="mf-alert mf-alert--error" role="alert">
        <FiAlertCircle size={15} /> Group members could not be loaded.
        <button type="button" className="mf-btn mf-btn--sm mf-alert__action" onClick={load}>Retry</button>
      </div>
    );
  }

  if (!state.rows.length) {
    return (
      <Empty
        Icon={FiUsers}
        title="No member shares on this loan"
        message="This group loan was booked without agreed member shares, so repayments are recorded for the group as a whole."
      />
    );
  }

  const totals = state.rows.reduce((acc, r) => ({
    target: acc.target + r.agreed_share,
    paid: acc.paid + r.paid,
    balance: acc.balance + r.balance,
  }), { target: 0, paid: 0, balance: 0 });
  const settled = state.rows.filter(r => r.settled).length;

  return (
    <section className="mf-members" aria-label="Group members">
      <header className="mf-members__head">
        <div>
          <h3 className="mf-members__title">
            <FiUsers size={15} /> {loan.group_name || loan.customer_name}
          </h3>
          <p className="mf-members__sub">
            {state.rows.length} member{state.rows.length === 1 ? '' : 's'} · {settled} on target ·
            record each person&apos;s repayment separately
          </p>
        </div>
        <button type="button" className="mf-btn mf-btn--ghost mf-btn--sm no-print" onClick={load}>
          <FiRefreshCw size={13} /> Refresh
        </button>
      </header>

      <div className="mf-table-wrap">
        <table className="mf-table mf-table--stack mf-members__table">
          <thead>
            <tr>
              <th>Member · Mwanachama</th>
              <th className="is-num">Target (TZS)</th>
              <th className="is-num">Paid (TZS)</th>
              <th className="is-num">Remaining (TZS)</th>
              <th>Progress</th>
              <th>5% incentive</th>
              <th className="is-actions" aria-label="Record repayment" />
            </tr>
          </thead>
          <tbody>
            {state.rows.map(r => {
              const status = r.refund_status || 'pending';
              const state$ = t(`fee.refundStatus.${status}`);
              return (
                <tr key={r.group_member_id} className={r.settled ? 'is-settled' : undefined}>
                  <td>
                    <div className="mf-cell-stack">
                      <span className="mf-cell-title">{r.full_name}</span>
                      <span className="mf-cell-sub mf-mono">{r.phone_number}</span>
                    </div>
                  </td>
                  <td className="is-num" data-label="Target (TZS)">{fmt(r.agreed_share)}</td>
                  <td className="is-num" data-label="Paid (TZS)">{fmt(r.paid)}</td>
                  <td className={`is-num${r.balance > 0 ? '' : ' mf-tone--emerald'}`} data-label="Remaining (TZS)">
                    <strong>{fmt(r.balance)}</strong>
                  </td>
                  <td data-label="Progress">
                    <div className="mf-members__progress">
                      <ProgressBar value={r.progress} tone={r.settled ? 'emerald' : 'orange'} />
                      <span className="mf-members__pct">
                        {r.settled ? <><FiCheckCircle size={11} /> settled</> : `${r.progress}%`}
                      </span>
                    </div>
                  </td>
                  <td data-label="5% incentive">
                    <div className="mf-members__refund">
                      <span className={`badge ${REFUND_BADGE[status]}`} title={state$.en}>
                        {r.refund_amount == null ? '—' : `TZS ${fmt(r.refund_amount)}`}
                      </span>
                      <span className="mf-members__refund-state">{state$.en}</span>
                      {isAdmin && status === 'eligible' && (
                        <button type="button" className="mf-btn mf-btn--sm mf-btn--ghost no-print"
                          onClick={() => payOut(r)} disabled={payingOut === r.group_member_id}>
                          <FiGift size={12} /> {payingOut === r.group_member_id ? 'Saving…' : 'Mark paid'}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="is-actions">
                    <button type="button" className="mf-btn mf-btn--primary mf-btn--sm no-print"
                      onClick={() => onRecord(r)} disabled={r.settled}
                      title={r.settled ? `${r.full_name} has met her target` : `Record a repayment for ${r.full_name}`}>
                      <FiPlus size={13} /> Record
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>Group total</td>
              <td className="is-num" data-label="Target (TZS)">{fmt(totals.target)}</td>
              <td className="is-num" data-label="Paid (TZS)">{fmt(totals.paid)}</td>
              <td className="is-num" data-label="Remaining (TZS)">{fmt(totals.balance)}</td>
              <td colSpan={3}>
                <span className="mf-members__foot-note">
                  <FiClock size={11} /> Shares were agreed when the loan was booked
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
