import { useMemo, useState } from 'react';
import {
  FiAlertCircle, FiAlertTriangle, FiCheckCircle, FiExternalLink, FiSearch, FiInfo, FiRotateCcw,
  FiDollarSign, FiSmartphone, FiCreditCard,
} from 'react-icons/fi';
import api from '../../api';
import { Modal, SearchField, Avatar, DueChip, Empty, Field, Bi } from '../ui';
import StatusBadge from '../common/StatusBadge';
import PlanStatus from './PlanStatus';
import { daysUntil, inputToTimestamp, isoDate, nowEatInput } from '../../utils/finance';
import { fmt, fmt0, fmtTimestamp } from '../../utils/format';
import { AGENT_FEE_RANGE, MOBILE_PROVIDERS, PAYMENT_MODES, paymentModeLabel } from '../../utils/labels';
import { t } from '../../i18n/bilingual';
import '../../styles/app/lending.css';
import '../../styles/app/directory.css';

const MODE_ICONS  = { cash: FiDollarSign, mobile_money: FiSmartphone, bank: FiCreditCard };
const CLOCK_DRIFT = 10 * 60 * 1000;   // matches the API's tolerance for a fast device clock
const FEE_CHIPS   = [500, 1000];

const EMPTY_FORM = () => ({
  payment_mode: 'cash', mobile_provider: 'mpesa',
  amount: '', amount_sent: '', agent_fee: '',
  paid_at: nowEatInput(), notes: '',
});

function ErrorAlert({ error }) {
  if (!error) return null;
  return (
    <div className="mf-alert mf-alert--error" role="alert">
      <FiAlertCircle size={15} />
      <span>{typeof error === 'string' ? error : <Bi text={error} block />}</span>
    </div>
  );
}

/**
 * Post a repayment — POST /api/repayments. Supports cash, bank and mobile
 * money (amount sent − agent fee = amount credited) and records the exact
 * payment time. The server remains authoritative.
 */
