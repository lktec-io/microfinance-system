import { useEffect, useId, useRef, useState } from 'react';
import { FiAlertOctagon, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import { Field, Bi } from '../ui';
import NinField from './NinField';
import { formatNin, normalizeNin, validateNin } from '../../utils/nida';
import { ID_TYPES, detectIdType, normalizeOtherId, validateOtherId } from '../../utils/kyc';
import { todayISO } from '../../utils/finance';
import { t } from '../../i18n/bilingual';

export const EMPTY_CLIENT = {
  full_name: '', phone: '', address: '', id_type: 'nida', id_number: '', registration_date: '',
};

/** The stored ID number for `type`, formatted for the input — blank when the client uses another type. */
function storedNumberFor(customer, type) {
  if (!customer || detectIdType(customer) !== type) return '';
  const stored = customer.id_number || '';
  return type === 'nida' && /^\d{20}$/.test(stored) ? formatNin(stored) : stored;
}

/** Initial form state — new client, or an existing record being edited. */
export function initialClientForm(customer = null) {
  if (!customer) return { ...EMPTY_CLIENT, registration_date: todayISO() };
  const id_type = detectIdType(customer);
  return {
    full_name:         customer.full_name,
    phone:             customer.phone,
    address:           customer.address,
    id_type,
    id_number:         storedNumberFor(customer, id_type),
    registration_date: customer.registration_date?.slice(0, 10) || '',
  };
}

/**
 * Identification rules for the client form.
 * - New clients: the selected verification type must be valid (None needs no number).
 * - Existing records are re-validated only when the type or number changes,
 *   so a legacy ID never blocks a phone or address correction.
 */
export function checkClientId(form, { customers = [], customer = null } = {}) {
  const type       = ID_TYPES.some(o => o.value === form.id_type) ? form.id_type : 'nida';
  const stored     = customer?.id_number || '';
  const excludeId  = customer?.id ?? null;
  const sameType   = !!customer && detectIdType(customer) === type;

  if (type === 'none') {
    return { type, result: { valid: true, empty: true }, changed: !sameType, blocking: false };
  }
  if (type === 'nida') {
    const changed = !sameType || normalizeNin(form.id_number) !== normalizeNin(stored);
    const result  = validateNin(changed ? form.id_number : stored, { customers, excludeId, required: changed });
    return { type, result, changed, blocking: changed && !result.valid };
  }
  const changed = !sameType || normalizeOtherId(form.id_number) !== normalizeOtherId(stored);
  const result  = validateOtherId(changed ? form.id_number : stored, type, { customers, excludeId, required: true });
  return { type, result, changed, blocking: changed && !result.valid };
}

/** API payload for POST/PUT /api/customers. */
export function clientPayload(form, check, customer = null) {
  const payload = {
    full_name:         form.full_name,
    phone:             form.phone,
    address:           form.address,
    registration_date: form.registration_date,
  };
  if (!check.changed) {
    // Unchanged identity: resend what is stored. Legacy rows (no type) keep their NULL type.
    payload.id_number = customer?.id_number ?? null;
    if (customer?.id_type) payload.id_type = customer.id_type;
    return payload;
  }
  payload.id_type   = check.type;
  payload.id_number = check.type === 'none' ? null
    : check.type === 'nida' ? check.result.digits
    : check.result.normalized;
  return payload;
}

function Feedback({ tone, Icon, text, role }) {
  return (
    <div className={`mf-nin__feedback mf-nin__feedback--${tone}`} role={role}>
      <Icon size={18} aria-hidden="true" />
      <div className="mf-nin__lines">
        <span className="mf-nin__en">{text.en}</span>
        <span className="mf-nin__sw" lang="sw">{text.sw}</span>
      </div>
    </div>
  );
}

/** Voter's ID / driving licence number input with live checks. */
function OtherIdField({ type, value, onChange, result, blocking, attempted, shakeKey = 0 }) {
  const id         = useId();
  const feedbackId = `${id}-feedback`;
  const inputRef   = useRef(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!shakeKey) return;
    inputRef.current?.focus({ preventScroll: true });
    inputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    inputRef.current?.animate?.(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }],
      { duration: 320, easing: 'ease-out' },
    );
  }, [shakeKey]);

  const option    = ID_TYPES.find(o => o.value === type);
  const label     = t(option.numberKey);
  const hint      = t('kyc.otherHint');
  const showError = !result.valid && (result.code !== 'required' || touched || attempted);

  return (
    <div className="mf-nin">
      <label className="mf-label" htmlFor={id}>
        {label.en}<span className="mf-sw mf-sw--inline" lang="sw">{label.sw}</span><span className="mf-req">*</span>
      </label>
      <input
        ref={inputRef}
        id={id}
        className="mf-input mf-input--num"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={24}
        placeholder={type === 'voter' ? 'As printed on the voter card' : 'As printed on the licence'}
        value={value}
        onChange={e => onChange(e.target.value.toUpperCase())}
        onBlur={() => setTouched(true)}
        aria-invalid={(showError && blocking) || undefined}
        aria-describedby={feedbackId}
      />
      <div id={feedbackId} aria-live="polite">
        {showError && blocking && <Feedback tone="error" Icon={FiAlertOctagon} role="alert" text={result} />}
        {showError && !blocking && <Feedback tone="warning" Icon={FiAlertTriangle} text={result} />}
        {result.valid && !result.empty && <Feedback tone="success" Icon={FiCheckCircle} text={t('kyc.otherAccepted')} />}
        {!showError && !result.valid && (
          <p className="mf-hint">{hint.en}<span lang="sw" style={{ display: 'block' }}>{hint.sw}</span></p>
        )}
      </div>
    </div>
  );
}

