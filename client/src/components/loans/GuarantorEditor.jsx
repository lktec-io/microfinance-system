import { useCallback, useEffect, useState } from 'react';
import { FiShield, FiRefreshCw, FiTrash2, FiRotateCcw, FiX, FiInfo, FiAlertTriangle, FiBox } from 'react-icons/fi';
import api from '../../api';
import { Field, Bi } from '../ui';
import { formatNin, normalizeNin, validateNin } from '../../utils/nida';
import { money } from '../../utils/labels';
import { t } from '../../i18n/bilingual';

export const EMPTY_GUARANTOR_FORM = { id: null, name: '', phone: '', nida: '', assets_description: '' };

const ASSETS_MAX = 1000;
const PHONE_RE   = /^\+?[\d\s-]{9,16}$/;
const FIELDS     = ['name', 'phone', 'nida', 'assets_description'];

/** loan_guarantors row from GET /api/loans/:id → form values. Null-safe. */
export function guarantorFromApi(row) {
  if (!row) return null;
  const idNumber = String(row.id_number ?? '').trim();
  return {
    id:                 row.id ?? null,
    name:               String(row.full_name ?? ''),
    phone:              String(row.phone ?? ''),
    nida:               /^\d{20}$/.test(idNumber) ? formatNin(idNumber) : idNumber,
    assets_description: String(row.assets_description ?? ''),
  };
}

const sameValues = (a, b) => !!a && !!b && FIELDS.every(k => String(a[k] ?? '').trim() === String(b[k] ?? '').trim());

/** Field errors ({ en, sw }) — an unchanged legacy ID number is never re-validated. */
function validateGuarantor(draft, original) {
  const errors = {};
  if (String(draft.name ?? '').trim().length < 2) errors.name = t('security.errName');
  if (!PHONE_RE.test(String(draft.phone ?? '').trim())) errors.phone = t('security.errPhone');
  const nida = String(draft.nida ?? '').trim();
  const unchanged = !!original && nida === String(original.nida ?? '').trim();
  if (nida && !unchanged) {
    const result = validateNin(nida, { required: false });
    if (!result.valid) errors.nida = { en: result.en, sw: result.sw };
  }
  if (String(draft.assets_description ?? '').length > ASSETS_MAX) errors.assets_description = t('gedit.errAssets', { max: ASSETS_MAX });
  return errors;
}

/** Values sent to the API — trimmed, NIDA compacted, empty optionals as null. */
function toApiValues(draft) {
  const idNumber = String(draft.nida ?? '').trim();
  const compact  = normalizeNin(idNumber);
  return {
    name:               String(draft.name ?? '').trim(),
    phone:              String(draft.phone ?? '').trim(),
    nida:               idNumber ? (/^\d+$/.test(compact) ? compact : idNumber) : null,
    assets_description: String(draft.assets_description ?? '').trim() || null,
  };
}

/**
 * State for the Edit Loan guarantor section.
 *
 * Modes: none (no guarantor) · existing (editing the attached one) · new (adding one)
 *        · replace (new person replaces the attached one) · removed (attached one cleared)
 *
 * `payload()` returns the `guarantor` object for PUT /api/loans/:id, or undefined
 * when nothing changed (the key is then left out and the server keeps the guarantor).
 */
