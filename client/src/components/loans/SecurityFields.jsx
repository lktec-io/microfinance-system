import { useState } from 'react';
import { FiUser, FiBox, FiPlus, FiInfo, FiAlertCircle } from 'react-icons/fi';
import { Field, Bi } from '../ui';
import SecurityList from './SecurityList';
import { money } from '../../utils/labels';
import { t } from '../../i18n/bilingual';

export const EMPTY_GUARANTOR  = { full_name: '', phone: '', relationship: '', id_number: '' };
export const EMPTY_COLLATERAL = { description: '', serial_number: '', condition: '', estimated_value: '' };
export const EMPTY_SECURITY_DRAFTS = { guarantor: EMPTY_GUARANTOR, collateral: EMPTY_COLLATERAL };

const CONDITIONS = ['new', 'good', 'fair', 'poor'];

const MODES = [
  { value: 'guarantor',  key: 'security.guarantor',  Icon: FiUser },
  { value: 'collateral', key: 'security.collateral', Icon: FiBox  },
];

const RELATIONSHIPS = [
  'Spouse (Mwenzi)', 'Parent (Mzazi)', 'Sibling (Ndugu)', 'Relative (Jamaa)', 'Friend (Rafiki)',
  'Employer (Mwajiri)', 'Business partner (Mbia)', 'Neighbour (Jirani)', 'Group member (Mwanakikundi)',
];

const isDirty = draft => Object.values(draft).some(v => String(v ?? '').trim() !== '');

/** True while a guarantor or collateral form holds details that were not added yet. */
export function securityDraftsDirty(drafts) {
  return isDirty(drafts.guarantor) || isDirty(drafts.collateral);
}

/** Field errors ({ en, sw }) for a guarantor / collateral draft. */
export function validateSecurityDraft(type, d) {
  const errors = {};
  if (type === 'guarantor') {
    if (String(d.full_name).trim().length < 3) errors.full_name = t('security.errName');
    if (!/^\+?[\d\s-]{9,16}$/.test(String(d.phone).trim())) errors.phone = t('security.errPhone');
  } else {
    if (String(d.description).trim().length < 2) errors.description = t('security.errDescription');
    if (!(parseFloat(d.estimated_value) > 0)) errors.estimated_value = t('security.errValue');
  }
  return errors;
}

/** `securities` array for POST /api/loans. */
export function securitiesPayload(items) {
  return items.map(({ key, ...item }) => item);
}

/**
 * Dual-mode guarantor / collateral capture for the loan application.
 * Items and unsaved drafts are held by the parent: drafts survive Back/Continue
 * and the parent can block Continue on unsaved details without waiting for an effect.
 * Items are saved with the loan in one request.
 */