/** Client form fields — payload keys match POST/PUT /api/customers. */
export default function ClientFields({ form, setForm, check, customer = null, attempted, shakeKey, compact = false, autoFocus = true }) {
  const set = key => e => {
    const value = e.target.value;
    setForm(f => ({ ...f, [key]: value }));
  };

  function chooseType(e) {
    const id_type = e.target.value;
    setForm(f => ({ ...f, id_type, id_number: storedNumberFor(customer, id_type) }));
  }

  const setNumber = value => setForm(f => ({ ...f, id_number: value }));
  const noneTitle = t('kyc.noneTitle');
  const noneBody  = t('kyc.noneBody');

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

      <div className="mf-field--span mf-kyc">
        <Field label={<Bi text={t('kyc.typeLabel')} />} required>
          <select className="mf-select" value={check.type} onChange={chooseType}>
            {ID_TYPES.map(o => {
              const label = t(o.key);
              return <option key={o.value} value={o.value}>{label.en} · {label.sw}</option>;
            })}
          </select>
        </Field>

        {check.type === 'nida' && (
          <div className="mf-kyc__panel" key="nida">
            <NinField
              value={form.id_number}
              onChange={setNumber}
              result={check.result}
              blocking={check.blocking}
              required={check.changed}
              attempted={attempted}
              shakeKey={shakeKey}
            />
          </div>
        )}

        {(check.type === 'voter' || check.type === 'driving') && (
          <div className="mf-kyc__panel" key={check.type}>
            <OtherIdField
              type={check.type}
              value={form.id_number}
              onChange={setNumber}
              result={check.result}
              blocking={check.blocking}
              attempted={attempted}
              shakeKey={shakeKey}
            />
          </div>
        )}

        {check.type === 'none' && (
          <div className="mf-kyc__panel mf-alert mf-alert--warning" role="status" key="none">
            <FiAlertTriangle size={17} aria-hidden="true" />
            <span>
              <span className="mf-kyc__notice-title">{noneTitle.en}</span>
              {noneBody.en}
              <span className="mf-sw" lang="sw"><span className="mf-kyc__notice-title">{noneTitle.sw}</span>{noneBody.sw}</span>
            </span>
          </div>
        )}
      </div>

      <Field label="Address" required span>
        <textarea className="mf-textarea" rows={2} required value={form.address} onChange={set('address')}
          placeholder="Street, ward, district" />
      </Field>
    </div>
  );
}
