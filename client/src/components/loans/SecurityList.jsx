import { FiUser, FiBox, FiTrash2 } from 'react-icons/fi';
import { money } from '../../utils/labels';
import { t } from '../../i18n/bilingual';

const CONDITIONS = ['new', 'good', 'fair', 'poor'];

/** { en, sw } for a stored condition code; free text is shown as entered. */
export function conditionLabel(code) {
  if (!code) return null;
  return CONDITIONS.includes(code) ? t(`security.cond.${code}`) : { en: code, sw: code };
}

/** API rows (loan.guarantors / loan.collaterals) → list items. */
export function securitiesFromLoan(loan) {
  return [
    ...(loan?.guarantors || []).map(g => ({ ...g, key: `g-${g.id}`, type: 'guarantor' })),
    ...(loan?.collaterals || []).map(c => ({ ...c, key: `c-${c.id}`, type: 'collateral', condition: c.item_condition })),
  ];
}

/** Guarantors and collateral for a loan — editable when `onRemove` is given. */
export default function SecurityList({ items = [], principal, onRemove }) {
  if (!items.length) return null;

  const guarantors = items.filter(i => i.type === 'guarantor').length;
  const assets     = items.filter(i => i.type === 'collateral');
  const assetValue = assets.reduce((s, i) => s + (Number(i.estimated_value) || 0), 0);
  const coverage   = Number(principal) > 0 && assetValue > 0 ? Math.round((assetValue / Number(principal)) * 100) : null;
  const guarantorLabel = t('security.guarantor');

  return (
    <ul className="mf-security__list">
      {items.map(item => {
        const isGuarantor = item.type === 'guarantor';
        const condition   = conditionLabel(item.condition);
        const meta = isGuarantor
          ? [item.phone, item.relationship, item.id_number && `ID ${item.id_number}`]
          : [item.serial_number && `S/N ${item.serial_number}`, condition && `${condition.en} · ${condition.sw}`];
        return (
          <li key={item.key} className="mf-security__item">
            <span className={`mf-security__icon${isGuarantor ? '' : ' mf-security__icon--asset'}`} aria-hidden="true">
              {isGuarantor ? <FiUser size={17} /> : <FiBox size={17} />}
            </span>
            <div className="mf-security__body">
              <div className="mf-security__title">{isGuarantor ? item.full_name : item.description}</div>
              <div className="mf-security__meta">
                {isGuarantor ? `${guarantorLabel.en} · ${guarantorLabel.sw}` : `TZS ${money(item.estimated_value)}`}
              </div>
              {meta.some(Boolean) && <div className="mf-security__meta">{meta.filter(Boolean).join(' · ')}</div>}
            </div>
            {onRemove ? (
              <button type="button" className="mf-icon-btn mf-icon-btn--danger" onClick={() => onRemove(item.key)}
                aria-label={`Remove ${isGuarantor ? item.full_name : item.description}`} title="Remove">
                <FiTrash2 size={15} />
              </button>
            ) : isGuarantor ? (
              <span className="badge badge--orange">Mzamini</span>
            ) : (
              <span className="mf-security__value">TZS {money(item.estimated_value)}</span>
            )}
          </li>
        );
      })}
      <li className="mf-security__total">
        <span>
          {guarantors} guarantor{guarantors === 1 ? '' : 's'} · {assets.length} asset{assets.length === 1 ? '' : 's'}
          {assetValue > 0 && <> · TZS {money(assetValue)}</>}
        </span>
        {coverage != null && <span>{t('security.coverage', { pct: coverage }).en}</span>}
      </li>
    </ul>
  );
}
