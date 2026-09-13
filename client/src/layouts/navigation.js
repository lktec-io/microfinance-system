import {
  FiGrid, FiLayers, FiUsers, FiCreditCard,
  FiFileText, FiBarChart2, FiShield,
} from 'react-icons/fi';

/* Single source of truth for sidebar, breadcrumbs and command palette. */
export const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', Icon: FiGrid, desc: 'Portfolio metrics & activity', end: true },
    ],
  },
  {
    label: 'Lending',
    items: [
      { to: '/loans',      label: 'Loan Management',   Icon: FiLayers,     desc: 'Applications, portfolio & calculator' },
      { to: '/customers',  label: 'Clients Directory', Icon: FiUsers,      desc: 'Profiles, scores & loan history' },
      { to: '/repayments', label: 'Repayments',        Icon: FiCreditCard, desc: 'Ledger & collections' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/expenses', label: 'Expenses', Icon: FiFileText,  desc: 'Operating costs' },
      { to: '/reports',  label: 'Reports',  Icon: FiBarChart2, desc: 'Analytics & PDF exports' },
    ],
  },
  {
    label: 'Administration',
    adminOnly: true,
    items: [
      { to: '/users', label: 'User Management', Icon: FiShield, desc: 'Staff accounts & roles' },
    ],
  },
];

export function visibleSections(isAdmin) {
  return NAV_SECTIONS.filter(s => !s.adminOnly || isAdmin);
}

export function flatNav(isAdmin) {
  return visibleSections(isAdmin).flatMap(s => s.items.map(i => ({ ...i, section: s.label })));
}

/** Resolve breadcrumb info for the current path. */
export function matchRoute(pathname) {
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      const hit = item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`);
      if (hit) {
        const detail = !item.end && pathname !== item.to ? pathname.slice(item.to.length + 1) : null;
        return { section: section.label, item, detail };
      }
    }
  }
  return { section: 'Workspace', item: { to: '/', label: 'Dashboard' }, detail: null };
}