export function useGuarantorEditor(loanId) {
  const [status, setStatus]           = useState('loading');   // loading | ready | error
  const [original, setOriginal]       = useState(null);
  const [others, setOthers]           = useState(0);
  const [collaterals, setCollaterals] = useState([]);
  const [mode, setMode]               = useState('none');
  const [draft, setDraft]             = useState(null);
  const [errors, setErrors]           = useState({});

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    api.get(`/loans/${loanId}`)
      .then(({ data }) => {
        if (!alive) return;
        const guarantors = Array.isArray(data?.guarantors) ? data.guarantors : [];
        const primary    = guarantorFromApi(guarantors[0]);
        setOriginal(primary);
        setOthers(Math.max(0, guarantors.length - 1));
        setCollaterals(Array.isArray(data?.collaterals) ? data.collaterals : []);
        setDraft(primary ? { ...primary } : null);
        setMode(primary ? 'existing' : 'none');
        setStatus('ready');
      })
      .catch(() => { if (alive) setStatus('error'); });
    return () => { alive = false; };
  }, [loanId]);

  const setField = useCallback((key, value) => {
    setDraft(d => (d ? { ...d, [key]: value } : d));
    setErrors(e => (e[key] ? { ...e, [key]: undefined } : e));
  }, []);

  const add = () => {
    setDraft({ ...EMPTY_GUARANTOR_FORM });
    setMode(original ? 'replace' : 'new');
    setErrors({});
  };
  const replace = () => {
    setDraft({ ...EMPTY_GUARANTOR_FORM });
    setMode('replace');
    setErrors({});
  };
  const clear = () => {
    setDraft(null);
    setMode(original ? 'removed' : 'none');
    setErrors({});
  };
  const restore = () => {
    setDraft(original ? { ...original } : null);
    setMode(original ? 'existing' : 'none');
    setErrors({});
  };

  /** Validates the open form; returns true when it is safe to save. */
  const validate = () => {
    if (status !== 'ready' || !draft) {
      setErrors({});
      return true;
    }
    const found = validateGuarantor(draft, mode === 'existing' ? original : null);
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const payload = () => {
    if (status !== 'ready') return undefined;
    switch (mode) {
      case 'existing': return sameValues(draft, original) ? undefined : { id: original.id, ...toApiValues(draft) };
      case 'new':      return { id: null, ...toApiValues(draft) };
      case 'replace':  return { id: null, replaces: original.id, ...toApiValues(draft) };
      case 'removed':  return { id: original.id, remove: true };
      default:         return undefined;
    }
  };

  return {
    status, original, others, collaterals, mode, draft, errors,
    dirty: payload() !== undefined,
    setField, add, replace, clear, restore, validate, payload,
  };
}

