import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiArrowRight, FiCheck, FiUserPlus, FiUser, FiUsers, FiAlertTriangle,
  FiInfo, FiCheckCircle, FiExternalLink, FiEdit2, FiAlertCircle, FiSearch, FiGift,
} from 'react-icons/fi';
import api from '../../api';
import { Modal, Stepper, SearchField, Avatar, Empty, Bi } from '../ui';
import ClientFields, { initialClientForm, checkClientId, clientPayload } from '../clients/ClientFields';
import { ScoreCard, StandingBadge } from '../clients/Standing';
import StatusBadge from '../common/StatusBadge';
import LoanTermsFields, { EMPTY_TERMS, validateTerms } from './LoanTermsFields';
import QuotePanel from './QuotePanel';
import SecurityFields, { EMPTY_SECURITY_DRAFTS, securitiesPayload, securityDraftsDirty } from './SecurityFields';
import SecurityList from './SecurityList';
import {
  clientStanding, loanQuote, indicativeSchedule, todayISO, GROUP_REFUND_RATE, PROCESSING_FEE_RATE,
} from '../../utils/finance';
import { fmt, fmt0, fmtDay } from '../../utils/format';
import { detectIdType, displayId } from '../../utils/kyc';
import { frequencyLabel, money, perInterval } from '../../utils/labels';
import { formatMonths } from '../../utils/groups';
import { t } from '../../i18n/bilingual';
import '../../styles/app/groups.css';

const STEPS = [
  { key: 'applicant', label: 'Applicant',  hint: 'Individual or group'       },
  { key: 'terms',     label: 'Loan terms', hint: 'Amount, rate & frequency'  },
  { key: 'security',  label: 'Security / Dhamana', hint: 'Guarantors & collateral' },
  { key: 'review',    label: 'Review',     hint: 'Confirm & submit'          },
];
const STEP = { applicant: 0, terms: 1, security: 2, review: 3 };

const LOAN_TYPES = [
  { value: 'individual', key: 'loan.type.individual', Icon: FiUser  },
  { value: 'group',      key: 'loan.type.group',      Icon: FiUsers },
];

const LONG_DATE = { day: '2-digit', month: 'short', year: 'numeric' };
const clientCode = id => `CL-${String(id).padStart(5, '0')}`;

/* ── Individual applicant profile ──────────────────────────────────── */
function ApplicantProfile({ customer, standing }) {
  if (!customer) {
    return (
      <div className="mf-applicant mf-applicant--empty">
        <Empty Icon={FiUser} title="No applicant selected"
          message="Choose a client from the directory, or register a new one." />
      </div>
    );
  }
  const open = standing.active + standing.pending;

  return (
    <div className="mf-applicant">
      <div className="mf-applicant__head">
        <Avatar name={customer.full_name} size={44} />
        <div>
          <div className="mf-eyebrow">Applicant profile</div>
          <div className="mf-applicant__name">{customer.full_name}</div>
          <div className="mf-cell-sub mf-mono">{clientCode(customer.id)}</div>
        </div>
        <StandingBadge status={standing.status} />
      </div>

      <dl className="mf-dl">
        <div className="mf-dl__item"><dt>Phone</dt><dd className="mf-mono">{customer.phone || '—'}</dd></div>
        <div className="mf-dl__item"><dt>Identification</dt><dd className="mf-mono">{displayId(customer)}</dd></div>
        <div className="mf-dl__item"><dt>Registered</dt><dd>{fmtDay(customer.registration_date, LONG_DATE)}</dd></div>
        <div className="mf-dl__item"><dt>Loans on record</dt><dd className="mf-num">{standing.n}</dd></div>
        <div className="mf-dl__item mf-dl__item--span"><dt>Address</dt><dd>{customer.address || '—'}</dd></div>
      </dl>

      <dl className="mf-stat-row">
        <div><dt>Open</dt><dd>{open}</dd></div>
        <div><dt>Overdue</dt><dd className={standing.overdue ? 'mf-tone--crimson' : ''}>{standing.overdue}</dd></div>
        <div><dt>Repaid</dt><dd>{standing.paid}</dd></div>
        <div><dt>Exposure</dt><dd title={`TZS ${fmt(standing.exposure)}`}>{fmt0(standing.exposure)}</dd></div>
      </dl>

      <ScoreCard standing={standing} />

      {detectIdType(customer) === 'none' && (
        <div className="mf-alert mf-alert--warning">
          <FiAlertTriangle size={15} /> <span><Bi text={t('kyc.noneExisting')} block /></span>
        </div>
      )}
      <StandingAlerts standing={standing} />
    </div>
  );
}

