import bcrypt from 'bcryptjs';
import Announcement from '../models/Announcement.js';
import Availability from '../models/Availability.js';
import Match from '../models/Match.js';
import Player from '../models/Player.js';
import PlayerMatchStat from '../models/PlayerMatchStat.js';
import Season from '../models/Season.js';
import Team from '../models/Team.js';
import TrainingSession from '../models/TrainingSession.js';
import User from '../models/User.js';
import { BCRYPT_ROUNDS } from '../config/constants.js';

export const DEMO_LOGINS = {
  password: 'matchday26',
  accounts: {
    admin: 'admin@wildplay.test',
    coach: 'coach@wildplay.test',
    player: 'dani.okafor@wildplay.test',
    pending: 'priya.nandakumar@wildplay.test (coach, awaiting approval)',
  },
};

// ---- deterministic randomness so every seed looks the same ----
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261014);
const between = (min, max) => min + Math.floor(rand() * (max - min + 1));
const pickWeighted = (items, weight) => {
  const total = items.reduce((s, i) => s + weight(i), 0);
  if (total <= 0) return null;
  let r = rand() * total;
  for (const item of items) {
    r -= weight(item);
    if (r <= 0) return item;
  }
  return items[items.length - 1];
};

// ---- dates relative to today, so the demo always has a next fixture ----
const DAY = 24 * 60 * 60 * 1000;
const at = (date, h, m = 0) => {
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
};
const addDays = (date, n) => new Date(date.getTime() + n * DAY);
function lastSaturday(from) {
  const d = at(from, 15);
  const back = (d.getDay() + 1) % 7 || 7; // always strictly before today
  return addDays(d, -back);
}

// ---- the squad ----
// [jersey, name, position, foot, height, weights { goal, assist }]
const SQUAD = [
  [1, 'Tomás Reyes', 'GK', 'right', 190, 0, 0.05],
  [13, 'Ivo Brandt', 'GK', 'left', 188, 0, 0],
  [31, 'Kofi Asante-Mills', 'GK', 'right', 193, 0, 0],
  [2, 'Malik Osei-Bonsu', 'DF', 'right', 179, 0.3, 1.2],
  [3, 'Rory Callaghan', 'DF', 'left', 181, 0.3, 1.3],
  [4, 'Kwame Mensah', 'DF', 'right', 189, 0.6, 0.3],
  [5, 'Jules Fontaine', 'DF', 'right', 187, 0.5, 0.3],
  [14, 'Sami Lindqvist', 'DF', 'left', 186, 0.4, 0.3],
  [15, 'Nico Varga', 'DF', 'right', 184, 0.3, 0.3],
  [22, 'Ewan Strachan', 'DF', 'both', 177, 0.2, 0.6],
  [6, 'Marco Bellini', 'MF', 'right', 182, 0.6, 1.2],
  [8, 'Leo Hartmann', 'MF', 'right', 178, 1.5, 2.6],
  [10, 'Yusuf Demir', 'MF', 'left', 175, 2.2, 3.2],
  [16, 'Arlo Whitfield', 'MF', 'right', 180, 0.6, 1],
  [17, 'Teo Marchetti', 'MF', 'right', 174, 1, 1.4],
  [18, 'Bram de Wit', 'MF', 'right', 183, 0.5, 0.8],
  [20, 'Caio Moreira', 'MF', 'both', 172, 0.8, 1.6],
  [7, 'Remy Lacroix', 'FW', 'left', 176, 3, 2.2],
  [9, 'Dani Okafor', 'FW', 'right', 185, 5.5, 1.2],
  [11, 'Finn Gallagher', 'FW', 'right', 179, 2.8, 2],
  [19, 'Zeki Aydın', 'FW', 'right', 181, 2, 0.8],
  [21, 'Oscar Lund', 'FW', 'left', 188, 1.4, 0.5],
];

const emailFor = (name) =>
  `${name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .trim()
    .replace(/\s+/g, '.')}@wildplay.test`;