export default function RecordPaymentModal({ loans, initialLoanId, onClose, onRecorded, onViewLoan }) {
  const openLoans = useMemo(() => loans
    .filter(l => l.status !== 'paid' && Number(l.balance) > 0)
    .sort((a, b) => (daysUntil(a.due_date) ?? 1e9) - (daysUntil(b.due_date) ?? 1e9)), [loans]);

  const [loanId, setLoanId]   = useState(initialLoanId ? String(initialLoanId) : '');
  const [query, setQuery]     = useState('');
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [receipt, setReceipt] = useState(null);

  const loan = openLoans.find(l => String(l.id) === String(loanId))
    || loans.find(l => String(l.id) === String(loanId))
    || null;
  const balance = Number(loan?.balance) || 0;
  const isPaid  = !!loan && (loan.status === 'paid' || balance <= 0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, '');
    const list = q
      ? openLoans.filter(l => l.customer_name?.toLowerCase().includes(q) || l.customer_phone?.includes(q) || String(l.id) === q)
      : openLoans;
    return list.slice(0, 80);
  }, [openLoans, query]);

  /* ── Derived amounts ── */
  const isMobile   = form.payment_mode === 'mobile_money';
  const sent       = parseFloat(form.amount_sent);
  const fee        = form.agent_fee === '' ? 0 : parseFloat(form.agent_fee);
  const feeError   = isMobile && sent > 0 && !(fee >= 0 && fee < sent);
  const feeUnusual = isMobile && !feeError && form.agent_fee !== ''
    && (fee < AGENT_FEE_RANGE.min || fee > AGENT_FEE_RANGE.max);
  const credit     = isMobile
    ? (sent > 0 && !feeError ? parseFloat((sent - fee).toFixed(2)) : NaN)
    : parseFloat(form.amount);
  const hasAmount   = credit > 0;
  const overBalance = hasAmount && credit > balance;
  const newBalance  = hasAmount ? Math.max(0, parseFloat((balance - credit).toFixed(2))) : balance;
  const nextStatus  = hasAmount && newBalance <= 0 ? 'paid' : 'active';

  /* ── Timestamp ── */
  const stamp       = inputToTimestamp(form.paid_at);
  const maxStamp    = nowEatInput(CLOCK_DRIFT);
  const futureStamp = !!stamp && stamp.replace(' ', 'T') > maxStamp;

  const set = key => e => {
    const value = e.target.value;
    setForm(f => ({ ...f, [key]: value }));
  };

  function chooseMode(mode) {
    setForm(f => ({ ...f, payment_mode: mode }));
    setError('');
  }

  function fillBalance(e) {
    e.preventDefault();
    if (isMobile) {
      const withFee = balance + (fee > 0 ? fee : 0);
      setForm(f => ({ ...f, amount_sent: String(parseFloat(withFee.toFixed(2))) }));
    } else {
      setForm(f => ({ ...f, amount: String(balance) }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!loan)                  { setError('Select a loan to post the payment against'); return; }
    if (isPaid)                 { setError('This loan is already fully repaid'); return; }
    if (isMobile && !(sent > 0)) { setError(t('pay.sentRequired')); return; }
    if (feeError)               { setError(t('pay.feeTooHigh')); return; }
    if (!hasAmount)             { setError('Amount must be greater than zero'); return; }
    if (overBalance)            { setError(`Amount credited (TZS ${fmt(credit)}) cannot exceed the balance of TZS ${fmt(balance)}`); return; }
    if (!stamp)                 { setError(t('pay.timeRequired')); return; }
    if (futureStamp)            { setError(t('pay.futureTime')); return; }

    const payload = {
      loan_id:      Number(loan.id),
      payment_mode: form.payment_mode,
      paid_at:      stamp,
      payment_date: stamp.slice(0, 10),
      notes:        form.notes,
      amount:       credit,
    };
    if (isMobile) {
      payload.mobile_provider = form.mobile_provider;
      payload.amount_sent     = sent;
      payload.agent_fee       = fee > 0 ? fee : 0;
    }

    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/repayments', payload);
      setReceipt({ ...data, loan });
      onRecorded?.(data, loan);
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed');
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setReceipt(null);
    setLoanId(initialLoanId ? String(initialLoanId) : '');
    setForm(EMPTY_FORM());
    setError('');
  }

  /* ── Receipt ── */
  if (receipt) {
    const mobile = receipt.payment_mode === 'mobile_money';
    return (
      <Modal
        size="md"
        eyebrow="Payment posted"
        title="Repayment recorded"
        onClose={onClose}
        footer={
          <>
            <button type="button" className="mf-btn mf-btn--ghost" onClick={reset}><FiRotateCcw size={13} /> Record another</button>
            <span className="mf-modal__foot-spacer" />
            <button type="button" className="mf-btn mf-btn--ghost" onClick={() => onViewLoan(receipt.loan)}>View loan <FiExternalLink size={13} /></button>
            <button type="button" className="mf-btn mf-btn--primary" onClick={onClose}>Done</button>
          </>
        }
      >
        <div className="mf-receipt">
          <div className="mf-receipt__head">
            <div>
              <div className="mf-summary-bar__label">Receipt no.</div>
              <div className="mf-receipt__no">{receipt.receipt_number}</div>
            </div>
            <FiCheckCircle size={22} className="mf-tone--emerald" />
          </div>
          <div className="mf-receipt__amount">
            <div className="mf-receipt__amount-label">Amount credited to loan</div>
            <div className="mf-receipt__amount-value">TZS {fmt(receipt.amount)}</div>
          </div>
          <div className="mf-receipt__body mf-kv">
            <div className="mf-kv__row"><span>Client</span><span>{receipt.loan.customer_name}</span></div>
            <div className="mf-kv__row"><span>Loan</span><span>#{receipt.loan.id}</span></div>
            <div className="mf-kv__row">
              <span>Date &amp; time</span>
              <span className="mf-mono">{fmtTimestamp(receipt.paid_at) || isoDate(receipt.payment_date)}</span>
            </div>
            <div className="mf-kv__row"><span>Payment mode</span><span>{paymentModeLabel(receipt)}</span></div>
            {mobile && (
              <>
                <div className="mf-kv__row"><span>Amount sent</span><span>TZS {fmt(receipt.amount_sent)}</span></div>
                <div className="mf-kv__row"><span>Agent fee (makato)</span><span>TZS {fmt(receipt.agent_fee)}</span></div>
              </>
            )}
            {receipt.notes && <div className="mf-kv__row"><span>Notes</span><span>{receipt.notes}</span></div>}
            <div className="mf-kv__row"><span>Loan status</span><span><StatusBadge status={receipt.loan_status} /></span></div>
            <div className="mf-kv__row mf-kv__row--total"><span>Remaining balance</span><span>TZS {fmt(receipt.new_balance)}</span></div>
          </div>
        </div>
      </Modal>
    );
  }

  const disabled = !loan || isPaid;

  return (
    <Modal
      size="xl"
      eyebrow="Collections"
      title="Record repayment"
      subtitle="Select the loan, choose how the client paid, and post it to the ledger."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="mf-btn mf-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="record-payment-form" className="mf-btn mf-btn--primary" disabled={saving || disabled}>
            {saving ? <><span className="mf-spinner-inline" /> Posting…</> : 'Post payment'}
          </button>
        </>
      }
    >
      <div className="mf-pay">
        {/* Loan picker */}
        <div className="mf-picker">
          <div className="mf-section-label" style={{ marginBottom: 0 }}>1 · Select open loan</div>
          <SearchField value={query} onChange={setQuery} placeholder="Client, phone or #loan" maxWidth="none" />
          <div className="mf-picker__list" role="listbox" aria-label="Open loans">
            {results.length === 0 ? (
              <Empty Icon={FiSearch} title="No open loans found" message={query ? `Nothing matches “${query}”.` : 'Every loan is fully repaid.'} />
            ) : results.map(l => {
              const sel = String(l.id) === String(loanId);
              return (
                <button key={l.id} type="button" role="option" aria-selected={sel}
                  className={`mf-picker__item${sel ? ' is-selected' : ''}`}
                  onClick={() => { setLoanId(String(l.id)); setError(''); }}>
                  <Avatar name={l.customer_name} size={32} />
                  <span className="mf-cell-stack">
                    <span className="mf-cell-title">{l.customer_name}</span>
                    <span className="mf-cell-sub mf-mono">#{l.id} · {l.customer_phone}</span>
                  </span>
                  <span className="mf-pay__loan-right">
                    <span className="mf-pay__loan-balance">{fmt(l.balance)}</span>
                    <DueChip date={l.due_date} status={l.status} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Payment form */}
        <form id="record-payment-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
          <div className="mf-section-label" style={{ marginBottom: 0 }}>2 · Payment details</div>

          {loan ? (
            <>
              <dl className="mf-stat-row">
                <div><dt>Loan</dt><dd>#{loan.id}</dd></div>
                <div><dt>Payable</dt><dd>{fmt(loan.total_payable)}</dd></div>
                <div><dt>Paid</dt><dd className="mf-tone--emerald">{fmt(loan.amount_paid)}</dd></div>
                <div><dt>Balance</dt><dd className="mf-tone--orange">{fmt(balance)}</dd></div>
              </dl>
              <PlanStatus loan={loan} />
            </>
          ) : (
            <div className="mf-alert mf-alert--info"><FiInfo size={15} /> Choose a loan from the list to continue.</div>
          )}

          {isPaid && (
            <div className="mf-alert mf-alert--info"><FiCheckCircle size={15} /> This loan is fully repaid — no further payments can be posted.</div>
          )}

          <ErrorAlert error={error} />

          {/* Payment mode */}
          <div className="mf-field">
            <span className="mf-label"><Bi text={t('pay.mode')} /><span className="mf-req">*</span></span>
            <div className="mf-choice mf-choice--3" role="radiogroup" aria-label={t('pay.mode').en}>
              {PAYMENT_MODES.map(m => {
                const label  = t(m.key);
                const Icon   = MODE_ICONS[m.value];
                const active = form.payment_mode === m.value;
                return (
                  <label key={m.value} className={`mf-choice__opt${active ? ' is-active' : ''}${disabled ? ' is-disabled' : ''}`}>
                    <input type="radio" className="mf-sr-only" name="payment-mode" value={m.value}
                      checked={active} disabled={disabled} onChange={() => chooseMode(m.value)} />
                    <Icon size={18} aria-hidden="true" />
                    <span className="mf-choice__text">
                      <span className="mf-choice__en">{label.en}</span>
                      <span className="mf-choice__sw" lang="sw">{label.sw}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {isMobile ? (
            <div className="mf-mm">
              <div className="mf-form-grid">
                <Field label={<Bi text={t('pay.provider')} />} required span>
                  <select className="mf-select" required disabled={disabled} value={form.mobile_provider} onChange={set('mobile_provider')}>
                    {MOBILE_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </Field>
                <Field label={<Bi text={t('pay.amountSent')} />} required span>
                  <span className="mf-pay__amount-row">
                    <input type="number" min="1" step="0.01" inputMode="decimal" required
                      className="mf-input mf-input--num" disabled={disabled} placeholder="0.00"
                      value={form.amount_sent} onChange={set('amount_sent')} />
                    <button type="button" className="mf-btn mf-btn--ghost" disabled={disabled} onClick={fillBalance}>
                      Balance + fee
                    </button>
                  </span>
                </Field>
                <Field label={<Bi text={t('pay.agentFee')} />} span
                  error={feeError ? <Bi text={t('pay.feeTooHigh')} block /> : undefined}
                  hint={`Typically TZS ${fmt0(AGENT_FEE_RANGE.min)}–${fmt0(AGENT_FEE_RANGE.max)} · kwa kawaida`}>
                  <span className="mf-pay__amount-row">
                    <input type="number" min="0" step="1" inputMode="numeric"
                      className="mf-input mf-input--num" disabled={disabled} placeholder="0"
                      value={form.agent_fee} onChange={set('agent_fee')} aria-invalid={feeError || undefined} />
                    {FEE_CHIPS.map(v => (
                      <button key={v} type="button" disabled={disabled}
                        className={`mf-btn mf-btn--ghost mf-fee-chip${form.agent_fee !== '' && fee === v ? ' is-active' : ''}`}
                        onClick={e => { e.preventDefault(); setForm(f => ({ ...f, agent_fee: String(v) })); }}>
                        {fmt0(v)}
                      </button>
                    ))}
                  </span>
                </Field>
              </div>
              {feeUnusual && (
                <div className="mf-alert mf-alert--warning">
                  <FiAlertTriangle size={15} /> <span><Bi text={t('pay.feeRange')} block /></span>
                </div>
              )}
              <div className="mf-mm__credited" aria-live="polite">
                <span><Bi text={t('pay.credited')} /></span>
                <b>TZS {hasAmount ? fmt(credit) : '0.00'}</b>
              </div>
            </div>
          ) : (
            <div className="mf-form-grid">
              <Field label="Amount received (TZS)" required span>
                <span className="mf-pay__amount-row">
                  <input type="number" min="1" step="0.01" inputMode="decimal" required
                    className="mf-input mf-input--num" disabled={disabled}
                    max={balance || undefined}
                    placeholder={loan ? `Max ${fmt(balance)}` : '0.00'}
                    value={form.amount} onChange={set('amount')} />
                  <button type="button" className="mf-btn mf-btn--ghost" disabled={disabled} onClick={fillBalance}>
                    Full balance
                  </button>
                </span>
              </Field>
            </div>
          )}

          <div className="mf-form-grid">
            <Field label={<Bi text={t('pay.timestamp')} />} required
              error={futureStamp ? <Bi text={t('pay.futureTime')} block /> : undefined}
              hint={`${stamp || 'YYYY-MM-DD HH:mm:ss'} · ${t('pay.timeHint').en}`}>
              <input type="datetime-local" step="1" required className="mf-input mf-input--num" disabled={disabled}
                max={maxStamp} value={form.paid_at} onChange={set('paid_at')} aria-invalid={futureStamp || undefined} />
            </Field>
            <Field label="Notes" hint={isMobile ? 'e.g. transaction ID from the SMS' : 'e.g. bank slip or reference no.'}>
              <input className="mf-input" disabled={disabled} value={form.notes} onChange={set('notes')} placeholder="Optional" />
            </Field>
          </div>

          {loan && !isPaid && (
            <div className="mf-pay__preview mf-kv" aria-live="polite">
              <div className="mf-kv__row"><span>Current balance</span><span>TZS {fmt(balance)}</span></div>
              {isMobile && (
                <>
                  <div className="mf-kv__row"><span>Amount sent</span><span>{sent > 0 ? `TZS ${fmt(sent)}` : '—'}</span></div>
                  <div className="mf-kv__row"><span>Agent fee (not credited)</span><span>{sent > 0 && !feeError ? `TZS ${fmt(fee)}` : '—'}</span></div>
                </>
              )}
              <div className="mf-kv__row"><span>Credited now</span><span>{hasAmount ? `− TZS ${fmt(credit)}` : '—'}</span></div>
              <div className="mf-kv__row"><span>Recorded at</span><span>{stamp || '—'}</span></div>
              <div className="mf-kv__row"><span>Status after posting</span><span>{hasAmount ? (nextStatus === 'paid' ? 'Paid' : 'Active') : '—'}</span></div>
              <div className="mf-kv__row mf-kv__row--total"><span>New balance</span><span>TZS {fmt(newBalance)}</span></div>
            </div>
          )}

          {overBalance && (
            <div className="mf-alert mf-alert--warning">
              <FiAlertTriangle size={15} /> Amount credited is more than the outstanding balance of TZS {fmt(balance)}.
            </div>
          )}

          {loan?.status === 'overdue' && hasAmount && nextStatus === 'active' && (
            <div className="mf-alert mf-alert--warning">
              <FiInfo size={15} /> A partial payment moves this overdue loan back to <strong>Active</strong>.
            </div>
          )}
        </form>
      </div>
    </Modal>
  );
}
