import { useMemo, useState } from 'react';
import {
  FiArrowLeft, FiArrowRight, FiCheckCircle, FiTrash2, FiAlertCircle, FiAlertTriangle, FiStar, FiFilePlus,
} from 'react-icons/fi';
import api from '../../api';
import { Modal, Stepper, Field, Bi } from '../ui';
import { formatNin } from '../../utils/nida';
import { fmt0 } from '../../utils/format';
import {
  IDENTITY_OPTIONS, MARITAL_OPTIONS, OWNERSHIP_OPTIONS, BUSINESS_TYPES, MIN_MEMBERS, MAX_MEMBERS,
  EMPTY_GROUP_FORM, newMemberForm, groupErrors, membersErrors, businessesErrors, registrationPayload,
  hasErrors, formatMonths,
} from '../../utils/groups';
import { t } from '../../i18n/bilingual';
import '../../styles/app/lending.css';
import '../../styles/app/groups.css';

const STEPS = [
  { key: 'group',    label: 'Group',               hint: 'Taarifa za kikundi' },
  { key: 'members',  label: 'Members',             hint: 'Wanachama' },
  { key: 'business', label: 'Businesses & leader', hint: 'Biashara na kiongozi' },
];

const pad = id => `CL-${String(id).padStart(5, '0')}`;

/** Years + months input for a duration stored in months ('' when empty). */
export function DurationInput({ months, onChange, invalid, label }) {
  const total = months === '' || months == null ? null : Number(months);
  const years = total == null ? '' : Math.floor(total / 12);
  const rest  = total == null ? '' : total % 12;
  const update = (y, m) => {
    if (y === '' && m === '') return onChange('');
    onChange(String((Number(y) || 0) * 12 + (Number(m) || 0)));
  };
  return (
    <span className="mf-duration">
      <span className="mf-duration__part">
        <input type="number" min="0" max="99" step="1" inputMode="numeric" className="mf-input mf-input--num"
          aria-label={`${label} — years`} aria-invalid={invalid || undefined} placeholder="0"
          value={years} onChange={e => update(e.target.value, rest)} />
        <span className="mf-duration__unit" aria-hidden="true">{t('grp.years').en} · {t('grp.years').sw}</span>
      </span>
      <span className="mf-duration__part">
        <input type="number" min="0" max="11" step="1" inputMode="numeric" className="mf-input mf-input--num"
          aria-label={`${label} — months`} aria-invalid={invalid || undefined} placeholder="0"
          value={rest} onChange={e => update(years, e.target.value)} />
        <span className="mf-duration__unit" aria-hidden="true">{t('grp.months').en} · {t('grp.months').sw}</span>
      </span>
    </span>
  );
}

function DurationField({ labelKey, value, onChange, error, span }) {
  const label = t(labelKey);
  return (
    <div className={`mf-field${span ? ' mf-field--span' : ''}`}>
      <span className="mf-label"><Bi text={label} /><span className="mf-req">*</span></span>
      <DurationInput months={value} onChange={onChange} invalid={!!error} label={label.en} />
      {error ? <span className="mf-error-text">{error}</span> : value !== '' && <span className="mf-hint">{formatMonths(value)}</span>}
    </div>
  );
}

