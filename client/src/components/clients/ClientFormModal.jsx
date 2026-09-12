import { useState } from 'react';
import { FiAlertCircle } from 'react-icons/fi';
import api from '../../api';
import { Modal } from '../ui';
import ClientFields, { EMPTY_CLIENT } from './ClientFields';
import { todayISO } from '../../utils/finance';

/** Add / edit client — same payload as the previous Customers page. */
export default function ClientFormModal({ mode, customer, onClose, onSaved }) {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState(() => (isEdit
    ? {
        full_name:         customer.full_name,
        phone:             customer.phone,
        address:           customer.address,
        id_number:         customer.id_number || '',
        registration_date: customer.registration_date?.slice(0, 10) || '',
      }
    : { ...EMPTY_CLIENT, registration_date: todayISO() }));
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = isEdit
        ? await api.put(`/customers/${customer.id}`, form)
        : await api.post('/customers', form);
      onSaved(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      eyebrow={isEdit ? `CL-${String(customer.id).padStart(5, '0')}` : 'Clients directory'}
      title={isEdit ? 'Edit client profile' : 'Register new client'}
      subtitle={isEdit ? customer.full_name : 'Capture identity and contact details for the borrower.'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="mf-btn mf-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="client-form" className="mf-btn mf-btn--primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Register client'}
          </button>
        </>
      }
    >
      <form id="client-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {error && <div className="mf-alert mf-alert--error" role="alert"><FiAlertCircle size={15} /> {error}</div>}
        <ClientFields form={form} setForm={setForm} />
      </form>
    </Modal>
  );
}
