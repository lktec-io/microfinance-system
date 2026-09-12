import { useMemo, useState } from 'react';
import {
  FiArrowLeft, FiArrowRight, FiCheck, FiUserPlus, FiUser, FiAlertTriangle,
  FiInfo, FiCheckCircle, FiExternalLink, FiMessageSquare, FiEdit2, FiAlertCircle, FiSearch,
} from 'react-icons/fi';
import api from '../../api';
import { Modal, Stepper, SearchField, Avatar, Empty } from '../ui';
import ClientFields, { EMPTY_CLIENT } from '../clients/ClientFields';
import { ScoreCard, StandingBadge } from '../clients/Standing';
import StatusBadge from '../common/StatusBadge';
import LoanTermsFields, { EMPTY_TERMS, validateTerms } from './LoanTermsFields';
import QuotePanel from './QuotePanel';
import { clientStanding, loanQuote, indicativeSchedule, todayISO } from '../../utils/finance';
import { fmt, fmt0, fmtDay } from '../../utils/format';

const STEPS = [
  { key: 'applicant', label: 'Applicant',  hint: 'Select & verify client' },
  { key: 'terms',     label: 'Loan terms', hint: 'Amount, rate & tenor'   },
  { key: 'review',    label: 'Review',     hint: 'Confirm & submit'       },
];

const LONG_DATE = { day: '2-digit', month: 'short', year: 'numeric' };

