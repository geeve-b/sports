import Player from '../models/Player.js';
import Team from '../models/Team.js';
import User from '../models/User.js';
import { assertTeamAccess } from '../utils/access.js';
import { ApiError } from '../utils/ApiError.js';

const EDITABLE = ['name', 'shortName', 'crestUrl', 'colors', 'season'];

export async function listTeams(req, res) {
  const filter = req.user.role === 'admin' ? {} : { _id: req.user.team };
  const teams = await Team.find(filter).populate('season', 'name').populate('coaches', 'name email').sort('name').lean();
  const counts = await Player.aggregate([{ $group: { _id: '$team', players: { $sum: 1 } } }]);
  const byTeam = new Map(counts.map((c) => [String(c._id), c.players]));
  res.json(teams.map((t) => ({ ...t, playerCount: byTeam.get(String(t._id)) ?? 0 })));
}

// Unauthenticated: just enough for the registration form.
export async function listPublicTeams(_req, res) {
  res.json(await Team.find().select('name shortName colors').sort('name').lean());
}

export async function getTeam(req, res) {
  assertTeamAccess(req, req.params.id);
  const team = await Team.findById(req.params.id).populate('season').populate('coaches', 'name email avatar').lean();
  if (!team) throw new ApiError(404, 'That team does not exist.');
  res.json(team);
}

export async function createTeam(req, res) {
  const data = Object.fromEntries(EDITABLE.filter((k) => req.body[k] !== undefined).map((k) => [k, req.body[k]]));
  const team = await Team.create(data);
  res.status(201).json(team);
}

export async function updateTeam(req, res) {
  const team = await Team.findById(req.params.id);
  if (!team) throw new ApiError(404, 'That team does not exist.');
  if (req.user.role === 'coach') assertTeamAccess(req, team._id);

  for (const key of EDITABLE) if (req.body[key] !== undefined) team.set(key, req.body[key]);

  // Only admins change who coaches a team.
  if (req.user.role === 'admin' && Array.isArray(req.body.coaches)) {
    team.coaches = req.body.coaches;
    await User.updateMany({ _id: { $in: req.body.coaches } }, { team: team._id });
  }
  await team.save();
  res.json(team);
}

export async function deleteTeam(req, res) {
  const players = await Player.countDocuments({ team: req.params.id });
  if (players > 0) {
    throw new ApiError(409, `Move or remove this team's ${players} players before deleting it.`);
  }
  const team = await Team.findByIdAndDelete(req.params.id);
  if (!team) throw new ApiError(404, 'That team does not exist.');
  await User.updateMany({ team: team._id }, { team: null });
  res.json({ message: `${team.name} deleted.` });
}
