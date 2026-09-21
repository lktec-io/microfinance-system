import { useId } from 'react';
import { FiSun, FiCalendar, FiLayers, FiFlag } from 'react-icons/fi';
import { Field, Bi } from '../ui';
import { FREQUENCIES, FREQUENCY_ORDER, GROUP_REFUND_RATE, PROCESSING_FEE_RATE, loanQuote } from '../../utils/finance';
import { money, perInterval } from '../../utils/labels';
import { t } from '../../i18n/bilingual';

export const EMPTY_TERMS = {
  loan_amount: '', interest_rate: '', duration_value: '',
  duration_unit: 'months', start_date: '', repayment_frequency: 'monthly', purpose: '',
};

export const UNITS = [
  { value: 'days',   label: 'Days'   },
  { value: 'weeks',  label: 'Weeks'  },
  { value: 'months', label: 'Months' },
];

const FREQ_ICONS = { daily: FiSun, weekly: FiCalendar, monthly: FiLayers, single: FiFlag };

/**
 * Mirrors the API's required-field checks, with friendlier messages.
 * `allowSingle` accepts an empty frequency (legacy single-payment loans being edited).
 */
export function validateTerms(terms, { allowSingle = false } = {}) {
  const errors = {};
  if (!(parseFloat(terms.loan_amount) > 0)) errors.loan_amount = 'Enter an amount greater than zero';
  const rate = parseFloat(terms.interest_rate);
  if (terms.interest_rate === '' || Number.isNaN(rate) || rate < 0) errors.interest_rate = 'Enter a rate of 0% or more';
  const dur = Number(terms.duration_value);
  if (!Number.isInteger(dur) || dur < 1) errors.duration_value = 'Whole number, at least 1';
  if (!UNITS.some(u => u.value === terms.duration_unit)) errors.duration_unit = 'Choose a unit';
  const freq = terms.repayment_frequency;
  if (!(FREQUENCIES[freq] || (allowSingle && !freq))) errors.repayment_frequency = 'Choose how often the client repays';
  return errors;
}

/** 10% processing fee for every client, plus the group refundable incentive for group loans. */
function FeeLines({ quote, show }) {
  if (!show || quote?.processingFee == null) return null;
  const fee    = t('fee.processing', { rate: PROCESSING_FEE_RATE });
  const upfront = t('fee.upfront');
  const refund = quote.refundIncentive != null ? t('fee.refundTitle', { rate: GROUP_REFUND_RATE }) : null;
  return (
    <span className="mf-calc-banner__fees">
      <span className="mf-calc-banner__fee">
        <b>{fee.en}: TZS {money(quote.processingFee)}</b> — {upfront.en} · <span lang="sw">{fee.sw}, {upfront.sw}</span>
      </span>
      {refund && (
        <span className="mf-calc-banner__fee">
          <b>{refund.en}: TZS {money(quote.refundIncentive)}</b> — on timely full repayment · <span lang="sw">{refund.sw}</span>
        </span>
      )}
    </span>
  );
}

/**
 * Live installment banner — sits directly under the principal / interest inputs
 * so the agent sees the per-interval amount while typing,
 * e.g. "TZS 12,000 per day · 30 installments of TZS 12,000 each".
 */
export function InstallmentBanner({ form, allowSingle = false, loanType = 'individual', showFees = true }) {
  const valid = Object.keys(validateTerms(form, { allowSingle })).length === 0;
  const quote = valid ? loanQuote({ ...form, loan_type: loanType }) : null;
  const title = t('calc.title');

  if (!quote) {
    const empty = t('calc.empty');
    return (
      <div className="mf-calc-banner is-empty" role="status" aria-live="polite">
        <span className="mf-calc-banner__eyebrow">{title.en} · {title.sw}</span>
        <span className="mf-calc-banner__line">{empty.en}</span>
        <span className="mf-calc-banner__line" lang="sw">{empty.sw}</span>
      </div>
    );
  }

  if (!quote.installment) {
    const single = t('calc.single', { amount: money(quote.total) });
    return (
      <div className="mf-calc-banner" role="status" aria-live="polite">
        <span className="mf-calc-banner__eyebrow">{title.en} · {title.sw}</span>
        <span className="mf-calc-banner__value">TZS {money(quote.total)}</span>
        <span className="mf-calc-banner__line">{single.en}</span>
        <span className="mf-calc-banner__line" lang="sw">{single.sw}</span>
        <FeeLines quote={quote} show={showFees} />
      </div>
    );
  }

  const per  = perInterval(quote.frequency);
  const plan = t('freq.installments', { count: quote.installmentCount, amount: money(quote.installment) });
  return (
    <div className="mf-calc-banner" role="status" aria-live="polite">
      <span className="mf-calc-banner__eyebrow">{title.en} · {title.sw}</span>
      <span className="mf-calc-banner__value">TZS {money(quote.installment)}<small>{per.en}</small></span>
      <span className="mf-calc-banner__line">TZS {money(quote.installment)} {per.en} · {plan.en}</span>
      <span className="mf-calc-banner__line" lang="sw">TZS {money(quote.installment)} {per.sw} · {plan.sw}</span>
      <FeeLines quote={quote} show={showFees} />
    </div>
  );
}

