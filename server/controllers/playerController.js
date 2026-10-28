import Availability from '../models/Availability.js';
import Player from '../models/Player.js';
import PlayerMatchStat from '../models/PlayerMatchStat.js';
import User from '../models/User.js';
import { assertTeamAccess, isStaff, resolveTeamId } from '../utils/access.js';
import { ApiError } from '../utils/ApiError.js';
import { serializePlayer, totalsByPlayer, userFields } from '../utils/players.js';
import { tempPassword } from '../utils/random.js';

const PROFILE_FIELDS = ['jerseyNumber', 'position', 'dob', 'height', 'foot', 'status'];
const POSITION_ORDER = { GK: 0, DF: 1, MF: 2, FW: 3 };

async function loadPlayer(req) {
  const player = await Player.findById(req.params.id).populate('user', userFields);
  if (!player) throw new ApiError(404, 'That player is not in the squad.');
  assertTeamAccess(req, player.team);
  return player;
}

export async function listPlayers(req, res) {
  const team = resolveTeamId(req, req.query.team);
  const filter = { team };
  if (req.query.position) filter.position = req.query.position;
  if (req.query.status) filter.status = req.query.status;

  let players = await Player.find(filter).populate('user', userFields);
  const q = req.query.q?.trim().toLowerCase();
  if (q) {
    players = players.filter(
      (p) => p.user?.name?.toLowerCase().includes(q) || String(p.jerseyNumber ?? '') === q,
    );
  }

  const totals = await totalsByPlayer(players.map((p) => p._id));
  const includeEmail = isStaff(req.user);
  const out = players
    .map((p) => serializePlayer(p, { totals: totals.get(String(p._id)), includeEmail }))
    .sort((a, b) => POSITION_ORDER[a.position] - POSITION_ORDER[b.position] || (a.jerseyNumber ?? 100) - (b.jerseyNumber ?? 100));
  res.json(out);
}

export async function getPlayer(req, res) {
  const player = await loadPlayer(req);
  const totals = await totalsByPlayer([player._id]);
  const includeEmail = isStaff(req.user) || String(player.user._id) === String(req.user._id);
  res.json(serializePlayer(player, { totals: totals.get(String(player._id)), includeEmail }));
}

export async function createPlayer(req, res) {
  const team = resolveTeamId(req, req.body.team);
  const { name, email } = req.body;

  if (await User.exists({ email: email.toLowerCase() })) {
    throw new ApiError(409, 'An account with that email already exists.');
  }

  const password = req.body.password || tempPassword();
  const user = new User({ name, email, role: 'player', team });
  await user.setPassword(password);
  await user.save();

  let player;
  try {
    const profile = Object.fromEntries(PROFILE_FIELDS.filter((k) => req.body[k] != null && req.body[k] !== '').map((k) => [k, req.body[k]]));
    player = await Player.create({ ...profile, user: user._id, team });
  } catch (err) {
    await user.deleteOne();
    throw err;
  }

  await player.populate('user', userFields);
  res.status(201).json({
    player: serializePlayer(player, { includeEmail: true }),
    // Shown once to the coach so they can pass it on.
    tempPassword: req.body.password ? undefined : password,
  });
}

export async function updatePlayer(req, res) {
  const player = await loadPlayer(req);

  for (const key of PROFILE_FIELDS) {
    if (req.body[key] !== undefined) player.set(key, req.body[key] === '' ? undefined : req.body[key]);
  }
  await player.save();

  const user = await User.findById(player.user._id);
  if (req.body.name !== undefined) user.name = req.body.name;
  if (req.body.email !== undefined && req.body.email.toLowerCase() !== user.email) {
    if (await User.exists({ email: req.body.email.toLowerCase() })) throw new ApiError(409, 'That email address is already taken.');
    user.email = req.body.email;
  }
  await user.save();

  await player.populate('user', userFields);
  const totals = await totalsByPlayer([player._id]);
  res.json(serializePlayer(player, { totals: totals.get(String(player._id)), includeEmail: true }));
}

export async function deletePlayer(req, res) {
  const player = await loadPlayer(req);
  const name = player.user?.name ?? 'Player';
  await Promise.all([
    PlayerMatchStat.deleteMany({ player: player._id }),
    Availability.deleteMany({ player: player._id }),
    User.deleteOne({ _id: player.user._id }),
    player.deleteOne(),
  ]);
  res.json({ message: `${name} removed from the squad.` });
}

export async function addInjury(req, res) {
  const player = await loadPlayer(req);
  const { type, startDate, endDate, notes } = req.body;
  player.injuries.push({ type, startDate: startDate || new Date(), endDate: endDate || null, notes });
  if (!endDate || new Date(endDate) > new Date()) player.status = 'injured';
  await player.save();
  res.status(201).json(serializePlayer(player, { includeEmail: true }));
}

export async function updateInjury(req, res) {
  const player = await loadPlayer(req);
  const injury = player.injuries.id(req.params.injuryId);
  if (!injury) throw new ApiError(404, 'That injury is not on record.');
  for (const key of ['type', 'startDate', 'endDate', 'notes']) {
    if (req.body[key] !== undefined) injury.set(key, req.body[key] || null);
  }
  const now = new Date();
  const stillOut = player.injuries.some((i) => !i.endDate || i.endDate > now);
  if (!stillOut && player.status === 'injured') player.status = 'fit';
  if (stillOut) player.status = 'injured';
  await player.save();
  res.json(serializePlayer(player, { includeEmail: true }));
}