/* ── Step 2: one member ────────────────────────────────────────────── */
function MemberCard({ member: m, index, errors = {}, show, canRemove, onField, onIdentityType, onRemove }) {
  const err   = key => (show && errors[key] ? <Bi text={errors[key]} block /> : undefined);
  const inv   = key => (show && errors[key] ? true : undefined);
  const title = t('grp.member', { n: index + 1 });
  const idOpt = IDENTITY_OPTIONS.find(o => o.value === m.identity_type) || IDENTITY_OPTIONS[0];
  const noId  = t('grp.noId');

  return (
    <section className={`mf-grp-card${show && Object.keys(errors).length ? ' has-errors' : ''}`} aria-label={title.en}>
      <header className="mf-grp-card__head">
        <span className="mf-grp-card__index">{String(index + 1).padStart(2, '0')}</span>
        <div className="mf-grp-card__title">
          <strong>{m.full_name.trim() || title.en}</strong>
          <span className="mf-sw" lang="sw">{title.sw}</span>
        </div>
        {canRemove && (
          <button type="button" className="mf-icon-btn mf-icon-btn--danger" onClick={onRemove}
            aria-label={`Remove member ${index + 1}`} title="Remove member">
            <FiTrash2 size={15} />
          </button>
        )}
      </header>

      <div className="mf-form-grid">
        <Field label={<Bi text={t('security.fullName')} />} required error={err('full_name')}>
          <input className="mf-input" value={m.full_name} maxLength={100} autoComplete="off" placeholder="e.g. Amina Juma"
            aria-invalid={inv('full_name')} onChange={e => onField('full_name', e.target.value)} />
        </Field>
        <Field label={<Bi text={t('grp.parent')} />} required error={err('parent_or_guardian_name')}>
          <input className="mf-input" value={m.parent_or_guardian_name} maxLength={100} autoComplete="off"
            placeholder="e.g. Juma Hassan" aria-invalid={inv('parent_or_guardian_name')}
            onChange={e => onField('parent_or_guardian_name', e.target.value)} />
        </Field>
        <Field label={<Bi text={t('security.phone')} />} required error={err('phone_number')}>
          <input className="mf-input mf-input--num" type="tel" inputMode="tel" value={m.phone_number} maxLength={20}
            autoComplete="off" placeholder="07XX XXX XXX" aria-invalid={inv('phone_number')}
            onChange={e => onField('phone_number', e.target.value)} />
        </Field>
        <Field label={<Bi text={t('grp.marital')} />} required error={err('marital_status')}>
          <select className="mf-select" value={m.marital_status} aria-invalid={inv('marital_status')}
            onChange={e => onField('marital_status', e.target.value)}>
            <option value="">Choose…</option>
            {MARITAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.en} · {o.sw}</option>)}
          </select>
        </Field>

        <div className="mf-field mf-field--span">
          <span className="mf-label"><Bi text={t('grp.identity')} /><span className="mf-req">*</span></span>
          <div className="mf-badge-group" role="radiogroup" aria-label={`Member ${index + 1} identity type`}>
            {IDENTITY_OPTIONS.map(o => {
              const active = m.identity_type === o.value;
              return (
                <label key={o.value} className={`mf-badge-opt${active ? ' is-active' : ''}`}>
                  <input type="radio" className="mf-sr-only" name={`idtype-${m.key}`} value={o.value}
                    checked={active} onChange={() => onIdentityType(o.value)} />
                  <span className="mf-badge-opt__dot" aria-hidden="true" />
                  {t(o.key).en}
                </label>
              );
            })}
          </div>
        </div>

        {m.identity_type === 'None' ? (
          <div className="mf-grp-noid mf-field--span" role="status">
            <FiAlertTriangle size={15} aria-hidden="true" />
            <span>{noId.en}<span className="mf-sw" lang="sw">{noId.sw}</span></span>
          </div>
        ) : (
          <Field label={<Bi text={t(idOpt.numberKey)} />} required span error={err('identity_number')}>
            <input className="mf-input mf-input--num" value={m.identity_number} autoComplete="off" spellCheck={false}
              inputMode={m.identity_type === 'NIDA' ? 'numeric' : 'text'} maxLength={m.identity_type === 'NIDA' ? 32 : 24}
              placeholder={m.identity_type === 'NIDA' ? 'YYYYMMDD-XXXXX-XXXXX-XX' : 'As printed on the card'}
              aria-invalid={inv('identity_number')}
              onChange={e => {
                const v = e.target.value;
                onField('identity_number', m.identity_type === 'NIDA'
                  ? (/^[\d\s-]*$/.test(v) ? formatNin(v) : v)
                  : v.toUpperCase());
              }} />
          </Field>
        )}

        <Field label={<Bi text={t('grp.address')} />} required span error={err('residential_address')}>
          <input className="mf-input" value={m.residential_address} maxLength={255} autoComplete="off"
            placeholder="House / street, ward" aria-invalid={inv('residential_address')}
            onChange={e => onField('residential_address', e.target.value)} />
        </Field>
        <Field label={<Bi text={t('grp.area')} />} required error={err('residential_area')}>
          <input className="mf-input" value={m.residential_area} maxLength={120} autoComplete="off"
            placeholder="e.g. Kariakoo, Ilala" aria-invalid={inv('residential_area')}
            onChange={e => onField('residential_area', e.target.value)} />
        </Field>
        <DurationField labelKey="grp.residency" value={m.residency_duration}
          onChange={v => onField('residency_duration', v)} error={err('residency_duration')} />
      </div>
    </section>
  );
}

