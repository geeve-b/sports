import Player from '../models/Player.js';
import TrainingSession from '../models/TrainingSession.js';
import { assertTeamAccess, resolveTeamId } from '../utils/access.js';
import { ApiError } from '../utils/ApiError.js';

const EDITABLE = ['date', 'duration', 'focus', 'location', 'drills'];
const HOUR = 60 * 60 * 1000;

async function loadSession(req) {
  const session = await TrainingSession.findById(req.params.id);
  if (!session) throw new ApiError(404, 'That training session is not on the calendar.');
  assertTeamAccess(req, session.team);
  return session;
}

export async function listSessions(req, res) {
  const team = resolveTeamId(req, req.query.team);
  const filter = { team };
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = new Date(req.query.from);
    if (req.query.to) filter.date.$lte = new Date(req.query.to);
  }
  res.json(await TrainingSession.find(filter).sort({ date: 1 }).lean());
}

export async function createSession(req, res) {
  const team = resolveTeamId(req, req.body.team);
  const data = Object.fromEntries(EDITABLE.filter((k) => req.body[k] !== undefined).map((k) => [k, req.body[k]]));
  res.status(201).json(await TrainingSession.create({ ...data, team }));
}

export async function updateSession(req, res) {
  const session = await loadSession(req);
  for (const key of EDITABLE) if (req.body[key] !== undefined) session.set(key, req.body[key]);
  await session.save();
  res.json(session);
}

export async function deleteSession(req, res) {
  const session = await loadSession(req);
  await session.deleteOne();
  res.json({ message: 'Session removed.' });
}

// Coach marks the register: [{ player, present }]
export async function setAttendance(req, res) {
  const session = await loadSession(req);
  const rows = req.body.attendance || [];
  const ids = rows.map((r) => r.player);
  const count = await Player.countDocuments({ _id: { $in: ids }, team: session.team });
  if (count !== new Set(ids.map(String)).size) throw new ApiError(422, 'Everyone on the register must be in this squad.');

  const previous = new Map(session.attendance.map((a) => [String(a.player), a]));
  session.attendance = rows.map((r) => ({
    player: r.player,
    present: Boolean(r.present),
    checkedInAt: r.present ? previous.get(String(r.player))?.checkedInAt ?? new Date() : null,
  }));
  await session.save();
  res.json(session);
}

// A player checks themselves in, from 2 hours before kick-off until 2 hours after the end.
export async function checkIn(req, res) {
  const session = await loadSession(req);
  const player = await Player.findOne({ user: req.user._id });
  if (!player) throw new ApiError(403, 'Only players can check in.');

  const start = session.date.getTime();
  const end = start + session.duration * 60 * 1000;
  const now = Date.now();
  if (now < start - 2 * HOUR) throw new ApiError(422, 'Check-in opens 2 hours before the session starts.');
  if (now > end + 2 * HOUR) throw new ApiError(422, 'Check-in for this session has closed. Ask your coach to mark you present.');

  const existing = session.attendance.find((a) => String(a.player) === String(player._id));
  if (existing) {
    existing.present = true;
    existing.checkedInAt = existing.checkedInAt ?? new Date();
  } else {
    session.attendance.push({ player: player._id, present: true, checkedInAt: new Date() });
  }
  await session.save();
  res.json(session);
}
