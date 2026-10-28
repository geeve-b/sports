import Match from '../models/Match.js';
import Player from '../models/Player.js';
import Season from '../models/Season.js';
import Team from '../models/Team.js';
import User from '../models/User.js';
import Availability from '../models/Availability.js';
import PlayerMatchStat from '../models/PlayerMatchStat.js';
import { sameId } from '../utils/access.js';
import { ApiError } from '../utils/ApiError.js';

export async function overview(_req, res) {
  const [users, pendingCoaches, teams, players, matches, seasons] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'coach', approved: false }),
    Team.countDocuments(),
    Player.countDocuments(),
    Match.countDocuments(),
    Season.countDocuments(),
  ]);
  res.json({ users, pendingCoaches, teams, players, matches, seasons });
}

export async function listUsers(req, res) {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.approved !== undefined && req.query.approved !== '') filter.approved = req.query.approved === 'true';
  if (req.query.q) {
    const rx = new RegExp(req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const users = await User.find(filter).populate('team', 'name shortName').sort({ approved: 1, createdAt: -1 }).lean();
  res.json(users.map(({ passwordHash, __v, ...u }) => u));
}

export async function updateUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'That account no longer exists.');
  const { role, approved, team } = req.body;

  if (sameId(user._id, req.user._id) && role && role !== 'admin') {
    throw new ApiError(422, 'You cannot remove your own admin role.');
  }
  if (role === 'player' && user.role !== 'player') {
    throw new ApiError(422, 'Players are created from the Squad page, so their profile exists. Change role to coach or admin only.');
  }

  if (team !== undefined) {
    if (team && !(await Team.exists({ _id: team }))) throw new ApiError(404, 'That team does not exist.');
    // Keep the coach list on teams in sync.
    if (user.role === 'coach' && user.team) await Team.updateOne({ _id: user.team }, { $pull: { coaches: user._id } });
    user.team = team || null;
    if (user.role === 'player' && team) await Player.updateOne({ user: user._id }, { team });
  }
  if (role) user.role = role;
  if (approved !== undefined) user.approved = Boolean(approved);
  await user.save();

  if (user.role === 'coach' && user.team) await Team.updateOne({ _id: user.team }, { $addToSet: { coaches: user._id } });
  await user.populate('team', 'name shortName');
  res.json(user);
}

export async function deleteUser(req, res) {
  if (sameId(req.params.id, req.user._id)) throw new ApiError(422, 'You cannot delete your own account here.');
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new ApiError(404, 'That account no longer exists.');
  const player = await Player.findOneAndDelete({ user: user._id });
  if (player) {
    await Promise.all([PlayerMatchStat.deleteMany({ player: player._id }), Availability.deleteMany({ player: player._id })]);
  }
  await Team.updateMany({ coaches: user._id }, { $pull: { coaches: user._id } });
  res.json({ message: `${user.name}'s account deleted.` });
}

// ---- Seasons ----
export async function listSeasons(_req, res) {
  res.json(await Season.find().sort({ startDate: -1 }).lean());
}

async function makeOnlyCurrent(season) {
  if (season.current) await Season.updateMany({ _id: { $ne: season._id } }, { current: false });
}

export async function createSeason(req, res) {
  const { name, startDate, endDate, current } = req.body;
  const season = await Season.create({ name, startDate, endDate, current: Boolean(current) });
  await makeOnlyCurrent(season);
  res.status(201).json(season);
}

export async function updateSeason(req, res) {
  const season = await Season.findById(req.params.id);
  if (!season) throw new ApiError(404, 'That season does not exist.');
  for (const key of ['name', 'startDate', 'endDate', 'current']) if (req.body[key] !== undefined) season.set(key, req.body[key]);
  await season.save();
  await makeOnlyCurrent(season);
  res.json(season);
}

export async function deleteSeason(req, res) {
  const inUse = await Match.countDocuments({ season: req.params.id });
  if (inUse) throw new ApiError(409, `This season has ${inUse} matches. Delete or move them first.`);
  const season = await Season.findByIdAndDelete(req.params.id);
  if (!season) throw new ApiError(404, 'That season does not exist.');
  await Team.updateMany({ season: season._id }, { season: null });
  res.json({ message: `Season ${season.name} deleted.` });
}