/* ── Step 3: one member's business ─────────────────────────────────── */
function BusinessCard({ member: m, index, errors = {}, show, isLeader, onField }) {
  const b      = m.business;
  const err    = key => (show && errors[key] ? <Bi text={errors[key]} block /> : undefined);
  const inv    = key => (show && errors[key] ? true : undefined);
  const sales  = Number(b.average_weekly_sales);
  const profit = Number(b.average_weekly_profit);
  const margin = sales > 0 && b.average_weekly_profit !== '' && profit <= sales ? Math.round((profit / sales) * 100) : null;
  const title  = t('grp.member', { n: index + 1 });

  return (
    <section className={`mf-grp-card mf-grp-card--biz${show && Object.keys(errors).length ? ' has-errors' : ''}`}
      aria-label={`Business of ${m.full_name || title.en}`}>
      <header className="mf-grp-card__head">
        <span className="mf-grp-card__index">{String(index + 1).padStart(2, '0')}</span>
        <div className="mf-grp-card__title">
          <strong>{m.full_name.trim() || title.en}</strong>
          <span className="mf-sw" lang="sw">Biashara ya mwanachama</span>
        </div>
        {isLeader && <span className="badge badge--orange"><FiStar size={11} /> Leader</span>}
        {margin != null && <span className="mf-grp-card__margin" title="Profit margin">{margin}% margin</span>}
      </header>

      <div className="mf-form-grid">
        <Field label={<Bi text={t('grp.bizName')} />} required error={err('business_name')}>
          <input className="mf-input" value={b.business_name} maxLength={120} autoComplete="off"
            placeholder="e.g. Mama Amina Vitenge" aria-invalid={inv('business_name')}
            onChange={e => onField('business_name', e.target.value)} />
        </Field>
        <Field label={<Bi text={t('grp.bizType')} />} required error={err('business_type')}>
          <input className="mf-input" list="mf-grp-biztypes" value={b.business_type} maxLength={80} autoComplete="off"
            placeholder="Choose or type" aria-invalid={inv('business_type')}
            onChange={e => onField('business_type', e.target.value)} />
        </Field>
        <Field label={<Bi text={t('grp.room')} />} error={err('room_or_location_number')}>
          <input className="mf-input mf-input--num" value={b.room_or_location_number} maxLength={40} autoComplete="off"
            placeholder="e.g. Stall B-14" onChange={e => onField('room_or_location_number', e.target.value)} />
        </Field>
        <DurationField labelKey="grp.bizDuration" value={b.business_duration}
          onChange={v => onField('business_duration', v)} error={err('business_duration')} />
        <Field label={<Bi text={t('grp.sales')} />} required error={err('average_weekly_sales')}
          hint={sales > 0 ? `TZS ${fmt0(sales)} / week` : undefined}>
          <input type="number" min="0" step="1" inputMode="numeric" className="mf-input mf-input--num"
            value={b.average_weekly_sales} placeholder="0" aria-invalid={inv('average_weekly_sales')}
            onChange={e => onField('average_weekly_sales', e.target.value)} />
        </Field>
        <Field label={<Bi text={t('grp.profit')} />} required error={err('average_weekly_profit')}
          hint={profit > 0 ? `TZS ${fmt0(profit)} / week` : undefined}>
          <input type="number" min="0" step="1" inputMode="numeric" className="mf-input mf-input--num"
            value={b.average_weekly_profit} placeholder="0" aria-invalid={inv('average_weekly_profit')}
            onChange={e => onField('average_weekly_profit', e.target.value)} />
        </Field>
        <Field label={<Bi text={t('grp.ownership')} />} required span error={err('ownership_type')}>
          <select className="mf-select" value={b.ownership_type} aria-invalid={inv('ownership_type')}
            onChange={e => onField('ownership_type', e.target.value)}>
            {OWNERSHIP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.en} · {o.sw}</option>)}
          </select>
        </Field>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   GROUP REGISTRATION & MEMBER ONBOARDING
   POST /api/groups/register — saved in one server transaction.
   ════════════════════════════════════════════════════════════════════ */