/* ── Group applicant profile ───────────────────────────────────────── */
function GroupApplicantProfile({ group, standing }) {
  if (!group) {
    return (
      <div className="mf-applicant mf-applicant--empty">
        <Empty Icon={FiUsers} title="No group selected" message="Choose a registered group, or register a new one." />
      </div>
    );
  }
  const open = standing.active + standing.pending;
  const refund = t('fee.refundTitle', { rate: GROUP_REFUND_RATE });

  return (
    <div className="mf-applicant">
      <div className="mf-applicant__head">
        <span className="mf-grp-avatar" aria-hidden="true"><FiUsers size={20} /></span>
        <div>
          <div className="mf-eyebrow">Group applicant · Kikundi</div>
          <div className="mf-applicant__name">{group.group_name}</div>
          <div className="mf-cell-sub mf-mono">{clientCode(group.customer_id)}</div>
        </div>
        <StandingBadge status={standing.status} />
      </div>

      <dl className="mf-dl">
        <div className="mf-dl__item"><dt>Market</dt><dd>{group.market_name}</dd></div>
        <div className="mf-dl__item"><dt>Members</dt><dd className="mf-num">{group.member_count}</dd></div>
        <div className="mf-dl__item mf-dl__item--span"><dt>Business location</dt><dd>{group.business_location}</dd></div>
        <div className="mf-dl__item"><dt>Operating together</dt><dd>{formatMonths(group.operational_duration_together)}</dd></div>
        <div className="mf-dl__item"><dt>Loans on record</dt><dd className="mf-num">{standing.n}</dd></div>
        <div className="mf-dl__item mf-dl__item--span">
          <dt>Group leader · Kiongozi</dt>
          <dd>{group.leader_name || '—'} <span className="mf-mono">{group.leader_phone || ''}</span></dd>
        </div>
      </dl>

      <dl className="mf-stat-row">
        <div><dt>Open loans</dt><dd>{open}</dd></div>
        <div><dt>Overdue</dt><dd className={standing.overdue ? 'mf-tone--crimson' : ''}>{standing.overdue}</dd></div>
        <div><dt>Weekly sales</dt><dd title={`TZS ${fmt(group.weekly_sales)}`}>{fmt0(group.weekly_sales)}</dd></div>
        <div><dt>Weekly profit</dt><dd title={`TZS ${fmt(group.weekly_profit)}`}>{fmt0(group.weekly_profit)}</dd></div>
      </dl>

      <div className="mf-alert mf-alert--info">
        <FiGift size={15} /> <span><Bi text={refund} block /></span>
      </div>
      <StandingAlerts standing={standing} />
    </div>
  );
}

