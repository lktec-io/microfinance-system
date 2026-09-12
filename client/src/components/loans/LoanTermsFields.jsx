import { Field } from '../ui';

export const EMPTY_TERMS = {
  loan_amount: '', interest_rate: '', duration_value: '',
  duration_unit: 'months', start_date: '', purpose: '',
};

export const UNITS = [
  { value: 'days',   label: 'Days'   },
  { value: 'weeks',  label: 'Weeks'  },
  { value: 'months', label: 'Months' },
];

/** Mirrors the API's required-field checks, with friendlier messages. */
export function validateTerms(t) {
  const errors = {};
  if (!(parseFloat(t.loan_amount) > 0)) errors.loan_amount = 'Enter an amount greater than zero';
  const rate = parseFloat(t.interest_rate);
  if (t.interest_rate === '' || Number.isNaN(rate) || rate < 0) errors.interest_rate = 'Enter a rate of 0% or more';
  const dur = Number(t.duration_value);
  if (!Number.isInteger(dur) || dur < 1) errors.duration_value = 'Whole number, at least 1';
  if (!UNITS.some(u => u.value === t.duration_unit)) errors.duration_unit = 'Choose a unit';
  return errors;
}

export default function LoanTermsFields({ form, setForm, errors = {}, showPurpose = true }) {
  const set = key => e => {
    const value = e.target.value;
    setForm(f => ({ ...f, [key]: value }));
  };

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