export default function GroupRegistrationWizard({ onClose, onRegistered, onNewLoan }) {
  const [step, setStep]           = useState(0);
  const [group, setGroup]         = useState(EMPTY_GROUP_FORM);
  const [members, setMembers]     = useState(() => [newMemberForm(), newMemberForm()]);
  const [leaderKey, setLeaderKey] = useState('');
  const [shown, setShown]         = useState([false, false, false]);   // errors revealed per step
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');                      // string or { en, sw }
  const [created, setCreated]     = useState(null);

  const errs = useMemo(() => ({
    group:      groupErrors(group),
    members:    membersErrors(members),
    businesses: businessesErrors(members),
  }), [group, members]);
  const leader        = members.find(m => m.key === leaderKey) || null;
  const leaderMissing = !leader;
  const stepInvalid = [
    hasErrors(errs.group),
    !!errs.members.list || hasErrors(errs.members.byKey),
    hasErrors(errs.businesses.byKey) || leaderMissing,
  ];

  const totals = members.reduce((s, m) => ({
    sales:  s.sales + (Number(m.business.average_weekly_sales) || 0),
    profit: s.profit + (Number(m.business.average_weekly_profit) || 0),
  }), { sales: 0, profit: 0 });

  /* ── Updaters ── */
  const setGroupField = key => e => {
    const value = e.target.value;
    setGroup(g => ({ ...g, [key]: value }));
  };
  const setMemberField = (key, field, value) =>
    setMembers(ms => ms.map(m => (m.key === key ? { ...m, [field]: value } : m)));
  const setMemberIdentity = (key, type) =>
    setMembers(ms => ms.map(m => (m.key === key ? { ...m, identity_type: type, identity_number: '' } : m)));
  const setBusinessField = (key, field, value) =>
    setMembers(ms => ms.map(m => (m.key === key ? { ...m, business: { ...m.business, [field]: value } } : m)));
  const addMember = () => setMembers(ms => (ms.length >= MAX_MEMBERS ? ms : [...ms, newMemberForm()]));
  const removeMember = key => {
    setMembers(ms => (ms.length <= MIN_MEMBERS ? ms : ms.filter(m => m.key !== key)));
    if (leaderKey === key) setLeaderKey('');
  };

  /* ── Navigation ── */
  const reveal = index => setShown(s => s.map((v, i) => (i === index ? true : v)));
  const focusFirstError = () => requestAnimationFrame(() => {
    document.querySelector('.mf-grp .mf-error-text, .mf-grp [aria-invalid="true"]')
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });

  function next() {
    reveal(step);
    if (stepInvalid[step]) {
      setError(t('grp.fixErrors'));
      focusFirstError();
      return;
    }
    setError('');
    setStep(s => Math.min(STEPS.length - 1, s + 1));
  }

  async function submit() {
    const firstBad = stepInvalid.findIndex(Boolean);
    if (firstBad !== -1) {
      reveal(firstBad);
      setStep(firstBad);
      setError(t('grp.fixErrors'));
      focusFirstError();
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/groups/register', registrationPayload(group, members, leaderKey));
      setCreated(data);
      onRegistered?.(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Group registration failed');
    } finally {
      setSaving(false);
    }
  }

  const ge = key => (shown[0] && errs.group[key] ? <Bi text={errs.group[key]} block /> : undefined);
  const leaderHint = t('grp.leaderHint');

  /* ── Footer ── */
  const footer = created ? (
    <>
      <button type="button" className="mf-btn mf-btn--ghost" onClick={onClose}>Done</button>
      <span className="mf-modal__foot-spacer" />
      <button type="button" className="mf-btn mf-btn--primary" onClick={() => onNewLoan?.(created)}>
        <FiFilePlus size={15} /> New group loan
      </button>
    </>
  ) : (
    <>
      {step === 0
        ? <button type="button" className="mf-btn mf-btn--ghost" onClick={onClose}>Cancel</button>
        : <button type="button" className="mf-btn mf-btn--ghost" onClick={() => { setError(''); setStep(s => s - 1); }}><FiArrowLeft size={14} /> Back</button>}
      <span className="mf-modal__foot-spacer" />
      <span className="mf-picker__hint">Step {step + 1} of {STEPS.length}</span>
      {step < STEPS.length - 1 ? (
        <button type="button" className="mf-btn mf-btn--primary" onClick={next}>
          Continue <FiArrowRight size={14} />
        </button>
      ) : (
        <button type="button" className="mf-btn mf-btn--primary" onClick={submit} disabled={saving}>
          {saving ? <><span className="mf-spinner-inline" /> Registering…</> : <><FiCheckCircle size={14} /> Register group</>}
        </button>
      )}
    </>
  );

  return (
    <Modal
      size="xl"
      eyebrow="Group lending · Mikopo ya vikundi"
      title={created ? 'Group registered' : 'Register group'}
      subtitle={created ? undefined : 'Group details, members, then each member’s business and the group leader.'}
      onClose={onClose}
      dismissible={false}
      footer={footer}
    >
      <div className="mf-grp">
        <datalist id="mf-grp-biztypes">{BUSINESS_TYPES.map(b => <option key={b} value={b} />)}</datalist>

        {created ? (
          <div className="mf-success">
            <span className="mf-success__icon"><FiCheckCircle size={26} /></span>
            <div className="mf-eyebrow">{t('grp.registered').sw}</div>
            <h3 className="mf-success__title">{created.group_name} registered</h3>
            <p className="mf-success__sub">Borrower record {pad(created.customer_id)} was created for this group’s loans.</p>
            <dl className="mf-dl">
              <div className="mf-dl__item"><dt>Members</dt><dd className="mf-num">{created.member_count}</dd></div>
              <div className="mf-dl__item"><dt>Group leader</dt><dd>{created.leader_name} · {created.leader_phone}</dd></div>
              <div className="mf-dl__item"><dt>Market</dt><dd>{created.market_name}</dd></div>
              <div className="mf-dl__item"><dt>Weekly sales (all members)</dt><dd className="mf-num">TZS {fmt0(created.weekly_sales)}</dd></div>
            </dl>
          </div>
        ) : (
          <>
            <div className="mf-wizard__stepper"><Stepper steps={STEPS} current={step} /></div>

            {error && (
              <div className="mf-alert mf-alert--error" role="alert">
                <FiAlertCircle size={15} /> <span>{typeof error === 'string' ? error : <Bi text={error} block />}</span>
              </div>
            )}

            {/* ── Step 1: Group ── */}
            {step === 0 && (
              <div className="mf-grp__pane" key="group">
                <div className="mf-grp__heading">
                  <h3><Bi text={t('grp.stepGroup')} /></h3>
                  <p>Who is the group and where do they trade?</p>
                </div>
                <div className="mf-form-grid">
                  <Field label={<Bi text={t('grp.name')} />} required span error={ge('group_name')}>
                    <input className="mf-input" value={group.group_name} maxLength={120} autoComplete="off" autoFocus
                      placeholder="e.g. Umoja Wanawake Kariakoo" aria-invalid={ge('group_name') ? true : undefined}
                      onChange={setGroupField('group_name')} />
                  </Field>
                  <Field label={<Bi text={t('grp.businessType')} />} required error={ge('business_type')}>
                    <input className="mf-input" list="mf-grp-biztypes" value={group.business_type} maxLength={80}
                      autoComplete="off" placeholder="Choose or type" aria-invalid={ge('business_type') ? true : undefined}
                      onChange={setGroupField('business_type')} />
                  </Field>
                  <Field label={<Bi text={t('grp.market')} />} required error={ge('market_name')}>
                    <input className="mf-input" value={group.market_name} maxLength={120} autoComplete="off"
                      placeholder="e.g. Soko la Kariakoo" aria-invalid={ge('market_name') ? true : undefined}
                      onChange={setGroupField('market_name')} />
                  </Field>
                  <Field label={<Bi text={t('grp.location')} />} required span error={ge('business_location')}>
                    <input className="mf-input" value={group.business_location} maxLength={160} autoComplete="off"
                      placeholder="Street, ward, district" aria-invalid={ge('business_location') ? true : undefined}
                      onChange={setGroupField('business_location')} />
                  </Field>
                  <DurationField labelKey="grp.together" span value={group.operational_duration_together}
                    onChange={v => setGroup(g => ({ ...g, operational_duration_together: v }))}
                    error={ge('operational_duration_together')} />
                </div>
              </div>
            )}

            {/* ── Step 2: Members ── */}
            {step === 1 && (
              <div className="mf-grp__pane" key="members">
                <div className="mf-grp__heading">
                  <h3><Bi text={t('grp.stepMembers')} /></h3>
                  <p>Add every member of {group.group_name.trim() || 'the group'} — at least {MIN_MEMBERS}.</p>
                </div>
                {shown[1] && errs.members.list && (
                  <div className="mf-alert mf-alert--error"><FiAlertCircle size={15} /> <span><Bi text={errs.members.list} block /></span></div>
                )}
                <div className="mf-grp-cards">
                  {members.map((m, i) => (
                    <MemberCard
                      key={m.key}
                      member={m}
                      index={i}
                      errors={errs.members.byKey[m.key]}
                      show={shown[1]}
                      canRemove={members.length > MIN_MEMBERS}
                      onField={(field, value) => setMemberField(m.key, field, value)}
                      onIdentityType={type => setMemberIdentity(m.key, type)}
                      onRemove={() => removeMember(m.key)}
                    />
                  ))}
                </div>
                <button type="button" className="mf-grp-add" onClick={addMember} disabled={members.length >= MAX_MEMBERS}>
                  {t('grp.addMember').en}<span className="mf-sw mf-sw--inline" lang="sw">{t('grp.addMember').sw}</span>
                </button>
                <p className="mf-grp__meta">{members.length} member{members.length === 1 ? '' : 's'} · {MIN_MEMBERS}–{MAX_MEMBERS} allowed</p>
              </div>
            )}

            {/* ── Step 3: Businesses & leader ── */}
            {step === 2 && (
              <div className="mf-grp__pane" key="business">
                <div className="mf-grp__heading">
                  <h3><Bi text={t('grp.stepBusiness')} /></h3>
                  <p>Each member’s business, and who leads the group.</p>
                </div>

                <section className="mf-grp-leader" aria-label="Group leader">
                  <div className="mf-grp-leader__head"><FiStar size={16} /> <span><Bi text={t('grp.leader')} /></span></div>
                  <p className="mf-grp-leader__hint">{leaderHint.en}<span className="mf-sw" lang="sw">{leaderHint.sw}</span></p>
                  <Field label="Leader · Kiongozi" required
                    error={shown[2] && leaderMissing ? <Bi text={t('grp.err.leader')} block /> : undefined}>
                    <select className="mf-select" value={leaderKey} aria-invalid={shown[2] && leaderMissing ? true : undefined}
                      onChange={e => setLeaderKey(e.target.value)}>
                      <option value="">Choose a member…</option>
                      {members.map((m, i) => (
                        <option key={m.key} value={m.key}>{m.full_name.trim() || `Member ${i + 1}`}</option>
                      ))}
                    </select>
                  </Field>
                  {leader && (
                    <dl className="mf-grp-leader__card">
                      <div><dt>Group leader name</dt><dd>{leader.full_name || '—'}</dd></div>
                      <div><dt>Group leader phone</dt><dd className="mf-mono">{leader.phone_number || '—'}</dd></div>
                    </dl>
                  )}
                </section>

                <div className="mf-grp-cards">
                  {members.map((m, i) => (
                    <BusinessCard
                      key={m.key}
                      member={m}
                      index={i}
                      errors={errs.businesses.byKey[m.key]}
                      show={shown[2]}
                      isLeader={m.key === leaderKey}
                      onField={(field, value) => setBusinessField(m.key, field, value)}
                    />
                  ))}
                </div>

                <dl className="mf-grp-summary" aria-label="Group totals">
                  <div><dt>Members</dt><dd>{members.length}</dd></div>
                  <div><dt>Weekly sales</dt><dd>TZS {fmt0(totals.sales)}</dd></div>
                  <div><dt>Weekly profit</dt><dd className="is-accent">TZS {fmt0(totals.profit)}</dd></div>
                  <div><dt>Leader</dt><dd>{leader?.full_name || '—'}</dd></div>
                </dl>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