export default function SecurityFields({ items, setItems, drafts, setDrafts, principal, pendingError }) {
  // Open on the tab that holds unsaved details, if any
  const [mode, setMode]     = useState(() => (isDirty(drafts.collateral) && !isDirty(drafts.guarantor) ? 'collateral' : 'guarantor'));
  const [errors, setErrors] = useState({});

  const draft = drafts[mode];

  const set = key => e => {
    const value = e.target.value;
    setDrafts(d => ({ ...d, [mode]: { ...d[mode], [key]: value } }));
    setErrors(er => (er[key] ? { ...er, [key]: undefined } : er));
  };

  function add() {
    const found = validateSecurityDraft(mode, draft);
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    const clean = Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, String(v ?? '').trim()]));
    setItems(list => [...list, { ...clean, key: `${mode}-${Date.now()}-${list.length}`, type: mode }]);
    setDrafts(d => ({ ...d, [mode]: EMPTY_SECURITY_DRAFTS[mode] }));
    setErrors({});
  }

  function clearDraft() {
    setDrafts(d => ({ ...d, [mode]: EMPTY_SECURITY_DRAFTS[mode] }));
    setErrors({});
  }

  const remove   = key => setItems(list => list.filter(i => i.key !== key));
  const errorFor = key => (errors[key] ? <Bi text={errors[key]} block /> : undefined);
  const counts   = {
    guarantor:  items.filter(i => i.type === 'guarantor').length,
    collateral: items.filter(i => i.type === 'collateral').length,
  };
  const current  = MODES.find(m => m.value === mode);
  const addLabel = t(mode === 'guarantor' ? 'security.addGuarantor' : 'security.addCollateral');
  const value    = parseFloat(draft.estimated_value);

  return (
    <div className="mf-security">
      <div className="mf-choice" role="radiogroup" aria-label="Security type">
        {MODES.map(m => {
          const label  = t(m.key);
          const active = mode === m.value;
          return (
            <label key={m.value} className={`mf-choice__opt${active ? ' is-active' : ''}`}>
              <input type="radio" className="mf-sr-only" name="security-mode" value={m.value} checked={active}
                onChange={() => { setMode(m.value); setErrors({}); }} />
              <m.Icon size={18} aria-hidden="true" />
              <span className="mf-choice__text">
                <span className="mf-choice__en">{label.en}</span>
                <span className="mf-choice__sw" lang="sw">{label.sw}</span>
              </span>
              {counts[m.value] > 0 && <span className="mf-choice__count">{counts[m.value]}</span>}
            </label>
          );
        })}
      </div>

      <div className="mf-security__form" key={mode}>
        <div className="mf-security__form-head">
          <current.Icon size={16} aria-hidden="true" /> <span><Bi text={t(current.key)} /></span>
        </div>

        {mode === 'guarantor' ? (
          <div className="mf-form-grid">
            <Field label={<Bi text={t('security.fullName')} />} required error={errorFor('full_name')}>
              <input className="mf-input" value={draft.full_name} onChange={set('full_name')} maxLength={100}
                placeholder="e.g. Juma Hassan" autoComplete="off" aria-invalid={!!errors.full_name} />
            </Field>
            <Field label={<Bi text={t('security.phone')} />} required error={errorFor('phone')}>
              <input className="mf-input mf-input--num" type="tel" inputMode="tel" value={draft.phone} onChange={set('phone')}
                maxLength={20} placeholder="07XX XXX XXX" autoComplete="off" aria-invalid={!!errors.phone} />
            </Field>
            <Field label={<Bi text={t('security.relationship')} />}>
              <input className="mf-input" list="mf-relationships" value={draft.relationship} onChange={set('relationship')}
                maxLength={60} placeholder="e.g. Sibling (Ndugu)" autoComplete="off" />
              <datalist id="mf-relationships">
                {RELATIONSHIPS.map(r => <option key={r} value={r} />)}
              </datalist>
            </Field>
            <Field label={<Bi text={t('security.idNumber')} />}>
              <input className="mf-input mf-input--num" value={draft.id_number} onChange={set('id_number')}
                maxLength={50} placeholder="NIDA, voter or licence no." autoComplete="off" />
            </Field>
          </div>
        ) : (
          <div className="mf-form-grid">
            <Field label={<Bi text={t('security.description')} />} required span error={errorFor('description')}
              hint={t('security.descriptionHint').en}>
              <input className="mf-input" value={draft.description} onChange={set('description')} maxLength={255}
                placeholder="Pikipiki, TV, Sinki…" autoComplete="off" aria-invalid={!!errors.description} />
            </Field>
            <Field label={<Bi text={t('security.serial')} />}>
              <input className="mf-input mf-input--num" value={draft.serial_number} onChange={set('serial_number')}
                maxLength={100} placeholder="Serial, chassis or plate no." autoComplete="off" />
            </Field>
            <Field label={<Bi text={t('security.condition')} />}>
              <select className="mf-select" value={draft.condition} onChange={set('condition')}>
                <option value="">—</option>
                {CONDITIONS.map(c => {
                  const label = t(`security.cond.${c}`);
                  return <option key={c} value={c}>{label.en} · {label.sw}</option>;
                })}
              </select>
            </Field>
            <Field label={<Bi text={t('security.value')} />} required span error={errorFor('estimated_value')}
              hint={value > 0 ? `TZS ${money(value)}` : undefined}>
              <input type="number" min="1" step="1" inputMode="numeric" className="mf-input mf-input--num"
                value={draft.estimated_value} onChange={set('estimated_value')} placeholder="0"
                aria-invalid={!!errors.estimated_value} />
            </Field>
          </div>
        )}

        {pendingError && (
          <div className="mf-alert mf-alert--error" role="alert">
            <FiAlertCircle size={15} /> <span><Bi text={t('security.draftPending')} block /></span>
          </div>
        )}

        <div className="mf-security__actions">
          {isDirty(draft) && <button type="button" className="mf-btn mf-btn--ghost" onClick={clearDraft}>Clear</button>}
          <button type="button" className="mf-btn mf-btn--dark" onClick={add}>
            <FiPlus size={15} /> {addLabel.en}
          </button>
        </div>
      </div>

      {items.length > 0 ? (
        <SecurityList items={items} principal={principal} onRemove={remove} />
      ) : (
        <div className="mf-alert mf-alert--info">
          <FiInfo size={15} /> <span><Bi text={t('security.none')} block /></span>
        </div>
      )}
    </div>
  );
}
