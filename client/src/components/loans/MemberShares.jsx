import { FiUsers, FiAlertTriangle, FiCheckCircle, FiDivide } from 'react-icons/fi';
import { fmt } from '../../utils/format';
import '../../styles/app/members.css';

/** Equal split of `total` across `count` members, remainder on the first row. */
export function equalSplit(total, count) {
  if (!count) return [];
  const each = Math.floor((total / count) * 100) / 100;
  const shares = Array(count).fill(each);
  const used = each * count;
  shares[0] = Math.round((each + (total - used)) * 100) / 100;
  return shares;
}

export const sharesTotal = shares =>
  Math.round(Object.values(shares).reduce((s, v) => s + (Number(v) || 0), 0) * 100) / 100;

/** null when the split is good to submit, otherwise the reason. */
export function sharesError(shares, members, total) {
  if (!members.length) return 'This group has no members on record';
  for (const m of members) {
    const v = Number(shares[m.id]);
    if (!Number.isFinite(v) || v <= 0) return `Enter ${m.full_name}’s agreed share`;
  }
  const sum = sharesTotal(shares);
  if (Math.abs(sum - total) > 1) {
    return `Shares add up to TZS ${fmt(sum)} — they must match the total payable of TZS ${fmt(total)}`;
  }
  return null;
}

/** Build the API payload: [{ group_member_id, agreed_share }]. */
export const sharesPayload = (shares, members) =>
  members.map(m => ({ group_member_id: m.id, agreed_share: Number(shares[m.id]) || 0 }));

/**
 * Who repays what inside a group loan.
 *
 * The operator types each member's agreed share; the shares must add up to the
 * loan's total payable. Those targets are what member-level repayments and the
 * per-member 5% incentive are measured against.
 */
export default function MemberShares({ members, shares, onChange, total, loading, error, show }) {
  const sum = sharesTotal(shares);
  const diff = Math.round((total - sum) * 100) / 100;
  const balanced = Math.abs(diff) <= 1 && sum > 0;

  if (loading) return <div className="skeleton" style={{ height: 120 }} aria-busy="true" />;

  if (!members.length) {
    return (
      <div className="mf-alert mf-alert--warning">
        <FiAlertTriangle size={15} /> This group has no members on record, so repayments will be collected for the group as a whole.
      </div>
    );
  }

  return (
    <div className="mf-field mf-field--span">
      <span className="mf-label">
        <FiUsers size={13} style={{ marginRight: 6, verticalAlign: '-2px' }} />
        Agreed share per member · Mgawanyo wa kila mwanachama<span className="mf-req">*</span>
      </span>
      <p className="mf-shares__hint">
        Each member repays their own agreed share. These targets drive member-level collections and the
        5% refundable incentive, so they must add up to the total payable.
      </p>

      <div className="mf-shares">
        {members.map((m, i) => (
          <div className="mf-shares__row" key={m.id}>
            <span className="mf-shares__who">
              <span className="mf-shares__name">{m.full_name}</span>
              <span className="mf-shares__meta">
                {m.phone_number}{m.is_leader ? ' · leader' : ''}
              </span>
            </span>
            <input
              className="mf-shares__input"
              type="number" min="0" step="0.01" inputMode="decimal"
              aria-label={`${m.full_name} agreed share`}
              placeholder="0.00"
              value={shares[m.id] ?? ''}
              onChange={e => onChange(m.id, e.target.value)}
              autoFocus={i === 0 && !shares[m.id]}
            />
          </div>
        ))}

        <div className={`mf-shares__tally${balanced ? ' is-balanced' : ''}`}>
          <span>
            {balanced ? <><FiCheckCircle size={13} /> Shares match the total payable</> : 'Allocated so far'}
          </span>
          <span>
            <b>TZS {fmt(sum)}</b> of <b>TZS {fmt(total)}</b>
            {!balanced && diff !== 0 && (
              <> · {diff > 0 ? `TZS ${fmt(diff)} left` : `TZS ${fmt(Math.abs(diff))} over`}</>
            )}
          </span>
        </div>

        <div className="mf-shares__split">
          <button type="button" className="mf-btn mf-btn--ghost mf-btn--sm"
            onClick={() => onChange('__equal__')} disabled={!total}>
            <FiDivide size={13} /> Split equally
          </button>
          <button type="button" className="mf-btn mf-btn--ghost mf-btn--sm" onClick={() => onChange('__clear__')}>
            Clear
          </button>
        </div>
      </div>

      {show && error && <span className="mf-error-text">{error}</span>}
    </div>
  );
}