export default function LoanTermsFields({
  form, setForm, errors = {}, showPurpose = true, allowSingle = false, loanType = 'individual', showFees = true,
}) {
  const groupId = useId();
  const set = key => e => {
    const value = e.target.value;
    setForm(f => ({ ...f, [key]: value }));
  };

  const frequencyOptions = [...(allowSingle ? [''] : []), ...FREQUENCY_ORDER];
  const currentFrequency = form.repayment_frequency || '';

  return (
    <div className="mf-form-grid">
      <Field label="Principal (TZS)" required error={errors.loan_amount}>
        <input type="number" min="1" step="0.01" inputMode="decimal" required
          className="mf-input mf-input--num" placeholder="0.00"
          value={form.loan_amount} onChange={set('loan_amount')} aria-invalid={!!errors.loan_amount} />
      </Field>
      <Field label="Interest rate (% flat)" required error={errors.interest_rate}>
        <input type="number" min="0" step="0.01" inputMode="decimal" required
          className="mf-input mf-input--num" placeholder="0.00"
          value={form.interest_rate} onChange={set('interest_rate')} aria-invalid={!!errors.interest_rate} />
      </Field>

      <InstallmentBanner form={form} allowSingle={allowSingle} loanType={loanType} showFees={showFees} />

      <Field label="Tenor" required error={errors.duration_value}>
        <input type="number" min="1" step="1" inputMode="numeric" required
          className="mf-input mf-input--num" placeholder="e.g. 6"
          value={form.duration_value} onChange={set('duration_value')} aria-invalid={!!errors.duration_value} />
      </Field>
      <Field label="Tenor unit" required error={errors.duration_unit}>
        <select className="mf-select" value={form.duration_unit} onChange={set('duration_unit')}>
          {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
        </select>
      </Field>

      <div className="mf-field mf-field--span">
        <span className="mf-label" id={`${groupId}-label`}>
          <Bi text={t('freq.label')} /><span className="mf-req">*</span>
        </span>
        <div className={`mf-choice ${frequencyOptions.length === 4 ? 'mf-choice--4' : 'mf-choice--3'}`}
          role="radiogroup" aria-labelledby={`${groupId}-label`}>
          {frequencyOptions.map(value => {
            const label  = value ? t(`freq.${value}`) : t('freq.single');
            const Icon   = FREQ_ICONS[value || 'single'];
            const active = currentFrequency === value;
            return (
              <label key={value || 'single'} className={`mf-choice__opt${active ? ' is-active' : ''}`}>
                <input type="radio" className="mf-sr-only" name={`${groupId}-freq`} value={value}
                  checked={active} onChange={() => setForm(f => ({ ...f, repayment_frequency: value }))} />
                <Icon size={18} aria-hidden="true" />
                <span className="mf-choice__text">
                  <span className="mf-choice__en">{label.en}</span>
                  <span className="mf-choice__sw" lang="sw">{label.sw}</span>
                </span>
              </label>
            );
          })}
        </div>
        {errors.repayment_frequency && <span className="mf-error-text">{errors.repayment_frequency}</span>}
      </div>

      <Field label="Start date" hint="Leave empty to start today">
        <input type="date" className="mf-input" value={form.start_date} onChange={set('start_date')} />
      </Field>
      {showPurpose && (
        <Field label="Purpose" span>
          <textarea className="mf-textarea" rows={2} value={form.purpose} onChange={set('purpose')}
            placeholder="e.g. Working capital for retail stock" />
        </Field>
      )}
    </div>
  );
}