/** "Guarantor & Collateral Information" — the Edit Loan sub-section. */
export default function GuarantorSection({ editor, readOnly = false }) {
  const { status, original, others, collaterals, mode, draft, errors } = editor;
  const title    = t('gedit.title');
  const addLabel = t('gedit.add');
  const errorFor = key => (errors[key] ? <Bi text={errors[key]} block /> : undefined);
  const assetsValue = collaterals.reduce((s, c) => s + (Number(c.estimated_value) || 0), 0);
  const badge = mode === 'existing' ? t('gedit.existing') : mode === 'replace' ? t('gedit.replacement') : t('gedit.new');
  const assetsLength = String(draft?.assets_description ?? '').length;

  return (
    <section className="mf-gedit" aria-labelledby="mf-gedit-title">
      <header className="mf-gedit__head">
        <FiShield size={17} aria-hidden="true" />
        <div>
          <h3 className="mf-gedit__title" id="mf-gedit-title">{title.en}</h3>
          <span className="mf-gedit__sub" lang="sw">{title.sw}</span>
        </div>
        {status === 'ready' && !readOnly && editor.dirty && (
          <span className="badge badge--orange mf-gedit__flag" title={t('gedit.unsaved').sw}>{t('gedit.unsaved').en}</span>
        )}
      </header>

      {status === 'loading' && <div className="skeleton mf-gedit__skeleton" aria-busy="true" aria-label="Loading guarantor" />}

      {status === 'error' && (
        <div className="mf-alert mf-alert--warning">
          <FiAlertTriangle size={15} /> <span><Bi text={t('gedit.loadError')} block /></span>
        </div>
      )}

      {/* Fully repaid loans: read-only */}
      {status === 'ready' && readOnly && (
        <>
          {original ? (
            <dl className="mf-dl">
              <div className="mf-dl__item"><dt>Full name</dt><dd>{original.name || '—'}</dd></div>
              <div className="mf-dl__item"><dt>Phone</dt><dd className="mf-mono">{original.phone || '—'}</dd></div>
              <div className="mf-dl__item"><dt>NIDA</dt><dd className="mf-mono">{original.nida || '—'}</dd></div>
              <div className="mf-dl__item mf-dl__item--span"><dt>Mali za Mdhamini</dt><dd>{original.assets_description || '—'}</dd></div>
            </dl>
          ) : (
            <p className="mf-gedit__empty"><Bi text={t('gedit.none')} block /></p>
          )}
          <p className="mf-gedit__meta"><FiInfo size={13} aria-hidden="true" /> {t('gedit.paid').en}</p>
        </>
      )}

      {status === 'ready' && !readOnly && (
        <>
          {mode === 'removed' && (
            <div className="mf-gedit__notice" role="status">
              <FiTrash2 size={15} aria-hidden="true" />
              <span><Bi text={t('gedit.willRemove', { name: original.name })} block /></span>
              <button type="button" className="mf-gedit__link" onClick={editor.restore}>
                <FiRotateCcw size={12} /> Undo
              </button>
            </div>
          )}

          {(mode === 'none' || mode === 'removed') && (
            <>
              {mode === 'none' && <p className="mf-gedit__empty"><Bi text={t('gedit.none')} block /></p>}
              <button type="button" className="mf-gedit__add" onClick={editor.add}>
                {addLabel.en}<span className="mf-sw mf-sw--inline" lang="sw">{addLabel.sw}</span>
              </button>
            </>
          )}

          {draft && (
            <div className="mf-gedit__card">
              <div className="mf-gedit__card-head">
                <span className={`badge ${mode === 'existing' ? 'badge--gray' : 'badge--orange'}`} title={badge.sw}>{badge.en}</span>
                <div className="mf-gedit__actions">
                  {mode === 'existing' && (
                    <button type="button" className="mf-gedit__link" onClick={editor.replace}>
                      <FiRefreshCw size={12} /> Replace
                    </button>
                  )}
                  {mode === 'replace' && (
                    <button type="button" className="mf-gedit__link" onClick={editor.restore}>
                      <FiRotateCcw size={12} /> {t('gedit.keep', { name: original.name }).en}
                    </button>
                  )}
                  {mode === 'new' ? (
                    <button type="button" className="mf-gedit__link" onClick={editor.clear}>
                      <FiX size={12} /> Cancel
                    </button>
                  ) : (
                    <button type="button" className="mf-gedit__link mf-gedit__link--danger" onClick={editor.clear}>
                      <FiTrash2 size={12} /> Clear guarantor
                    </button>
                  )}
                </div>
              </div>

              {mode === 'replace' && (
                <p className="mf-gedit__hint"><Bi text={t('gedit.replacing', { name: original.name })} block /></p>
              )}

              <div className="mf-form-grid">
                <Field label={<Bi text={t('security.fullName')} />} required error={errorFor('name')}>
                  <input className="mf-input" value={draft.name} maxLength={100} autoComplete="off"
                    placeholder="e.g. Rehema Said" aria-invalid={!!errors.name}
                    onChange={e => editor.setField('name', e.target.value)} />
                </Field>
                <Field label={<Bi text={t('security.phone')} />} required error={errorFor('phone')}>
                  <input className="mf-input mf-input--num" type="tel" inputMode="tel" value={draft.phone} maxLength={20}
                    autoComplete="off" placeholder="07XX XXX XXX" aria-invalid={!!errors.phone}
                    onChange={e => editor.setField('phone', e.target.value)} />
                </Field>
                <Field label={<Bi text={t('gedit.nida')} />} span error={errorFor('nida')}
                  hint={`${t('gedit.nidaHint').en} · ${t('gedit.nidaHint').sw}`}>
                  <input className="mf-input mf-input--num" inputMode="numeric" value={draft.nida} maxLength={32}
                    autoComplete="off" spellCheck={false} placeholder="YYYYMMDD-XXXXX-XXXXX-XX" aria-invalid={!!errors.nida}
                    onChange={e => {
                      const value = e.target.value;
                      editor.setField('nida', /^[\d\s-]*$/.test(value) ? formatNin(value) : value);
                    }} />
                </Field>
                <Field label={<Bi text={t('gedit.assets')} />} span error={errorFor('assets_description')}
                  hint={`${t('gedit.assetsHint').en} · ${assetsLength}/${ASSETS_MAX}`}>
                  <textarea className="mf-textarea" rows={3} value={draft.assets_description} maxLength={ASSETS_MAX}
                    placeholder={t('gedit.assetsHint').sw} aria-invalid={!!errors.assets_description}
                    onChange={e => editor.setField('assets_description', e.target.value)} />
                </Field>
              </div>
            </div>
          )}

          {others > 0 && (
            <p className="mf-gedit__meta"><FiInfo size={13} aria-hidden="true" /> {t('gedit.others', { count: others }).en}</p>
          )}
        </>
      )}

      {status === 'ready' && collaterals.length > 0 && (
        <p className="mf-gedit__meta">
          <FiBox size={13} aria-hidden="true" /> {t('gedit.collateral', { count: collaterals.length, value: money(assetsValue) }).en}
        </p>
      )}
    </section>
  );
}
