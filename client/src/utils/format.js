const LOCALE = 'en-GB';

export const fmtDate = (d, opts = { weekday: 'short', day: '2-digit', month: 'short' }) =>
  d ? new Date(d).toLocaleDateString(LOCALE, opts) : '';

export const fmtLongDate = (d) => fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' }) : '');

export const fmtDateTime = (d) => `${fmtDate(d)} · ${fmtTime(d)}`;

export function fmtRelative(d) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return fmtDate(d, { day: 'numeric', month: 'short' });
}

export function age(dob) {
  if (!dob) return null;
  const b = new Date(dob);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a -= 1;
  return a;
}

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

export const surname = (name = '') => name.trim().split(/\s+/).slice(-1)[0] ?? name;

// Value for <input type="datetime-local"> / type="date" in local time.
export function toLocalInput(d, withTime = true) {
  if (!d) return '';
  const x = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  const date = `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
  return withTime ? `${date}T${pad(x.getHours())}:${pad(x.getMinutes())}` : date;
}

export const pad2 = (n) => String(n).padStart(2, '0');

export const POSITION_NAMES = { GK: 'Goalkeeper', DF: 'Defender', MF: 'Midfielder', FW: 'Forward' };
export const POSITION_PLURAL = { GK: 'Goalkeepers', DF: 'Defenders', MF: 'Midfielders', FW: 'Forwards' };
export const STATUS_NAMES = { fit: 'Fit', doubtful: 'Doubtful', injured: 'Injured', suspended: 'Suspended' };
export const FOOT_NAMES = { left: 'Left', right: 'Right', both: 'Both' };
