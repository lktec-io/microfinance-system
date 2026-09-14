import { useEffect, useId, useRef, useState } from 'react';
import { FiAlertOctagon, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import { formatNin, normalizeNin, NIN_LENGTH } from '../../utils/nida';
import { fmtDay } from '../../utils/format';
import { t } from '../../i18n/bilingual';

const LONG_DATE = { day: '2-digit', month: 'short', year: 'numeric' };

function Feedback({ tone, Icon, en, sw, role, children }) {
  return (
    <div className={`mf-nin__feedback mf-nin__feedback--${tone}`} role={role}>
      <Icon size={18} aria-hidden="true" />
      <div className="mf-nin__lines">
        <span className="mf-nin__en">{en}</span>
        <span className="mf-nin__sw" lang="sw">{sw}</span>
        {children}
      </div>
    </div>
  );
}

/**
 * NIDA NIN input with live structural validation.
 *
 * @param {string}   value
 * @param {Function} onChange    receives the formatted value
 * @param {object}   result      output of validateNin()
 * @param {boolean}  blocking    true when an invalid value must stop submission
 * @param {boolean}  attempted   form submission was attempted
 * @param {number}   shakeKey    increment to shake + focus the field
 */
export default function NinField({ value, onChange, result, blocking, attempted, shakeKey = 0, required = true, autoFocus }) {
  const id         = useId();
  const feedbackId = `${id}-feedback`;
  const inputRef   = useRef(null);
  const controlRef = useRef(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!shakeKey) return;
    inputRef.current?.focus({ preventScroll: true });
    inputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    controlRef.current?.animate?.(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }],
      { duration: 320, easing: 'ease-out' },
    );
  }, [shakeKey]);

  const digitCount = normalizeNin(value).replace(/\D/g, '').length;
  const reveal     = touched || attempted;

  // Letters and complete-but-invalid numbers are flagged instantly;
  // "too short" and "required" wait until the field is left or submitted.
  const waitingForInput = result.code === 'required' || (result.code === 'length' && result.partial);
  const showError = !result.valid && (!waitingForInput || reveal);
  const isError   = showError && blocking;
  const isAdvice  = showError && !blocking;

  function handleChange(e) {
    const raw = e.target.value;
    onChange(/^[\d\s-]*$/.test(raw) ? formatNin(raw) : raw);
  }

  const digits   = result.digits || '';
  const dobISO   = digits.length >= 8 ? `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}` : null;
  const label    = t('nida.label');
  const verified = t('nida.verified');
  const hint     = t('nida.hint');
  const left     = t('nida.remaining', { count: NIN_LENGTH - digitCount });

  return (
    <div className="mf-nin">
      <label className="mf-label" htmlFor={id}>
        {label.en}{required && <span className="mf-req">*</span>}
      </label>

      <div className="mf-nin__control" ref={controlRef}>
        <input
          ref={inputRef}
          id={id}
          className="mf-input mf-input--num mf-nin__input"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus}
          maxLength={32}
          placeholder="YYYYMMDD-XXXXX-XXXXX-XX"
          value={value}
          onChange={handleChange}
          onBlur={() => setTouched(true)}
          aria-invalid={isError || undefined}
          aria-describedby={feedbackId}
        />
        <span className={`mf-nin__count${digitCount === NIN_LENGTH ? ' is-complete' : ''}`} aria-hidden="true">
          {digitCount}/{NIN_LENGTH}
        </span>
      </div>

      <div id={feedbackId} aria-live="polite">
        {isError && (
          <Feedback tone="error" Icon={FiAlertOctagon} role="alert" en={result.en} sw={result.sw} />
        )}

        {isAdvice && (
          <Feedback tone="warning" Icon={FiAlertTriangle}
            en={t('nida.legacy', { reason: result.en }).en}
            sw={t('nida.legacy', { reason: result.sw }).sw} />
        )}

        {result.valid && !result.empty && (
          <>
            <Feedback tone="success" Icon={FiCheckCircle} en={verified.en} sw={verified.sw}>
              <div className="mf-nin__segments">
                {dobISO && <span className="mf-nin__seg">Birth date <b>{fmtDay(dobISO, LONG_DATE)}</b></span>}
                {result.age != null && <span className="mf-nin__seg">Age <b>{result.age}</b></span>}
                <span className="mf-nin__seg">
                  Segments <b>{digits.slice(8, 13)} · {digits.slice(13, 18)} · {digits.slice(18, 20)}</b>
                </span>
              </div>
            </Feedback>
            {result.warnings?.map(w => (
              <Feedback key={w.en} tone="warning" Icon={FiAlertTriangle} en={w.en} sw={w.sw} />
            ))}
          </>
        )}

        {!showError && waitingForInput && (
          <p className="mf-hint">
            {result.code === 'length' && <>{left.en} · </>}
            {hint.en}
            <span lang="sw" style={{ display: 'block' }}>
              {result.code === 'length' && <>{left.sw} · </>}
              {hint.sw}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