// 8 played + 2 upcoming. [opponent, short, colour, homeAway, competition, for, against, venue]
const FIXTURES = [
  ['Ashby Vale', 'AVL', '#9F1239', 'home', 'County League', 2, 0],
  ['Corran Bay', 'CBY', '#0369A1', 'away', 'County League', 1, 1],
  ['Kingsmere', 'KGM', '#A16207', 'home', 'County League', 3, 2],
  ['Northgate Rovers', 'NGR', '#7C3AED', 'away', 'County League', 0, 2],
  ['Stonebridge Albion', 'STA', '#4D7C0F', 'home', 'County Cup', 4, 1],
  ['Eastfield United', 'EFU', '#0F766E', 'away', 'County League', 2, 2],
  ['Westholm', 'WHM', '#6B21A8', 'home', 'County League', 1, 0],
  ['Harbour Athletic', 'HAR', '#2B6CB0', 'home', 'County League', 3, 1],
  ['Millbrook Town', 'MIL', '#C2410C', 'away', 'County Cup', null, null],
  ['Larkfield', 'LRK', '#BE123C', 'home', 'County League', null, null],
];
const HOME_GROUND = 'Riverside Park';
const AWAY_GROUNDS = {
  'Corran Bay': 'The Quay Ground',
  'Northgate Rovers': 'Northgate Lane',
  'Eastfield United': 'Eastfield Rec',
  'Millbrook Town': 'Mill Lane',
};

// 4-3-3 starters by jersey, per match index. Rotation keeps it realistic.
const BASE_XI = { GK: 1, LB: 3, LCB: 4, RCB: 5, RB: 2, LCM: 10, CM: 6, RCM: 8, LW: 7, ST: 9, RW: 11 };
const XI_CHANGES = [
  {},
  { RCB: 14 },
  { LW: 17 },
  { RCB: 14, RW: 19 },
  { GK: 13, LB: 22, CM: 16, ST: 21 }, // cup rotation
  { RCB: 14 },
  { RCB: 15, LCM: 20 },
  { RCB: 15 },
];
const BENCH_POOL = [13, 15, 22, 16, 17, 20, 19, 21, 14, 18, 31];

