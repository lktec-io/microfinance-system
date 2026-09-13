import { useState } from 'react';
import { FiAlertCircle } from 'react-icons/fi';
import api from '../../api';
import { Modal } from '../ui';
import ClientFields, { initialClientForm, checkClientNin, clientPayload } from './ClientFields';

/** Register / edit client — POST or PUT /api/customers with NIDA NIN validation. */
export default function ClientFormModal({ mode, customer, customers = [], onClose, onSaved }) {
  const isEdit = mode === 'edit';
  const record = isEdit ? customer : null;

  const [form, setForm]           = useState(() => initialClientForm(record));
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [attempted, setAttempted] = useState(false);
  const [shakeKey, setShakeKey]   = useState(0);

  const nin = checkClientNin(form, { customers, customer: record });

  async function handleSubmit(e) {
    e.preventDefault();
    setAttempted(true);
    setError('');
    if (nin.blocking) {
      setShakeKey(k => k + 1);
      return;
    }
    setSaving(true);
    try {
      const payload = clientPayload(form, nin, record);
      const { data } = isEdit
        ? await api.put(`/customers/${customer.id}`, payload)
        : await api.post('/customers', payload);
      onSaved(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      size="lg"
      eyebrow={isEdit ? `CL-${String(customer.id).padStart(5, '0')}` : 'Clients directory'}
      title={isEdit ? 'Edit client profile' : 'Register new client'}
      subtitle={isEdit ? customer.full_name : 'Capture identity and contact details. A valid NIDA NIN is required.'}
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
      <form id="client-form" onSubmit={handleSubmit} noValidate={false}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {attempted && nin.blocking && (
          <div className="mf-alert mf-alert--error" role="alert">
            <FiAlertCircle size={17} />
            <span>
              Fix the National ID number before saving.
              <span lang="sw" style={{ display: 'block', fontWeight: 600 }}>Rekebisha namba ya NIDA kabla ya kuhifadhi.</span>
            </span>
          </div>
        )}
        {error && <div className="mf-alert mf-alert--error" role="alert"><FiAlertCircle size={17} /> <span>{error}</span></div>}
        <ClientFields form={form} setForm={setForm} nin={nin} attempted={attempted} shakeKey={shakeKey} />
      </form>
    </Modal>
  );
}
