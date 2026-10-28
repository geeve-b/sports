import { surname } from './format';

export const STATUS_LABELS = { scheduled: 'Scheduled', live: 'Live', ht: 'Half time', ft: 'Full time', postponed: 'Postponed' };

export const EVENT_LABELS = {
  goal: 'Goal',
  own_goal: 'Own goal',
  assist: 'Assist',
  yellow: 'Yellow card',
  red: 'Red card',
  sub_in: 'On',
  sub_out: 'Off',
  injury: 'Injury',
  goal_against: 'Conceded',
};

export function resultOf(match) {
  if (match?.result) return match.result;
  const f = match?.score?.for;
  const a = match?.score?.against;
  if (match?.status !== 'ft' || f == null || a == null) return null;
  return f > a ? 'W' : f < a ? 'L' : 'D';
}

/** Props for <Scoreline> from a match, putting the home side on the left. */
export function toScoreline(match, team) {
  const us = {
    name: team?.name ?? 'Us',
    shortName: team?.shortName ?? 'US',
    color: team?.colors?.primary ?? '#E8FF3A',
  };
  const them = { name: match.opponent, shortName: match.opponentShort, color: match.opponentColor };
  const f = match.score?.for;
  const a = match.score?.against;
  const home = match.homeAway === 'home' ? { ...us, score: f } : { ...them, score: a };
  const away = match.homeAway === 'home' ? { ...them, score: a } : { ...us, score: f };
  return {
    home,
    away,
    status: match.status,
    outcome: resultOf(match),
    date: match.date,
    venue: match.venue ? `${match.venue} · ${match.homeAway === 'home' ? 'Home' : 'Away'}` : undefined,
    competition: match.competition,
    scorers: scorersOf(match),
  };
}

export function scorersOf(match) {
  return (match.events ?? [])
    .filter((e) => (e.type === 'goal' || e.type === 'own_goal') && e.player)
    .map((e) => ({ name: surname(e.player.name ?? ''), minute: e.minute }));
}

export const isUpcoming = (m) => m.status === 'scheduled' && new Date(m.date) >= new Date(Date.now() - 3 * 3600 * 1000);