export async function seedDatabase({ log = () => {} } = {}) {
  const now = new Date();
  await Promise.all(
    [User, Team, Season, Player, Match, PlayerMatchStat, TrainingSession, Availability, Announcement].map((M) => M.deleteMany({})),
  );
  await Promise.all([Player.syncIndexes(), PlayerMatchStat.syncIndexes(), Availability.syncIndexes()]);

  // Season
  const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const season = await Season.create({
    name: `${startYear}/${String(startYear + 1).slice(2)}`,
    startDate: new Date(startYear, 7, 1),
    endDate: new Date(startYear + 1, 4, 31),
    current: true,
  });

  // Team
  const team = await Team.create({
    name: 'Wildplay FC',
    shortName: 'WPL',
    colors: { primary: '#E8FF3A', secondary: '#0E0F0C' },
    season: season._id,
  });

  // Users — one hash for the shared demo password keeps seeding fast.
  const passwordHash = await bcrypt.hash(DEMO_LOGINS.password, BCRYPT_ROUNDS);
  const [admin, coach] = await User.insertMany([
    { name: 'Rina Castell', email: DEMO_LOGINS.accounts.admin, role: 'admin', team: team._id, passwordHash },
    { name: 'Jonah Achterberg', email: DEMO_LOGINS.accounts.coach, role: 'coach', team: team._id, passwordHash },
    { name: 'Priya Nandakumar', email: 'priya.nandakumar@wildplay.test', role: 'coach', team: team._id, approved: false, passwordHash },
  ]);
  team.coaches = [coach._id];
  await team.save();

  const playerUsers = await User.insertMany(
    SQUAD.map(([, name]) => ({ name, email: emailFor(name), role: 'player', team: team._id, passwordHash })),
  );

  const lastSat = lastSaturday(now);
  const matchDates = FIXTURES.map((_, i) => addDays(lastSat, (i - 7) * 7));

  const players = await Player.insertMany(
    SQUAD.map(([jersey, , position, foot, height], i) => ({
      user: playerUsers[i]._id,
      team: team._id,
      jerseyNumber: jersey,
      position,
      foot,
      height,
      dob: new Date(1995 + (i % 10), (i * 5) % 12, 1 + ((i * 7) % 27)),
      status: 'fit',
    })),
  );
  const byJersey = new Map(players.map((p) => [p.jerseyNumber, p]));
  const weights = new Map(SQUAD.map(([jersey, , , , , g, a]) => [jersey, { goal: g, assist: a }]));

  // Matches with lineups, events and per-player stats
  const statDocs = [];
  const matches = [];
  for (let i = 0; i < FIXTURES.length; i += 1) {
    const [opponent, opponentShort, opponentColor, homeAway, competition, gf, ga] = FIXTURES[i];
    const date = matchDates[i];
    const played = gf != null;
    const base = {
      team: team._id,
      season: season._id,
      opponent,
      opponentShort,
      opponentColor,
      date,
      homeAway,
      competition,
      venue: homeAway === 'home' ? HOME_GROUND : AWAY_GROUNDS[opponent] ?? `${opponent} Ground`,
    };
    if (!played) {
      matches.push({ ...base, status: 'scheduled', score: { for: null, against: null } });
      continue;
    }

    const xi = { ...BASE_XI, ...XI_CHANGES[i] };
    const starters = Object.values(xi);
    const bench = BENCH_POOL.filter((j) => !starters.includes(j) && !(j === 14 && i > 5)).slice(0, 7);
    const events = [];

    // Substitutions: three, around the hour. Match 6 (index 5) loses Lindqvist to injury.
    const subs = [];
    if (i === 5) {
      subs.push({ off: 14, on: 15, minute: 38 });
      events.push({ type: 'injury', player: byJersey.get(14)._id, minute: 37, note: 'Hamstring' });
    }
    // Bellini stays on until his red card in match 8.
    const subOffCandidates = starters.filter((j) => j !== xi.GK && !subs.some((s) => s.off === j) && !(i === 7 && j === 6));
    const benchLeft = bench.filter((j) => !subs.some((s) => s.on === j) && j !== 13 && j !== 31);
    while (subs.length < 3 && benchLeft.length) {
      const on = benchLeft.splice(between(0, benchLeft.length - 1), 1)[0];
      const onPos = byJersey.get(on).position;
      const offPool = subOffCandidates.filter((j) => byJersey.get(j).position === onPos && !subs.some((s) => s.off === j));
      const off = offPool.length ? offPool[between(0, offPool.length - 1)] : subOffCandidates.find((j) => !subs.some((s) => s.off === j));
      subs.push({ off, on, minute: between(58, 82) });
    }
    for (const s of subs) {
      events.push({ type: 'sub_out', player: byJersey.get(s.off)._id, minute: s.minute });
      events.push({ type: 'sub_in', player: byJersey.get(s.on)._id, minute: s.minute });
    }

    const onPitchAt = (minute) => [
      ...starters.filter((j) => !subs.some((s) => s.off === j && s.minute <= minute)),
      ...subs.filter((s) => s.minute <= minute).map((s) => s.on),
    ];

    const goals = {};
    const assists = {};
    const goalMinutes = Array.from({ length: gf }, () => between(4, 90)).sort((a, b) => a - b);
    for (const minute of goalMinutes) {
      const pitch = onPitchAt(minute);
      const scorer = pickWeighted(pitch, (j) => weights.get(j).goal);
      goals[scorer] = (goals[scorer] ?? 0) + 1;
      events.push({ type: 'goal', player: byJersey.get(scorer)._id, minute });
      if (rand() < 0.8) {
        const provider = pickWeighted(pitch.filter((j) => j !== scorer), (j) => weights.get(j).assist);
        if (provider) {
          assists[provider] = (assists[provider] ?? 0) + 1;
          events.push({ type: 'assist', player: byJersey.get(provider)._id, minute });
        }
      }
    }
    for (let g = 0; g < ga; g += 1) events.push({ type: 'goal_against', player: null, minute: between(6, 90) });

    // Cards
    const yellows = between(0, 3);
    for (let y = 0; y < yellows; y += 1) {
      const minute = between(15, 88);
      const pitch = onPitchAt(minute).filter((j) => byJersey.get(j).position !== 'GK');
      events.push({ type: 'yellow', player: byJersey.get(pitch[between(0, pitch.length - 1)])._id, minute });
    }
    if (i === 7) events.push({ type: 'red', player: byJersey.get(6)._id, minute: 84, note: 'Denied a goalscoring chance' });

    const result = gf > ga ? 'W' : gf < ga ? 'L' : 'D';
    const appeared = [...starters, ...subs.map((s) => s.on)];
    for (const j of appeared) {
      const p = byJersey.get(j);
      const sub = subs.find((s) => s.on === j);
      const off = subs.find((s) => s.off === j);
      let minutes = sub ? 90 - sub.minute : off ? off.minute : 90;
      if (j === 6 && i === 7) minutes = 84;
      const share = minutes / 90;
      const g = goals[j] ?? 0;
      const a = assists[j] ?? 0;
      const shotRange = { GK: [0, 0], DF: [0, 1], MF: [0, 3], FW: [1, 5] }[p.position];
      const passRange = { GK: [18, 34], DF: [34, 68], MF: [38, 78], FW: [14, 36] }[p.position];
      const rating =
        6.3 + g * 0.85 + a * 0.5 + (result === 'W' ? 0.35 : result === 'L' ? -0.45 : 0) +
        (p.position === 'GK' && ga === 0 ? 0.6 : 0) + (rand() - 0.5) * 1.1;
      statDocs.push({
        player: p._id,
        team: team._id,
        matchIndex: i,
        minutes,
        goals: g,
        assists: a,
        shots: g + Math.round(between(...shotRange) * share),
        passes: Math.round(between(...passRange) * share),
        rating: Math.round(Math.min(9.7, Math.max(5.1, rating)) * 10) / 10,
      });
    }

    matches.push({
      ...base,
      status: 'ft',
      score: { for: gf, against: ga },
      events: events.sort((a, b) => a.minute - b.minute),
      lineup: {
        formation: '4-3-3',
        positions: Object.entries(xi).map(([slot, j]) => ({ slot, player: byJersey.get(j)._id })),
        bench: bench.map((j) => byJersey.get(j)._id),
      },
    });
  }

  const matchDocs = await Match.insertMany(matches);
  await PlayerMatchStat.insertMany(
    statDocs.map(({ matchIndex, ...s }) => ({ ...s, match: matchDocs[matchIndex]._id })),
  );

  // Fitness: Lindqvist injured in match 6, Hartmann carrying a knock, Bellini banned after the red.
  const lindqvist = byJersey.get(14);
  lindqvist.status = 'injured';
  lindqvist.injuries.push(
    { type: 'Ankle sprain', startDate: addDays(now, -150), endDate: addDays(now, -128), notes: 'Pre-season. Fully recovered.' },
    { type: 'Hamstring strain', startDate: matchDates[5], endDate: null, notes: 'Grade 2. Expected back in 3–4 weeks. Physio twice a week.' },
  );
  const hartmann = byJersey.get(8);
  hartmann.status = 'doubtful';
  hartmann.injuries.push({ type: 'Ankle knock', startDate: addDays(lastSat, 1), endDate: addDays(now, 3), notes: 'Late fitness test on Friday.' });
  byJersey.get(6).status = 'suspended';
  await Promise.all([lindqvist.save(), hartmann.save(), byJersey.get(6).save()]);

  // Training: Mon recovery, Tue + Thu evening sessions, four weeks back and ten days ahead, plus one today.
  const FOCUS = {
    1: { focus: 'Recovery', h: 10, m: 0, duration: 60, location: 'Gym + pool', drills: ['Pool session', 'Mobility', 'Foam rolling'] },
    2: { focus: 'Pressing triggers', h: 18, m: 30, duration: 90, location: 'Pitch 1', drills: ['Rondo 5v2', 'Press on the back pass', '8v8 transition game'] },
    4: { focus: 'Set pieces', h: 18, m: 30, duration: 90, location: 'Pitch 1', drills: ['Near-post corner routine', 'Wall work', 'Defending second balls'] },
  };
  const sessions = [];
  for (let d = -28; d <= 10; d += 1) {
    const day = addDays(at(now, 12), d);
    const plan = FOCUS[day.getDay()];
    const isToday = d === 0;
    if (!plan && !isToday) continue;
    const p = plan ?? { focus: 'Finishing', h: 18, m: 30, duration: 75, location: 'Pitch 2', drills: ['Finishing from cut-backs', 'One-touch combinations', 'Small-sided 4v4'] };
    const date = at(day, p.h, p.m);
    const past = date.getTime() + p.duration * 60 * 1000 < now.getTime();
    const attendance = past
      ? players.map((pl) => {
          const out = pl.jerseyNumber === 14 && date > matchDates[5];
          return { player: pl._id, present: !out && rand() < 0.9, checkedInAt: null };
        })
      : [];
    attendance.forEach((a) => {
      if (a.present) a.checkedInAt = new Date(date.getTime() - between(5, 25) * 60 * 1000);
    });
    sessions.push({ team: team._id, date, duration: p.duration, focus: p.focus, location: p.location, drills: p.drills, attendance });
  }
  await TrainingSession.insertMany(sessions);

  // Availability for the next fixture
  const next = matchDocs[8];
  const responses = [];
  for (const pl of players) {
    if (pl.jerseyNumber === 14) responses.push({ player: pl._id, match: next._id, available: false, reason: 'Hamstring. Out for 3–4 weeks.' });
    else if (pl.jerseyNumber === 6) responses.push({ player: pl._id, match: next._id, available: false, reason: 'Suspended after the red card against Harbour.' });
    else if (pl.jerseyNumber === 20) responses.push({ player: pl._id, match: next._id, available: false, reason: 'Family wedding.' });
    else if ([8, 31, 18, 21].includes(pl.jerseyNumber)) continue; // still to answer
    else responses.push({ player: pl._id, match: next._id, available: true });
  }
  await Availability.insertMany(responses);

  // Announcements. Player of the month is whoever the generated stats made top scorer.
  const goalsBy = new Map();
  for (const s of statDocs) goalsBy.set(String(s.player), (goalsBy.get(String(s.player)) ?? 0) + s.goals);
  const [topId, topGoals] = [...goalsBy.entries()].sort((a, b) => b[1] - a[1])[0];
  const topName = SQUAD[players.findIndex((p) => String(p._id) === topId)][1];
  const posts = [
    { title: 'Thursday training moves to Pitch 2', body: 'Pitch 1 is being re-seeded this week. Thursday’s set-piece session runs on Pitch 2, same time, 18:30. Bring moulded studs; the surface is firm.', priority: 'urgent', ago: 0.2 },
    { title: `Availability for ${next.opponent} closes Friday 12:00`, body: 'Respond on the Availability page by midday Friday so the squad can be named on Friday evening. If you are unsure, say no and add a reason. You can change it later.', priority: 'high', ago: 1 },
    { title: `Player of the month: ${topName}`, body: `Voted by the squad after ${topGoals} goals so far this season. Presentation before the next home game.`, priority: 'normal', ago: 3 },
    { title: 'Physio clinic every Monday', body: 'The club physio is in the treatment room every Monday from 09:00 to 12:00. Book a slot with the coaching staff if you are carrying a knock.', priority: 'normal', ago: 6 },
    { title: 'Away kit collection', body: 'Away shirts are ready in the kit room. Collect yours before the trip to Mill Lane; numbers are already printed.', priority: 'normal', ago: 9 },
  ];
  await Announcement.insertMany(
    posts.map(({ ago, ...p }) => ({
      ...p,
      team: team._id,
      author: coach._id,
      createdAt: new Date(now.getTime() - ago * DAY),
      updatedAt: new Date(now.getTime() - ago * DAY),
    })),
    { timestamps: false },
  );

  const summary = {
    users: await User.countDocuments(),
    players: players.length,
    matches: matchDocs.length,
    stats: statDocs.length,
    training: sessions.length,
    availability: responses.length,
    announcements: posts.length,
  };
  log(`Seeded ${team.name} (${season.name}). Admin: ${admin.email}`);
  return summary;
}
