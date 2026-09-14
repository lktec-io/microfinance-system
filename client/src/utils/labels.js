/*
 * Shared labels for repayment frequency, payment modes and mobile money
 * providers. Values match the API (server/services/repaymentService.js).
 */
import { t } from '../i18n/bilingual';
import { FREQUENCIES } from './finance';
import { fmt, fmt0 } from './format';

export const PAYMENT_MODES = [
  { value: 'cash',         key: 'pay.cash'   },
  { value: 'mobile_money', key: 'pay.mobile' },
  { value: 'bank',         key: 'pay.bank'   },
];

export const MOBILE_PROVIDERS = [
  { value: 'mpesa',       label: 'M-Pesa'       },
  { value: 'tigopesa',    label: 'Tigo Pesa'    },
  { value: 'airtelmoney', label: 'Airtel Money' },
  { value: 'halopesa',    label: 'Halopesa'     },
];

/** Typical agent fee (makato) band — outside it the UI asks staff to double-check. */
export const AGENT_FEE_RANGE = { min: 500, max: 1000 };

export function providerLabel(value) {
  return MOBILE_PROVIDERS.find(p => p.value === value)?.label || 'Mobile money';
}

/** "Cash", "M-Pesa", "Bank transfer" … for a repayment row. */
export function paymentModeLabel(repayment) {
  if (repayment?.payment_mode === 'mobile_money') return providerLabel(repayment.mobile_provider);
  if (repayment?.payment_mode === 'bank') return t('pay.bank').en;
  return t('pay.cash').en;
}

/** Whole shillings without decimals, otherwise two decimals. */
export function money(n) {
  const v = Number(n) || 0;
  return Math.abs(v - Math.round(v)) < 0.005 ? fmt0(v) : fmt(v);
}

/** { en, sw } — "Daily / Kila siku"; loans without a plan read "Single payment". */
export function frequencyLabel(frequency) {
  return FREQUENCIES[frequency] ? t(`freq.${frequency}`) : t('freq.single');
}

/** { en, sw } — "per day / kwa siku". */
export function perInterval(frequency) {
  return FREQUENCIES[frequency] ? t(`freq.per.${frequency}`) : { en: '', sw: '' };
}
