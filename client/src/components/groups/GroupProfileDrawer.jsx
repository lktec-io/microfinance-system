import { useEffect, useState } from 'react';
import { FiX, FiUsers, FiFilePlus, FiStar, FiAlertCircle } from 'react-icons/fi';
import api from '../../api';
import ModalPortal from '../common/ModalPortal';
import { fmt0, fmtDay } from '../../utils/format';
import { displayNin } from '../../utils/nida';
import { formatMonths, identityLabel, MARITAL_OPTIONS, OWNERSHIP_OPTIONS } from '../../utils/groups';
import { t } from '../../i18n/bilingual';
import '../../styles/app/groups.css';

const LONG_DATE = { day: '2-digit', month: 'short', year: 'numeric' };
const pad = id => `CL-${String(id).padStart(5, '0')}`;
const optionLabel = (options, value) => options.find(o => o.value === value)?.en || value || '—';

function identityText(member) {
  if (member.identity_type === 'None' || !member.identity_number) return 'No formal ID';
  const label = t(identityLabel(member.identity_type).key).en;
  return `${label}: ${member.identity_type === 'NIDA' ? displayNin(member.identity_number) : member.identity_number}`;
}

/** Group profile — GET /api/groups/:id with members and their businesses. */
export default function GroupProfileDrawer({ groupId, onClose, onNewLoan }) {
  const [state, setState] = useState({ status: 'loading', group: null });

  useEffect(() => {
    let alive = true;
    setState({ status: 'loading', group: null });
    api.get(`/groups/${groupId}`)
      .then(({ data }) => { if (alive) setState({ status: 'ready', group: data }); })
      .catch(() => { if (alive) setState({ status: 'error', group: null }); });
    return () => { alive = false; };
  }, [groupId]);

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const g = state.group;
  const members = Array.isArray(g?.members) ? g.members : [];

  return (
    <ModalPortal>
      <div className="mf-overlay mf-drawer-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
        <aside className="mf-drawer" role="dialog" aria-modal="true" aria-label={g ? `${g.group_name} group profile` : 'Group profile'}>
          <header className="mf-drawer__head">
            <div className="mf-profile-head">
              <span className="mf-grp-avatar" aria-hidden="true"><FiUsers size={20} /></span>
              <div>
                <div className="mf-eyebrow">Group profile · Kikundi</div>
                <div className="mf-profile-head__name">{g?.group_name || (state.status === 'error' ? 'Group' : 'Loading…')}</div>
                {g && (
                  <div className="mf-profile-head__meta">
                    <span className="mf-code">{pad(g.customer_id)}</span>
                    <span className="badge badge--orange">{g.member_count} members</span>
                  </div>
                )}
              </div>
              <button type="button" className="mf-icon-btn" onClick={onClose} aria-label="Close group profile"><FiX size={15} /></button>
            </div>
            {g && (
              <div className="mf-profile-actions">
                <button type="button" className="mf-btn mf-btn--primary mf-btn--sm" onClick={() => onNewLoan(g)}>
                  <FiFilePlus size={13} /> New group loan
                </button>
              </div>
            )}
          </header>

          <div className="mf-drawer__body">
            {state.status === 'loading' && <div className="skeleton" style={{ height: 180 }} aria-busy="true" />}
            {state.status === 'error' && (
              <div className="mf-alert mf-alert--error" role="alert"><FiAlertCircle size={15} /> Group details could not be loaded.</div>
            )}

            {g && (
              <>
                <section>
                  <div className="mf-section-label">Group</div>
                  <dl className="mf-dl">
                    <div className="mf-dl__item"><dt>Business activity</dt><dd>{g.business_type}</dd></div>
                    <div className="mf-dl__item"><dt>Market</dt><dd>{g.market_name}</dd></div>
                    <div className="mf-dl__item mf-dl__item--span"><dt>Business location</dt><dd>{g.business_location}</dd></div>
                    <div className="mf-dl__item"><dt>Operating together</dt><dd>{formatMonths(g.operational_duration_together)}</dd></div>
                    <div className="mf-dl__item"><dt>Registered</dt><dd>{fmtDay(g.created_at, LONG_DATE)}</dd></div>
                  </dl>
                </section>

                <dl className="mf-grp-summary">
                  <div><dt>Members</dt><dd>{g.member_count}</dd></div>
                  <div><dt>Weekly sales</dt><dd>TZS {fmt0(g.weekly_sales)}</dd></div>
                  <div><dt>Weekly profit</dt><dd className="is-accent">TZS {fmt0(g.weekly_profit)}</dd></div>
                  <div><dt>Loans</dt><dd>{g.loan_count}</dd></div>
                </dl>

                <section>
                  <div className="mf-section-label">Members · Wanachama</div>
                  <div className="mf-grp-list">
                    {members.map(m => (
                      <article key={m.id} className={`mf-grp-person${m.is_leader ? ' is-leader' : ''}`}>
                        <div className="mf-grp-person__head">
                          <span className="mf-grp-person__name">{m.full_name}</span>
                          {m.is_leader && <span className="badge badge--orange"><FiStar size={11} /> Leader · Kiongozi</span>}
                        </div>
                        <div className="mf-grp-person__meta">
                          <span className="mf-mono">{m.phone_number}</span> · {identityText(m)} · {optionLabel(MARITAL_OPTIONS, m.marital_status)}
                        </div>
                        <div className="mf-grp-person__meta">
                          Parent / guardian: {m.parent_or_guardian_name} · {m.residential_area} ({formatMonths(m.residency_duration)}) · {m.residential_address}
                        </div>
                        {m.business && (
                          <div className="mf-grp-person__biz">
                            <strong>{m.business.business_name} · {m.business.business_type}</strong>
                            <span className="mf-grp-person__meta">
                              {m.business.room_or_location_number ? `Room ${m.business.room_or_location_number} · ` : ''}
                              {formatMonths(m.business.business_duration)} in business · {optionLabel(OWNERSHIP_OPTIONS, m.business.ownership_type)}
                            </span>
                            <span className="mf-grp-person__meta">
                              Weekly sales TZS {fmt0(m.business.average_weekly_sales)} · profit TZS {fmt0(m.business.average_weekly_profit)}
                            </span>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        </aside>
      </div>
    </ModalPortal>
  );
}
