import {
  BarChart3,
  CalendarDays,
  CircleCheck,
  Goal,
  Megaphone,
  Radio,
  Settings2,
  ShieldCheck,
  Shirt,
  Timer,
  UserRound,
} from 'lucide-react';

/** The team sheet. Order is the shirt number shown in the side nav. */
export function navItemsFor({ role, player }) {
  const staff = role === 'admin' || role === 'coach';
  return [
    { to: '/', label: 'Match Centre', short: 'Live', icon: Radio, end: true },
    { to: '/squad', label: 'Squad', short: 'Squad', icon: Shirt },
    { to: '/fixtures', label: 'Fixtures', short: 'Fixtures', icon: CalendarDays },
    staff && { to: '/lineup', label: 'Formation', short: 'Lineup', icon: Goal },
    { to: '/training', label: 'Training', short: 'Training', icon: Timer },
    { to: '/availability', label: 'Availability', short: 'Avail.', icon: CircleCheck },
    { to: '/announcements', label: 'Announcements', short: 'News', icon: Megaphone },
    { to: '/stats', label: 'Team Stats', short: 'Stats', icon: BarChart3 },
    player && { to: `/squad/${player._id}`, label: 'My Profile', short: 'Me', icon: UserRound },
    role === 'admin' && { to: '/admin', label: 'Admin', short: 'Admin', icon: ShieldCheck },
    { to: '/settings', label: 'Settings', short: 'Settings', icon: Settings2 },
  ].filter(Boolean);
}

/** Four primary tabs for the mobile bar; everything else lives under "More". */
export function bottomTabsFor({ role }) {
  const staff = role === 'admin' || role === 'coach';
  return ['/', '/squad', '/fixtures', staff ? '/lineup' : '/availability'];
}
