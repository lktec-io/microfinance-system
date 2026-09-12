import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiSearch, FiCornerDownLeft, FiArrowRight, FiArrowUp, FiArrowDown,
  FiFilePlus, FiUserPlus, FiDollarSign,
} from 'react-icons/fi';
import ModalPortal  from '../components/common/ModalPortal';
import { useAuth }  from '../context/AuthContext';
import { flatNav }  from './navigation';

const ACTIONS = [
  { to: '/loans?new=1',        label: 'New loan application', desc: 'Start the multi-step origination flow', Icon: FiFilePlus },
  { to: '/repayments?record=1', label: 'Record a repayment',  desc: 'Post a payment against an open loan',  Icon: FiDollarSign },
  { to: '/customers?new=1',    label: 'Register a client',    desc: 'Add a new borrower profile',          Icon: FiUserPlus },
];

export default function CommandPalette({ onClose }) {
  const navigate    = useNavigate();
  const { isAdmin } = useAuth();
  const [query, setQuery]   = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef(null);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = i => !q || i.label.toLowerCase().includes(q) || (i.desc || '').toLowerCase().includes(q);
    return [
      { label: 'Quick actions', items: ACTIONS.filter(match) },
      { label: 'Go to',         items: flatNav(isAdmin).filter(match) },
    ].filter(g => g.items.length);
  }, [query, isAdmin]);

  const flat = groups.flatMap(g => g.items);

  useEffect(() => { setActive(0); }, [query]);

  useEffect(() => {
    listRef.current?.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function go(item) {
    if (!item) return;
    navigate(item.to);
    onClose();
  }

  function onKeyDown(e) {
    if (e.key === 'Escape')    { e.preventDefault(); onClose(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, flat.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    if (e.key === 'Enter')     { e.preventDefault(); go(flat[active]); }
  }

  let index = -1;

  return (
    <ModalPortal>
      <div className="mf-overlay mf-cmd-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="mf-cmd" role="dialog" aria-modal="true" aria-label="Command palette">
          <div className="mf-cmd__input-row">
            <FiSearch size={17} />
            <input
              autoFocus
              className="mf-cmd__input"
              placeholder="Search pages or actions…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              aria-label="Search pages or actions"
            />
            <span className="mf-kbd">ESC</span>
          </div>

          <div className="mf-cmd__list" ref={listRef}>
            {flat.length === 0 && <div className="mf-cmd__empty">No results for “{query}”</div>}
            {groups.map(group => (
              <div key={group.label}>
                <div className="mf-cmd__group">{group.label}</div>
                {group.items.map(item => {
                  index += 1;
                  const i = index;
                  const { Icon } = item;
                  return (
                    <button
                      key={item.to}
                      type="button"
                      className={`mf-cmd__item${i === active ? ' is-active' : ''}`}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(item)}
                    >
                      <span className="mf-cmd__item-icon"><Icon size={14} /></span>
                      <span>
                        <span className="mf-cmd__item-label">{item.label}</span>
                        <br />
                        <span className="mf-cmd__item-desc">{item.desc}</span>
                      </span>
                      <FiArrowRight size={14} className="mf-cmd__item-go" />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="mf-cmd__foot">
            <span><FiArrowUp size={11} /><FiArrowDown size={11} /> Navigate</span>
            <span><FiCornerDownLeft size={11} /> Open</span>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
