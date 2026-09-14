import { useEffect } from 'react';
import { FiX, FiFilePlus, FiEdit2, FiPhone, FiLayers, FiArrowUpRight } from 'react-icons/fi';
import ModalPortal from '../common/ModalPortal';
import StatusBadge from '../common/StatusBadge';
import { Avatar, ProgressBar, DueChip, Empty } from '../ui';
import { ScoreCard, StandingBadge } from './Standing';
import { fmt0, fmtDay } from '../../utils/format';
import { detectIdType, displayId } from '../../utils/kyc';

const LONG_DATE = { day: '2-digit', month: 'short', year: 'numeric' };

export default function ClientProfileDrawer({ customer, loans, standing, onClose, onEdit, onNewLoan, onOpenLoan }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <ModalPortal>
      <div className="mf-overlay mf-drawer-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
        <aside className="mf-drawer" role="dialog" aria-modal="true" aria-label={`${customer.full_name} profile`}>
          <header className="mf-drawer__head">
            <div className="mf-profile-head">
              <Avatar name={customer.full_name} size={48} />
              <div>
                <div className="mf-eyebrow">Client profile</div>
                <div className="mf-profile-head__name">{customer.full_name}</div>
                <div className="mf-profile-head__meta">
                  <span className="mf-code">CL-{String(customer.id).padStart(5, '0')}</span>
                  <StandingBadge status={standing.status} />
                </div>
              </div>
              <button type="button" className="mf-icon-btn" onClick={onClose} aria-label="Close profile"><FiX size={15} /></button>
            </div>
            <div className="mf-profile-actions">
              <button type="button" className="mf-btn mf-btn--primary mf-btn--sm" onClick={onNewLoan}>
                <FiFilePlus size={13} /> New loan
              </button>
              <button type="button" className="mf-btn mf-btn--ghost mf-btn--sm" onClick={onEdit}>
                <FiEdit2 size={13} /> Edit
              </button>
              {customer.phone && (
                <a className="mf-btn mf-btn--ghost mf-btn--sm" href={`tel:${customer.phone}`}>
                  <FiPhone size={13} /> Call
                </a>
              )}
            </div>
          </header>

          <div className="mf-drawer__body">
            <ScoreCard standing={standing} />

            <section>
              <div className="mf-section-label">Exposure</div>
              <dl className="mf-stat-row">
                <div><dt>Loans</dt><dd>{standing.n}</dd></div>
                <div><dt>Borrowed</dt><dd title={`TZS ${fmt0(standing.borrowed)}`}>{fmt0(standing.borrowed)}</dd></div>
                <div><dt>Repaid</dt><dd className="mf-tone--emerald" title={`TZS ${fmt0(standing.repaid)}`}>{fmt0(standing.repaid)}</dd></div>
                <div><dt>Outstanding</dt><dd className={standing.exposure ? 'mf-tone--orange' : ''} title={`TZS ${fmt0(standing.exposure)}`}>{fmt0(standing.exposure)}</dd></div>
              </dl>
            </section>

            <section>
              <div className="mf-section-label">Identity & contact</div>
              <dl className="mf-dl">
                <div className="mf-dl__item"><dt>Phone</dt><dd className="mf-mono">{customer.phone || '—'}</dd></div>
                <div className="mf-dl__item">
                  <dt>Identification</dt>
                  <dd className="mf-mono">
                    {displayId(customer)}
                    {detectIdType(customer) === 'none' && <> <span className="badge badge--yellow">Unverified</span></>}
                  </dd>
                </div>
                <div className="mf-dl__item mf-dl__item--span"><dt>Address</dt><dd>{customer.address || '—'}</dd></div>
                <div className="mf-dl__item mf-dl__item--span"><dt>Registered</dt><dd>{fmtDay(customer.registration_date, LONG_DATE)}</dd></div>
              </dl>
            </section>

            <section>
              <div className="mf-section-label">Loan history</div>
              {loans.length === 0 ? (
                <div className="mf-card" style={{ margin: 0 }}>
                  <Empty Icon={FiLayers} title="No loans on record"
                    action={<button type="button" className="mf-btn mf-btn--primary mf-btn--sm" onClick={onNewLoan}><FiFilePlus size={13} /> Start application</button>} />
                </div>
              ) : (
                <div className="mf-history">
                  {loans.map(l => {
                    const total = Number(l.total_payable) || 0;
                    const pct = total > 0 ? Math.min(100, Math.round(((Number(l.amount_paid) || 0) / total) * 100)) : 0;
                    return (
                      <button key={l.id} type="button" className="mf-history__item" onClick={() => onOpenLoan(l)}>
                        <div className="mf-history__row">
                          <span className="mf-history__title">
                            <span className="mf-code">#{l.id}</span>
                            <StatusBadge status={l.status} />
                          </span>
                          <span className="mf-history__amount">TZS {fmt0(l.loan_amount)}</span>
                        </div>
                        <ProgressBar value={pct} tone={l.status === 'overdue' ? 'crimson' : l.status === 'paid' ? 'emerald' : 'orange'} />
                        <div className="mf-history__row">
                          <span className="mf-history__meta">
                            {fmtDay(l.start_date, LONG_DATE)} · {pct}% repaid · balance <b>{fmt0(l.balance)}</b>
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem' }}>
                            <DueChip date={l.due_date} status={l.status} />
                            <FiArrowUpRight size={13} className="mf-muted" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </aside>
      </div>
    </ModalPortal>
  );
}
