import { FiMessageSquare, FiBell, FiAlertTriangle } from 'react-icons/fi';

/**
 * SMS trigger buttons for a loan. Enable rules match the previous UI:
 * reminder is disabled for paid loans, overdue notice only for overdue loans.
 */
export default function SmsActions({ loan, onSms, only }) {
  const show = type => !only || only.includes(type);
  const isOverdue = loan.status === 'overdue';

  return (
    <>
      {show('thank_you') && (
        <button type="button" className="mf-icon-btn mf-icon-btn--success"
          onClick={() => onSms(loan, 'thank_you')} title="Send thank-you SMS" aria-label="Send thank-you SMS">
          <FiMessageSquare size={13} />
        </button>
      )}
      {show('reminder') && (
        <button type="button" className="mf-icon-btn mf-icon-btn--warn"
          onClick={() => onSms(loan, 'reminder')} disabled={loan.status === 'paid'}
          title="Send payment reminder SMS" aria-label="Send payment reminder SMS">
          <FiBell size={13} />
        </button>
      )}
      {show('overdue') && (
        <button type="button" className="mf-icon-btn mf-icon-btn--danger"
          onClick={() => onSms(loan, 'overdue')} disabled={!isOverdue}
          title={isOverdue ? 'Send overdue notice SMS' : 'Overdue notice is only available for overdue loans'}
          aria-label="Send overdue notice SMS">
          <FiAlertTriangle size={13} />
        </button>
      )}
    </>
  );
}