/* ── Applicant profile panel ───────────────────────────────────────── */
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
          <div className="mf-cell-sub mf-mono">CL-{String(customer.id).padStart(5, '0')}</div>
        </div>
        <StandingBadge status={standing.status} />
      </div>

      <dl className="mf-dl">
        <div className="mf-dl__item"><dt>Phone</dt><dd className="mf-mono">{customer.phone || '—'}</dd></div>
        <div className="mf-dl__item"><dt>National ID</dt><dd className="mf-mono">{customer.id_number || '—'}</dd></div>
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

      {standing.overdue > 0 && (
        <div className="mf-alert mf-alert--danger">
          <FiAlertTriangle size={15} />
          <span>Client has <strong>{standing.overdue}</strong> overdue loan{standing.overdue === 1 ? '' : 's'}. Review arrears before approving new credit.</span>
        </div>
      )}
      {standing.overdue === 0 && open > 0 && (
        <div className="mf-alert mf-alert--warning">
          <FiInfo size={15} />
          <span>Client already carries <strong>{open}</strong> open loan{open === 1 ? '' : 's'} with <strong className="mf-mono">TZS {fmt0(standing.exposure)}</strong> outstanding.</span>
        </div>
      )}
      {standing.n === 0 && (
        <div className="mf-alert mf-alert--info">
          <FiInfo size={15} /> First-time borrower — no repayment history in this system.
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   WIZARD
   ════════════════════════════════════════════════════════════════════ */
export default function LoanApplicationWizard({
  customers, loans, initialCustomerId, initialTerms,
  onClose, onCreated, onCustomerCreated, onSendSms, onViewLoan,
}) {
  const [step, setStep]             = useState(0);
  const [customerId, setCustomerId] = useState(initialCustomerId ? String(initialCustomerId) : '');
  const [query, setQuery]           = useState('');

  const [registering, setRegistering]   = useState(false);
  const [clientForm, setClientForm]     = useState({ ...EMPTY_CLIENT });
  const [clientSaving, setClientSaving] = useState(false);
  const [clientErr, setClientErr]       = useState('');

  const [terms, setTerms]     = useState({ ...EMPTY_TERMS, start_date: todayISO(), ...(initialTerms || {}) });
  const [touched, setTouched] = useState(false);
  const [ack, setAck]         = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [created, setCreated] = useState(null);

  const loansByCustomer = useMemo(() => {
    const map = {};
    for (const l of loans) (map[l.customer_id] ||= []).push(l);
    return map;
  }, [loans]);

  const customer = customers.find(c => String(c.id) === String(customerId)) || null;
  const standing = useMemo(
    () => clientStanding(customer ? loansByCustomer[customer.id] || [] : []),
    [customer, loansByCustomer],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? customers.filter(c =>
          c.full_name?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.id_number?.toLowerCase().includes(q))
      : customers;
    return list.slice(0, 60);
  }, [customers, query]);

  const termErrors = validateTerms(terms);
  const termsValid = Object.keys(termErrors).length === 0;
  const quote      = termsValid ? loanQuote(terms) : null;
  const schedule   = quote ? indicativeSchedule(quote, 6) : [];

  async function registerClient(e) {
    e.preventDefault();
    setClientSaving(true);
    setClientErr('');
    try {
      const { data } = await api.post('/customers', clientForm);
      onCustomerCreated?.(data);
      setCustomerId(String(data.id));
      setRegistering(false);
      setClientForm({ ...EMPTY_CLIENT });
    } catch (err) {
      setClientErr(err.response?.data?.message || 'Failed to register client');
    } finally {
      setClientSaving(false);
    }
  }

  function next() {
    if (step === 0 && !customer) return;
    if (step === 1) {
      setTouched(true);
      if (!termsValid) return;
    }
    setStep(s => Math.min(STEPS.length - 1, s + 1));
  }

  async function submit() {
    if (!customer || !termsValid || !ack) return;
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/loans', {
        customer_id:    customer.id,
        loan_amount:    terms.loan_amount,
        interest_rate:  terms.interest_rate,
        duration_value: terms.duration_value,
        duration_unit:  terms.duration_unit,
        start_date:     terms.start_date,
        purpose:        terms.purpose,
      });
      const loan = { ...data, customer_name: customer.full_name, customer_phone: customer.phone };
      setCreated(loan);
      onCreated?.(loan);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create loan');
    } finally {
      setSaving(false);
    }
  }

  /* ── Footer per state ── */
  let footer;
  if (created) {
    footer = (
      <>
        <button type="button" className="mf-btn mf-btn--ghost" onClick={onClose}>Close</button>
        <span className="mf-modal__foot-spacer" />
        <button type="button" className="mf-btn mf-btn--ghost" onClick={() => onSendSms(created)}>
          <FiMessageSquare size={14} /> Send thank-you SMS
        </button>
        <button type="button" className="mf-btn mf-btn--primary" onClick={() => onViewLoan(created)}>
          View loan <FiExternalLink size={14} />
        </button>
      </>
    );
  } else {
    footer = (
      <>
        {step === 0
          ? <button type="button" className="mf-btn mf-btn--ghost" onClick={onClose}>Cancel</button>
          : <button type="button" className="mf-btn mf-btn--ghost" onClick={() => setStep(s => s - 1)}><FiArrowLeft size={14} /> Back</button>}
        <span className="mf-modal__foot-spacer" />
        <span className="mf-picker__hint">Step {step + 1} of {STEPS.length}</span>
        {step < STEPS.length - 1 ? (
          <button type="button" className="mf-btn mf-btn--primary" onClick={next}
            disabled={(step === 0 && (!customer || registering))}>
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

  return (
    <Modal
      size="xl"
      eyebrow="Loan origination"
      title={created ? 'Application complete' : 'New loan application'}
      subtitle={created ? undefined : 'Verify the applicant, set terms, then review before booking.'}
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
            <div className="mf-eyebrow">Loan booked</div>
            <h3 className="mf-success__title">Loan #{created.id} created for {created.customer_name}</h3>
            <p className="mf-success__sub">Figures below are the values stored by the server.</p>
            <dl className="mf-dl">
              <div className="mf-dl__item"><dt>Principal</dt><dd className="mf-num">TZS {fmt(created.loan_amount)}</dd></div>
              <div className="mf-dl__item"><dt>Total payable</dt><dd className="mf-num">TZS {fmt(created.total_payable)}</dd></div>
              <div className="mf-dl__item"><dt>Due date</dt><dd>{fmtDay(created.due_date, LONG_DATE)}</dd></div>
              <div className="mf-dl__item"><dt>Status</dt><dd><StatusBadge status={created.status} /></dd></div>
            </dl>
          </div>
        )}

        {/* ── Step 1: Applicant ── */}
        {!created && step === 0 && (
          <div className="mf-wizard__pane" key="applicant">
            <div className="mf-wizard__split">
              <div className="mf-picker">
                <div className="mf-wizard__heading">
                  <h3>Who is applying?</h3>
                  <p>Search the clients directory. Selection loads the applicant's standing.</p>
                </div>
                <div className="mf-picker__bar">
                  <SearchField value={query} onChange={setQuery} placeholder="Search name, phone or national ID" />
                  <button type="button" className={`mf-btn ${registering ? 'mf-btn--ghost' : 'mf-btn--dark'}`}
                    onClick={() => { setRegistering(r => !r); setClientErr(''); }}>
                    <FiUserPlus size={14} /> {registering ? 'Cancel' : 'New client'}
                  </button>
                </div>

                {registering ? (
                  <form className="mf-picker__register" onSubmit={registerClient}>
                    <div className="mf-section-label" style={{ marginBottom: 0 }}>Register new client</div>
                    {clientErr && <div className="mf-alert mf-alert--error"><FiAlertCircle size={15} /> {clientErr}</div>}
                    <ClientFields form={clientForm} setForm={setClientForm} compact />
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
                            <span className="mf-cell-sub mf-mono">{c.phone}{c.id_number ? ` · ${c.id_number}` : ''}</span>
                          </span>
                          {sel ? <span className="badge badge--orange"><FiCheck size={11} /> Selected</span> : <StandingBadge status={st.status} />}
                        </button>
                      );
                    })}
                  </div>
                )}
                {!registering && customers.length > results.length && (
                  <span className="mf-picker__hint">Showing {results.length} of {customers.length} — refine the search to narrow down.</span>
                )}
              </div>

              <ApplicantProfile customer={customer} standing={standing} />
            </div>
          </div>
        )}

        {/* ── Step 2: Terms ── */}
        {!created && step === 1 && (
          <div className="mf-wizard__pane" key="terms">
            <div className="mf-wizard__split">
              <div>
                <div className="mf-wizard__heading">
                  <h3>Loan terms for {customer?.full_name}</h3>
                  <p>Flat interest on principal. The quote updates as you type.</p>
                </div>
                <LoanTermsFields form={terms} setForm={setTerms} errors={touched ? termErrors : {}} />
              </div>
              <QuotePanel quote={quote}>
                <p className="mf-quote__foot">
                  New loans are booked with status <b>Active</b> and a single due date. Installments shown are an indicative split.
                </p>
              </QuotePanel>
            </div>
          </div>
        )}

        {/* ── Step 3: Review ── */}
        {!created && step === 2 && customer && quote && (
          <div className="mf-wizard__pane" key="review">
            <div className="mf-wizard__split">
              <div className="mf-review">
                <section>
                  <div className="mf-section-label">Applicant</div>
                  <div className="mf-review__applicant">
                    <Avatar name={customer.full_name} size={36} />
                    <div>
                      <div className="mf-cell-title">{customer.full_name}</div>
                      <div className="mf-cell-sub mf-mono">{customer.phone}{customer.id_number ? ` · ID ${customer.id_number}` : ''}</div>
                    </div>
                    <StandingBadge status={standing.status} />
                    <button type="button" className="mf-link-btn" onClick={() => setStep(0)}><FiEdit2 size={11} /> Change</button>
                  </div>
                </section>

                <section>
                  <div className="mf-section-label">Terms</div>
                  <dl className="mf-dl">
                    <div className="mf-dl__item"><dt>Principal</dt><dd className="mf-num">TZS {fmt(quote.principal)}</dd></div>
                    <div className="mf-dl__item"><dt>Interest rate</dt><dd className="mf-num">{quote.rate}% flat</dd></div>
                    <div className="mf-dl__item"><dt>Tenor</dt><dd>{quote.periods} {quote.unit}</dd></div>
                    <div className="mf-dl__item"><dt>Start date</dt><dd>{fmtDay(terms.start_date || todayISO(), LONG_DATE)}</dd></div>
                    <div className="mf-dl__item mf-dl__item--span"><dt>Purpose</dt><dd>{terms.purpose || '—'}</dd></div>
                  </dl>
                  <button type="button" className="mf-link-btn" style={{ marginTop: '.5rem' }} onClick={() => setStep(1)}>
                    <FiEdit2 size={11} /> Edit terms
                  </button>
                </section>

                <section>
                  <div className="mf-section-label">Indicative schedule</div>
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
                      {quote.periods > schedule.length && (
                        <tfoot><tr><td colSpan={4} className="mf-muted">+ {quote.periods - schedule.length} more period{quote.periods - schedule.length === 1 ? '' : 's'}</td></tr></tfoot>
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
                  <span>I have verified the applicant's identity and confirmed these terms with the client.</span>
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
