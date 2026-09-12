import { Field } from '../ui';

export const EMPTY_CLIENT = { full_name: '', phone: '', address: '', id_number: '', registration_date: '' };

/** Client form fields — payload keys match POST/PUT /api/customers. */
export default function ClientFields({ form, setForm, compact = false, autoFocus = true }) {
  const set = key => e => {
    const value = e.target.value;
    setForm(f => ({ ...f, [key]: value }));
  };

  return (
    <div className="mf-form-grid">
      <Field label="Full name" required span>
        <input className="mf-input" required autoFocus={autoFocus} value={form.full_name}
          onChange={set('full_name')} placeholder="e.g. Amina Juma" />
      </Field>
      <Field label="Phone" required>
        <input className="mf-input mf-input--num" required inputMode="tel" value={form.phone}
          onChange={set('phone')} placeholder="07XX XXX XXX" />
      </Field>
      <Field label="National ID">
        <input className="mf-input mf-input--num" value={form.id_number} onChange={set('id_number')} placeholder="Optional" />
      </Field>
      <Field label="Address" required span>
        <textarea className="mf-textarea" rows={2} required value={form.address} onChange={set('address')}
          placeholder="Street, ward, district" />
      </Field>
      {!compact && (
        <Field label="Registration date" hint="Defaults to today when left empty">
          <input type="date" className="mf-input" value={form.registration_date} onChange={set('registration_date')} />
        </Field>
      )}
    </div>
  );
}
