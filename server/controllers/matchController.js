import Availability from '../models/Availability.js';
import Match from '../models/Match.js';
import Player from '../models/Player.js';
import PlayerMatchStat from '../models/PlayerMatchStat.js';
import Team from '../models/Team.js';
import { FORMATIONS } from '../config/constants.js';
import { assertTeamAccess, resolveTeamId } from '../utils/access.js';
import { ApiError } from '../utils/ApiError.js';
import { serializePlayer, userFields } from '../utils/players.js';

const EDITABLE = ['opponent', 'opponentShort', 'opponentColor', 'date', 'venue', 'homeAway', 'competition', 'status', 'season'];

async function loadMatch(req) {
  const match = await Match.findById(req.params.id);
  if (!match) throw new ApiError(404, 'That match is not on the calendar.');
  assertTeamAccess(req, match.team);
  return match;
}

const populatePlayer = (path) => ({ path, populate: { path: 'user', select: userFields } });

async function fullMatch(id) {
  const match = await Match.findById(id)
    .populate(populatePlayer('events.player'))
    .populate(populatePlayer('lineup.positions.player'))
    .populate(populatePlayer('lineup.bench'));
  const stats = await PlayerMatchStat.find({ match: id }).populate(populatePlayer('player')).lean();

  const out = match.toJSON();
  const flat = (p) => (p && p.user ? serializePlayer(p) : p);
  out.events = out.events.map((e) => ({ ...e, player: flat(e.player) })).sort((a, b) => a.minute - b.minute);
  out.lineup.positions = out.lineup.positions.map((s) => ({ ...s, player: flat(s.player) }));
  out.lineup.bench = out.lineup.bench.map(flat);
  out.stats = stats.map((s) => ({ ...s, player: flat(s.player) }));
  return out;
}

export async function listMatches(req, res) {
  const team = resolveTeamId(req, req.query.team);
  const filter = { team };
  if (req.query.status) filter.status = { $in: String(req.query.status).split(',') };
  if (req.query.season) filter.season = req.query.season;
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = new Date(req.query.from);
    if (req.query.to) filter.date.$lte = new Date(req.query.to);
  }
  const sort = req.query.sort === 'desc' ? { date: -1 } : { date: 1 };
  const limit = Math.min(Number(req.query.limit) || 100, 200);

  const matches = await Match.find(filter).sort(sort).limit(limit).populate(populatePlayer('events.player'));
  res.json(
    matches.map((m) => {
      const out = m.toJSON();
      out.events = out.events.map((e) => ({ ...e, player: e.player?.user ? serializePlayer(e.player) : e.player }));
      return out;
    }),
  );
}

export async function getMatch(req, res) {
  await loadMatch(req);
  res.json(await fullMatch(req.params.id));
}

export async function createMatch(req, res) {
  const team = resolveTeamId(req, req.body.team);
  const teamDoc = await Team.findById(team).select('season');
  const data = Object.fromEntries(EDITABLE.filter((k) => req.body[k] !== undefined).map((k) => [k, req.body[k]]));
  const match = await Match.create({ season: teamDoc?.season ?? null, ...data, team });
  res.status(201).json(match);
}

export async function updateMatch(req, res) {
  const match = await loadMatch(req);
  for (const key of EDITABLE) if (req.body[key] !== undefined) match.set(key, req.body[key]);
  if (req.body.score) {
    match.score.for = req.body.score.for ?? match.score.for;
    match.score.against = req.body.score.against ?? match.score.against;
  }
  if (match.status === 'ft' && (match.score.for == null || match.score.against == null)) {
    throw new ApiError(422, 'Enter both scores before marking the match full time.');
  }
  await match.save();
  res.json(await fullMatch(match._id));
}

export async function deleteMatch(req, res) {
  const match = await loadMatch(req);
  await Promise.all([
    PlayerMatchStat.deleteMany({ match: match._id }),
    Availability.deleteMany({ match: match._id }),
    match.deleteOne(),
  ]);
  res.json({ message: `Match against ${match.opponent} deleted.` });
}

async function assertSquad(teamId, ids) {
  const unique = [...new Set(ids.map(String))];
  if (unique.length !== ids.length) throw new ApiError(422, 'A player can only appear once in the lineup.');
  const count = await Player.countDocuments({ _id: { $in: unique }, team: teamId });
  if (count !== unique.length) throw new ApiError(422, 'Every player in the lineup must be in this squad.');
}

export async function saveLineup(req, res) {
  const match = await loadMatch(req);
  const { formation, positions = [], bench = [] } = req.body;
  const slots = FORMATIONS[formation];
  if (!slots) throw new ApiError(422, 'Pick one of the listed formations.');
  const badSlot = positions.find((p) => !slots.includes(p.slot));
  if (badSlot) throw new ApiError(422, `${badSlot.slot} is not a position in a ${formation}.`);
  if (new Set(positions.map((p) => p.slot)).size !== positions.length) {
    throw new ApiError(422, 'Each position can only hold one player.');
  }
  await assertSquad(match.team, [...positions.map((p) => p.player), ...bench]);

  match.lineup = { formation, positions, bench };
  await match.save();
  res.json(await fullMatch(match._id));
}

export async function addEvent(req, res) {
  const match = await loadMatch(req);
  const { type, player, minute, note } = req.body;
  if (player) await assertSquad(match.team, [player]);
  match.events.push({ type, player: player || null, minute, note });
  await match.save();
  res.status(201).json(await fullMatch(match._id));
}

export async function deleteEvent(req, res) {
  const match = await loadMatch(req);
  const event = match.events.id(req.params.eventId);
  if (!event) throw new ApiError(404, 'That event is not on record.');
  event.deleteOne();
  await match.save();
  res.json(await fullMatch(match._id));
}

// Bulk upsert of per-player numbers for one match.
export async function saveStats(req, res) {
  const match = await loadMatch(req);
  const rows = req.body.stats || [];
  await assertSquad(match.team, rows.map((r) => r.player));

  await Promise.all(
    rows.map((r) =>
      PlayerMatchStat.findOneAndUpdate(
        { player: r.player, match: match._id },
        {
          team: match.team,
          minutes: r.minutes ?? 0,
          goals: r.goals ?? 0,
          assists: r.assists ?? 0,
          shots: r.shots ?? 0,
          passes: r.passes ?? 0,
          rating: r.rating ?? null,
        },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
      ),
    ),
  );
  const keep = rows.map((r) => r.player);
  await PlayerMatchStat.deleteMany({ match: match._id, player: { $nin: keep } });
  res.json(await fullMatch(match._id));
}