function StandingAlerts({ standing }) {
  const open = standing.active + standing.pending;
  return (
    <>
      {standing.overdue > 0 && (
        <div className="mf-alert mf-alert--danger">
          <FiAlertTriangle size={15} />
          <span>Applicant has <strong>{standing.overdue}</strong> overdue loan{standing.overdue === 1 ? '' : 's'}. Review arrears before approving new credit.</span>
        </div>
      )}
      {standing.overdue === 0 && open > 0 && (
        <div className="mf-alert mf-alert--warning">
          <FiInfo size={15} />
          <span>Applicant already carries <strong>{open}</strong> open loan{open === 1 ? '' : 's'} with <strong className="mf-mono">TZS {fmt0(standing.exposure)}</strong> outstanding.</span>
        </div>
      )}
      {standing.n === 0 && (
        <div className="mf-alert mf-alert--info">
          <FiInfo size={15} /> First-time borrower — no repayment history in this system.
        </div>
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════
   WIZARD — individual and group loan applications
   ════════════════════════════════════════════════════════════════════ */
export default function LoanApplicationWizard({
  customers, loans, initialCustomerId, initialTerms,
  onClose, onCreated, onCustomerCreated, onViewLoan,
}) {
  const navigate = useNavigate();
  const initialCustomer = customers.find(c => String(c.id) === String(initialCustomerId));

  const [step, setStep]             = useState(STEP.applicant);
  const [loanType, setLoanType]     = useState(initialCustomer?.group_id ? 'group' : 'individual');
  const [customerId, setCustomerId] = useState(initialCustomerId ? String(initialCustomerId) : '');
  const [query, setQuery]           = useState('');

  const [groups, setGroups]             = useState([]);
  const [groupsStatus, setGroupsStatus] = useState('loading');   // loading | ready | error

  const [registering, setRegistering]         = useState(false);
  const [clientForm, setClientForm]           = useState(() => initialClientForm());
  const [clientSaving, setClientSaving]       = useState(false);
  const [clientErr, setClientErr]             = useState('');
  const [clientAttempted, setClientAttempted] = useState(false);
  const [clientShake, setClientShake]         = useState(0);
  const clientCheck = checkClientId(clientForm, { customers });

  const [terms, setTerms]     = useState({ ...EMPTY_TERMS, start_date: todayISO(), ...(initialTerms || {}) });
  const [touched, setTouched] = useState(false);

  const [securities, setSecurities]               = useState([]);
  const [securityDrafts, setSecurityDrafts]       = useState(EMPTY_SECURITY_DRAFTS);
  const [securityAttempted, setSecurityAttempted] = useState(false);
  const securityDirty = securityDraftsDirty(securityDrafts);

  const [ack, setAck]         = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [created, setCreated] = useState(null);

  useEffect(() => {
    let alive = true;
    api.get('/groups')
      .then(({ data }) => { if (alive) { setGroups(Array.isArray(data) ? data : []); setGroupsStatus('ready'); } })
      .catch(() => { if (alive) setGroupsStatus('error'); });
    return () => { alive = false; };
  }, []);

  const loansByCustomer = useMemo(() => {
    const map = {};
    for (const l of loans) (map[l.customer_id] ||= []).push(l);
    return map;
  }, [loans]);

  /* ── The applicant: an individual client, or a group's borrower record ── */
  const selectedCustomer = customers.find(c => String(c.id) === String(customerId)) || null;

  // A group's borrower record always applies as a group (also when the directory loads after a deep link)
  useEffect(() => {
    if (selectedCustomer?.group_id && loanType !== 'group') setLoanType('group');
  }, [selectedCustomer?.group_id, loanType]);

  const group = loanType === 'group'
    ? groups.find(g => String(g.customer_id) === String(customerId)) || null
    : null;
  const applicant = loanType === 'group'
    ? (group ? (selectedCustomer || {
        id: group.customer_id, full_name: group.group_name, phone: group.leader_phone,
        address: `${group.market_name}, ${group.business_location}`, group_id: group.id,
      }) : null)
    : (selectedCustomer && !selectedCustomer.group_id ? selectedCustomer : null);

  const standing = useMemo(
    () => clientStanding(applicant ? loansByCustomer[applicant.id] || [] : []),
    [applicant, loansByCustomer],
  );

  const individuals = useMemo(() => customers.filter(c => !c.group_id), [customers]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? individuals.filter(c =>
          c.full_name?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.id_number?.toLowerCase().includes(q))
      : individuals;
    return list.slice(0, 60);
  }, [individuals, query]);

  const groupResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups.filter(g => !q || [g.group_name, g.market_name, g.leader_name, g.leader_phone, clientCode(g.customer_id)]
      .some(v => String(v || '').toLowerCase().includes(q)));
  }, [groups, query]);

  const termErrors = validateTerms(terms);
  const termsValid = Object.keys(termErrors).length === 0;
  const quote      = termsValid ? loanQuote({ ...terms, loan_type: loanType }) : null;
  const schedule   = quote ? indicativeSchedule(quote, 6) : [];

  function chooseLoanType(type) {
    if (type === loanType) return;
    setLoanType(type);
    setCustomerId('');
    setQuery('');
    setRegistering(false);
  }

  async function registerClient(e) {
    e.preventDefault();
    setClientAttempted(true);
    setClientErr('');
    if (clientCheck.blocking) {
      setClientShake(k => k + 1);
      return;
    }
    setClientSaving(true);
    try {
      const { data } = await api.post('/customers', clientPayload(clientForm, clientCheck));
      onCustomerCreated?.(data);
      setCustomerId(String(data.id));
      setRegistering(false);
      setClientForm(initialClientForm());
      setClientAttempted(false);
    } catch (err) {
      setClientErr(err.response?.data?.message || 'Failed to register client');
    } finally {
      setClientSaving(false);
    }
  }

  function next() {
    if (step === STEP.applicant && !applicant) return;
    if (step === STEP.terms) {
      setTouched(true);
      if (!termsValid) return;
    }
    if (step === STEP.security && securityDirty) {
      setSecurityAttempted(true);
      return;
    }
    setStep(s => Math.min(STEPS.length - 1, s + 1));
  }

  async function submit() {
    if (!applicant || !termsValid || !ack) return;
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/loans', {
        customer_id:         applicant.id,
        loan_type:           loanType,
        group_id:            loanType === 'group' ? group?.id ?? null : null,
        loan_amount:         terms.loan_amount,
        interest_rate:       terms.interest_rate,
        duration_value:      terms.duration_value,
        duration_unit:       terms.duration_unit,
        repayment_frequency: terms.repayment_frequency,
        start_date:          terms.start_date,
        purpose:             terms.purpose,
        securities:          securitiesPayload(securities),
      });
      const loan = { ...data, customer_name: applicant.full_name, customer_phone: applicant.phone };
      setCreated({ ...loan, securityCount: securities.length });
      onCreated?.(loan);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create loan');
    } finally {
      setSaving(false);
    }
  }

  const goRegisterGroup = () => {
    onClose();
    navigate('/customers?newGroup=1');
  };

  /* ── Footer per state ── */
  let footer;
  if (created) {
    footer = (
      <>
        <button type="button" className="mf-btn mf-btn--ghost" onClick={onClose}>Close</button>
        <span className="mf-modal__foot-spacer" />
        <button type="button" className="mf-btn mf-btn--primary" onClick={() => onViewLoan(created)}>
          View loan <FiExternalLink size={14} />
        </button>
      </>
    );
  } else {
    footer = (
      <>
        {step === STEP.applicant
          ? <button type="button" className="mf-btn mf-btn--ghost" onClick={onClose}>Cancel</button>
          : <button type="button" className="mf-btn mf-btn--ghost" onClick={() => setStep(s => s - 1)}><FiArrowLeft size={14} /> Back</button>}
        <span className="mf-modal__foot-spacer" />
        <span className="mf-picker__hint">Step {step + 1} of {STEPS.length}</span>
        {step < STEPS.length - 1 ? (
          <button type="button" className="mf-btn mf-btn--primary" onClick={next}
            disabled={step === STEP.applicant && (!applicant || registering)}>
            Continue <FiArrowRight size={14} />
          </button>
        ) : (
          <button type="button" className="mf-btn mf-btn--primary" onClick={submit} disabled={!ack || saving}>
            {saving ? <><span className="mf-spinner-inline" /> Booking loan…</> : <><FiCheck size={14} /> Submit application</>}
          </button>
        )}
      </>
    );
  }

  const installmentPlan = quote?.installment
    ? t('freq.installments', { count: quote.installmentCount, amount: money(quote.installment) })
    : null;
  const feeLabel    = t('fee.processing', { rate: PROCESSING_FEE_RATE });
  const refundLabel = t('fee.refundTitle', { rate: GROUP_REFUND_RATE });
  const typeLabel   = t(`loan.type.${loanType}`);

  return (
    <Modal
      size="xl"
      eyebrow="Loan origination · Form ya mkopo"
      title={created ? 'Application complete' : 'New loan application'}
      subtitle={created ? undefined : 'Individual or group applicant, terms, guarantors or collateral, then review.'}
      onClose={onClose}
      dismissible={false}
      footer={footer}
    >
      <div className="mf-wizard">
        {!created && (
          <div className="mf-wizard__stepper"><Stepper steps={STEPS} current={step} /></div>
        )}

        {/* ── Success ── */}
        {created && (
          <div className="mf-success">
            <span className="mf-success__icon"><FiCheckCircle size={26} /></span>
            <div className="mf-eyebrow">Loan booked · {t(`loan.type.${created.loan_type === 'group' ? 'group' : 'individual'}`).en}</div>
            <h3 className="mf-success__title">Loan #{created.id} created for {created.customer_name}</h3>
            <p className="mf-success__sub">Figures below are the values stored by the server.</p>
            <dl className="mf-dl">
              <div className="mf-dl__item"><dt>Principal</dt><dd className="mf-num">TZS {fmt(created.loan_amount)}</dd></div>
              <div className="mf-dl__item"><dt>Total payable</dt><dd className="mf-num">TZS {fmt(created.total_payable)}</dd></div>
              <div className="mf-dl__item"><dt>Due date</dt><dd>{fmtDay(created.due_date, LONG_DATE)}</dd></div>
              <div className="mf-dl__item"><dt>Status</dt><dd><StatusBadge status={created.status} /></dd></div>
              <div className="mf-dl__item">
                <dt>Installments</dt>
                <dd className="mf-num">
                  {created.installment_count
                    ? `${created.installment_count} × TZS ${money(created.installment_amount)} ${perInterval(created.repayment_frequency).en}`
                    : '—'}
                </dd>
              </div>
              <div className="mf-dl__item"><dt>Guarantors &amp; assets</dt><dd className="mf-num">{created.securityCount}</dd></div>
              <div className="mf-dl__item">
                <dt>{feeLabel.en} — collect now</dt>
                <dd className="mf-num">{created.processing_fee != null ? `TZS ${fmt(created.processing_fee)}` : '—'}</dd>
              </div>
              {created.loan_type === 'group' && (
                <div className="mf-dl__item">
                  <dt>{refundLabel.en}</dt>
                  <dd className="mf-num">{created.refund_incentive_amount != null ? `TZS ${fmt(created.refund_incentive_amount)}` : '—'}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* ── Step 1: Applicant (individual or group) ── */}
        {!created && step === STEP.applicant && (
          <div className="mf-wizard__pane" key="applicant">
            <div className="mf-wizard__split">
              <div className="mf-picker">
                <div className="mf-wizard__heading">
                  <h3>Who is applying?</h3>
                  <p>Choose an individual client or a registered group. Selection loads the applicant’s standing.</p>
                </div>

                <div className="mf-choice" role="radiogroup" aria-label={t('loan.type.label').en}>
                  {LOAN_TYPES.map(o => {
                    const label  = t(o.key);
                    const active = loanType === o.value;
                    return (
                      <label key={o.value} className={`mf-choice__opt${active ? ' is-active' : ''}`}>
                        <input type="radio" className="mf-sr-only" name="loan-type" value={o.value}
                          checked={active} onChange={() => chooseLoanType(o.value)} />
                        <o.Icon size={18} aria-hidden="true" />
                        <span className="mf-choice__text">
                          <span className="mf-choice__en">{label.en}</span>
                          <span className="mf-choice__sw" lang="sw">{label.sw}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className="mf-picker__bar">
                  <SearchField value={query} onChange={setQuery}
                    placeholder={loanType === 'group' ? 'Search group, market or leader' : 'Search name, phone or ID number'} />
                  {loanType === 'group' ? (
                    <button type="button" className="mf-btn mf-btn--dark" onClick={goRegisterGroup}>
                      <FiUsers size={14} /> New group
                    </button>
                  ) : (
                    <button type="button" className={`mf-btn ${registering ? 'mf-btn--ghost' : 'mf-btn--dark'}`}
                      onClick={() => { setRegistering(r => !r); setClientErr(''); setClientAttempted(false); }}>
                      <FiUserPlus size={14} /> {registering ? 'Cancel' : 'New client'}
                    </button>
                  )}
                </div>

                {loanType === 'group' ? (
                  groupsStatus === 'loading' ? (
                    <div className="skeleton" style={{ height: 160 }} aria-busy="true" />
                  ) : groupsStatus === 'error' ? (
                    <div className="mf-alert mf-alert--error"><FiAlertCircle size={15} /> Groups could not be loaded.</div>
                  ) : groupResults.length === 0 ? (
                    <Empty Icon={FiUsers} title={query ? 'No matching groups' : 'No groups registered yet'}
                      message={query ? `Nothing matches “${query}”.` : 'Register a group with its members first.'}
                      action={!query && <button type="button" className="mf-btn mf-btn--primary mf-btn--sm" onClick={goRegisterGroup}><FiUsers size={13} /> Register group</button>} />
                  ) : (
                    <div className="mf-picker__list" role="listbox" aria-label="Groups">
                      {groupResults.map(g => {
                        const st  = clientStanding(loansByCustomer[g.customer_id] || []);
                        const sel = String(g.customer_id) === String(customerId);
                        return (
                          <button key={g.id} type="button" role="option" aria-selected={sel}
                            className={`mf-picker__item${sel ? ' is-selected' : ''}`}
                            onClick={() => setCustomerId(String(g.customer_id))}>
                            <span className="mf-grp-avatar mf-grp-avatar--sm" aria-hidden="true"><FiUsers size={16} /></span>
                            <span className="mf-cell-stack">
                              <span className="mf-cell-title">{g.group_name}</span>
                              <span className="mf-cell-sub">{g.member_count} members · {g.market_name}</span>
                            </span>
                            {sel ? <span className="badge badge--orange"><FiCheck size={11} /> Selected</span> : <StandingBadge status={st.status} />}
                          </button>
                        );
                      })}
                    </div>
                  )
                ) : registering ? (
                  <form className="mf-picker__register" onSubmit={registerClient}>
                    <div className="mf-section-label" style={{ marginBottom: 0 }}>Register new client</div>
                    {clientErr && <div className="mf-alert mf-alert--error"><FiAlertCircle size={15} /> {clientErr}</div>}
                    <ClientFields form={clientForm} setForm={setClientForm} compact
                      check={clientCheck} attempted={clientAttempted} shakeKey={clientShake} />
                    <div className="mf-picker__register-actions">
                      <button type="submit" className="mf-btn mf-btn--primary" disabled={clientSaving}>
                        {clientSaving ? 'Registering…' : 'Register & select'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="mf-picker__list" role="listbox" aria-label="Clients">
                    {results.length === 0 ? (
                      <Empty Icon={FiSearch} title="No matching clients"
                        message={query ? `Nothing matches “${query}”.` : 'The directory is empty.'} />
                    ) : results.map(c => {
                      const st  = clientStanding(loansByCustomer[c.id] || []);
                      const sel = String(c.id) === String(customerId);
                      return (
                        <button key={c.id} type="button" role="option" aria-selected={sel}
                          className={`mf-picker__item${sel ? ' is-selected' : ''}`}
                          onClick={() => setCustomerId(String(c.id))}>
                          <Avatar name={c.full_name} size={32} />
                          <span className="mf-cell-stack">
                            <span className="mf-cell-title">{c.full_name}</span>
                            <span className="mf-cell-sub mf-mono">{c.phone} · {displayId(c)}</span>
                          </span>
                          {sel ? <span className="badge badge--orange"><FiCheck size={11} /> Selected</span> : <StandingBadge status={st.status} />}
                        </button>
                      );
                    })}
                  </div>
                )}
                {loanType === 'individual' && !registering && individuals.length > results.length && (
                  <span className="mf-picker__hint">Showing {results.length} of {individuals.length} — refine the search to narrow down.</span>
                )}
              </div>

              {loanType === 'group'
                ? <GroupApplicantProfile group={group} standing={standing} />
                : <ApplicantProfile customer={applicant} standing={standing} />}
            </div>
          </div>
        )}

        {/* ── Step 2: Terms ── */}
        {!created && step === STEP.terms && (
          <div className="mf-wizard__pane" key="terms">
            <div className="mf-wizard__split">
              <div>
                <div className="mf-wizard__heading">
                  <h3>Loan terms for {applicant?.full_name}</h3>
                  <p>{typeLabel.en} loan · flat interest on principal. The installment and fees update as you type.</p>
                </div>
                <LoanTermsFields form={terms} setForm={setTerms} errors={touched ? termErrors : {}} loanType={loanType} />
              </div>
              <QuotePanel quote={quote}>
                <p className="mf-quote__foot">
                  New loans are booked <b>Active</b>. Every repayment is tracked against this installment plan.
                </p>
              </QuotePanel>
            </div>
          </div>
        )}

        {/* ── Step 3: Guarantors & collateral ── */}
        {!created && step === STEP.security && (
          <div className="mf-wizard__pane" key="security">
            <div className="mf-wizard__split">
              <div>
                <div className="mf-wizard__heading">
                  <h3><Bi text={t('security.title')} /></h3>
                  <p>{t('security.stepHint').en}<span className="mf-sw" lang="sw">{t('security.stepHint').sw}</span></p>
                </div>
                <SecurityFields
                  items={securities}
                  setItems={setSecurities}
                  principal={quote?.principal}
                  drafts={securityDrafts}
                  setDrafts={setSecurityDrafts}
                  pendingError={securityAttempted && securityDirty}
                />
              </div>
              <QuotePanel quote={quote} title="Loan quote">
                <p className="mf-quote__foot">
                  {securities.length
                    ? <><b>{securities.length}</b> guarantor{securities.length === 1 ? '' : 's'} / asset{securities.length === 1 ? '' : 's'} will be saved with this loan.</>
                    : 'No security added yet — the loan can still be booked unsecured.'}
                </p>
              </QuotePanel>
            </div>
          </div>
        )}

        {/* ── Step 4: Review ── */}
        {!created && step === STEP.review && applicant && quote && (
          <div className="mf-wizard__pane" key="review">
            <div className="mf-wizard__split">
              <div className="mf-review">
                <section>
                  <div className="mf-section-label">Applicant · {typeLabel.en}</div>
                  <div className="mf-review__applicant">
                    {group
                      ? <span className="mf-grp-avatar mf-grp-avatar--sm" aria-hidden="true"><FiUsers size={16} /></span>
                      : <Avatar name={applicant.full_name} size={36} />}
                    <div>
                      <div className="mf-cell-title">{applicant.full_name}</div>
                      <div className="mf-cell-sub mf-mono">
                        {group
                          ? `${group.member_count} members · leader ${group.leader_name || '—'}`
                          : `${applicant.phone} · ${displayId(applicant)}`}
                      </div>
                    </div>
                    <StandingBadge status={standing.status} />
                    <button type="button" className="mf-link-btn" onClick={() => setStep(STEP.applicant)}><FiEdit2 size={11} /> Change</button>
                  </div>
                </section>

                <section>
                  <div className="mf-section-label">Terms</div>
                  <dl className="mf-dl">
                    <div className="mf-dl__item"><dt>Principal</dt><dd className="mf-num">TZS {fmt(quote.principal)}</dd></div>
                    <div className="mf-dl__item"><dt>Interest rate</dt><dd className="mf-num">{quote.rate}% flat</dd></div>
                    <div className="mf-dl__item"><dt>Tenor</dt><dd>{quote.periods} {quote.unit}</dd></div>
                    <div className="mf-dl__item"><dt>Start date</dt><dd>{fmtDay(terms.start_date || todayISO(), LONG_DATE)}</dd></div>
                    <div className="mf-dl__item"><dt>Frequency</dt><dd>{frequencyLabel(quote.frequency).en} · {frequencyLabel(quote.frequency).sw}</dd></div>
                    <div className="mf-dl__item">
                      <dt>Installment</dt>
                      <dd className="mf-num">{quote.installment ? `TZS ${money(quote.installment)} ${perInterval(quote.frequency).en}` : '—'}</dd>
                    </div>
                    <div className="mf-dl__item">
                      <dt>{feeLabel.en} · paid upfront</dt>
                      <dd className="mf-num">TZS {fmt(quote.processingFee)}</dd>
                    </div>
                    {quote.refundIncentive != null ? (
                      <div className="mf-dl__item">
                        <dt>{refundLabel.en}</dt>
                        <dd className="mf-num">TZS {fmt(quote.refundIncentive)}</dd>
                      </div>
                    ) : (
                      <div className="mf-dl__item"><dt>Application type</dt><dd>{typeLabel.en} · {typeLabel.sw}</dd></div>
                    )}
                    <div className="mf-dl__item mf-dl__item--span"><dt>Purpose</dt><dd>{terms.purpose || '—'}</dd></div>
                  </dl>
                  <button type="button" className="mf-link-btn" style={{ marginTop: '.5rem' }} onClick={() => setStep(STEP.terms)}>
                    <FiEdit2 size={11} /> Edit terms
                  </button>
                </section>

                <section>
                  <div className="mf-section-label">Guarantors &amp; collateral</div>
                  {securities.length > 0 ? (
                    <SecurityList items={securities} principal={quote.principal} />
                  ) : (
                    <div className="mf-alert mf-alert--warning">
                      <FiAlertTriangle size={15} /> <span><Bi text={t('security.none')} block /></span>
                    </div>
                  )}
                  <button type="button" className="mf-link-btn" style={{ marginTop: '.5rem' }} onClick={() => setStep(STEP.security)}>
                    <FiEdit2 size={11} /> Edit security
                  </button>
                </section>

                <section>
                  <div className="mf-section-label">Installment schedule</div>
                  {installmentPlan && (
                    <p className="mf-plan__expected" style={{ marginBottom: '.5rem' }}>
                      {installmentPlan.en}<span className="mf-sw" lang="sw">{installmentPlan.sw}</span>
                    </p>
                  )}
                  <div className="mf-table-wrap" style={{ border: '1px solid var(--mf-border)' }}>
                    <table className="mf-table">
                      <thead><tr><th>#</th><th>Date</th><th className="is-num">Installment</th><th className="is-num">Remaining</th></tr></thead>
                      <tbody>
                        {schedule.map(r => (
                          <tr key={r.index}>
                            <td className="mf-mono">{String(r.index).padStart(2, '0')}</td>
                            <td>{fmtDay(r.date, LONG_DATE)}</td>
                            <td className="is-num">{fmt(r.amount)}</td>
                            <td className="is-num">{fmt(r.remaining)}</td>
                          </tr>
                        ))}
                      </tbody>
                      {quote.installmentCount > schedule.length && (
                        <tfoot>
                          <tr>
                            <td colSpan={4} className="mf-muted">
                              + {quote.installmentCount - schedule.length} more installment{quote.installmentCount - schedule.length === 1 ? '' : 's'}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </section>

                {standing.overdue > 0 && (
                  <div className="mf-alert mf-alert--danger">
                    <FiAlertTriangle size={15} /> This applicant has {standing.overdue} overdue loan{standing.overdue === 1 ? '' : 's'}.
                  </div>
                )}

                <label className={`mf-check mf-review__ack${ack ? ' is-checked' : ''}`}>
                  <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} />
                  <span>
                    I have verified the applicant’s identity, guarantors and collateral, confirmed these terms,
                    and collected the {PROCESSING_FEE_RATE}% processing fee (TZS {fmt(quote.processingFee)}).
                  </span>
                </label>

                {error && <div className="mf-alert mf-alert--error" role="alert"><FiAlertCircle size={15} /> {error}</div>}
              </div>

              <QuotePanel quote={quote} title="Final quote">
                <p className="mf-quote__foot">
                  Due date <b>{fmtDay(quote.dueDate, LONG_DATE)}</b> is estimated; the server confirms all figures when the loan is booked.
                </p>
              </QuotePanel>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
