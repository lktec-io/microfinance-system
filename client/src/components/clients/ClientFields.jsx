import { Field } from '../ui';
import NinField from './NinField';
import { formatNin, normalizeNin, validateNin } from '../../utils/nida';
import { todayISO } from '../../utils/finance';

export const EMPTY_CLIENT = { full_name: '', phone: '', address: '', id_number: '', registration_date: '' };

/** Initial form state — new client, or an existing record being edited. */
export function initialClientForm(customer = null) {
  if (!customer) return { ...EMPTY_CLIENT, registration_date: todayISO() };
  const stored = customer.id_number || '';
  return {
    full_name:         customer.full_name,
    phone:             customer.phone,
    address:           customer.address,
    id_number:         /^\d{20}$/.test(stored) ? formatNin(stored) : stored,
    registration_date: customer.registration_date?.slice(0, 10) || '',
  };
}

/**
 * NIN rules for the client form:
 * - New clients must supply a structurally valid NIN.
 * - Existing records are re-validated only when the NIN is changed, so a
 *   legacy ID never blocks a phone or address correction.
 */
export function checkClientNin(form, { customers = [], customer = null } = {}) {
  const stored  = customer?.id_number || '';
  const changed = !customer || normalizeNin(form.id_number) !== normalizeNin(stored);
  const result  = validateNin(changed ? form.id_number : stored, {
    customers,
    excludeId: customer?.id ?? null,
    required: changed,
  });
  return { result, changed, blocking: changed && !result.valid };
}

/** API payload — a changed NIN is saved as 20 plain digits. */
export function clientPayload(form, check, customer = null) {
  return {
    ...form,
    id_number: check.changed ? check.result.digits : (customer?.id_number ?? null),
  };
}

/** Client form fields — payload keys match POST/PUT /api/customers. */
export default function ClientFields({ form, setForm, nin, attempted, shakeKey, compact = false, autoFocus = true }) {
  const set = key => e => {
    const value = e.target.value;
    setForm(f => ({ ...f, [key]: value }));
  };

  return (
    <div className="mf-form-grid">
      <Field label="Full name" required span>
        <input className="mf-input" required autoFocus={autoFocus} value={form.full_name}
          onChange={set('full_name')} placeholder="e.g. Amina Juma" autoComplete="off" />
      </Field>
      <Field label="Phone" required>
        <input className="mf-input mf-input--num" required inputMode="tel" type="tel" value={form.phone}
          onChange={set('phone')} placeholder="07XX XXX XXX" autoComplete="off" />
      </Field>
      {!compact && (
        <Field label="Registration date" hint="Defaults to today when left empty">
          <input type="date" className="mf-input" value={form.registration_date} onChange={set('registration_date')} />
        </Field>
      )}
      <div className="mf-field--span">
        <NinField
          value={form.id_number}
          onChange={value => setForm(f => ({ ...f, id_number: value }))}
          result={nin.result}
          blocking={nin.blocking}
          required={nin.changed}
          attempted={attempted}
          shakeKey={shakeKey}
        />
      </div>
      <Field label="Address" required span>
        <textarea className="mf-textarea" rows={2} required value={form.address} onChange={set('address')}
          placeholder="Street, ward, district" />
      </Field>
    </div>
  );
}
