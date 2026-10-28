import Player from '../models/Player.js';
import Team from '../models/Team.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { clearAuthCookie, setAuthCookie } from '../utils/token.js';

/** The signed-in user, with their team and (for players) their player profile. */
export async function buildMe(user) {
  const [team, player] = await Promise.all([
    user.team ? Team.findById(user.team).populate('season', 'name startDate endDate').lean() : null,
    user.role === 'player' ? Player.findOne({ user: user._id }).lean() : null,
  ]);
  return { user: user.toJSON(), team, player };
}

export async function register(req, res) {
  const { name, email, password, role = 'player', team: teamId, position, jerseyNumber } = req.body;

  if (await User.exists({ email: email.toLowerCase() })) {
    throw new ApiError(409, 'An account with that email already exists. Sign in instead.');
  }

  let team = null;
  if (teamId) {
    team = await Team.findById(teamId);
    if (!team) throw new ApiError(404, 'That team no longer exists. Pick another.');
  }
  if (role === 'player' && !team) throw new ApiError(422, 'Pick the team you play for.');

  const user = new User({ name, email, role, team: team?._id ?? null, approved: role !== 'coach' });
  await user.setPassword(password);
  await user.save();

  if (role === 'player') {
    try {
      await Player.create({
        user: user._id,
        team: team._id,
        position: position || 'MF',
        ...(jerseyNumber ? { jerseyNumber } : {}),
      });
    } catch (err) {
      await user.deleteOne();
      throw err;
    }
  }

  if (role === 'coach') {
    return res.status(201).json({
      pendingApproval: true,
      message: 'Your coach account is set up. An admin needs to approve it before you can sign in.',
    });
  }

  setAuthCookie(res, user);
  res.status(201).json(await buildMe(user));
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user || !(await user.checkPassword(password))) {
    throw new ApiError(401, 'That email and password do not match an account.');
  }
  if (!user.approved) {
    throw new ApiError(403, 'Your coach account is waiting for an admin to approve it.');
  }
  setAuthCookie(res, user);
  res.json(await buildMe(user));
}

export function logout(_req, res) {
  clearAuthCookie(res);
  res.json({ message: 'Signed out.' });
}

export async function me(req, res) {
  res.json(await buildMe(req.user));
}

export async function updateMe(req, res) {
  const { name, email, avatar } = req.body;
  if (email && email.toLowerCase() !== req.user.email) {
    if (await User.exists({ email: email.toLowerCase() })) throw new ApiError(409, 'That email address is already taken.');
    req.user.email = email;
  }
  if (name !== undefined) req.user.name = name;
  if (avatar !== undefined) req.user.avatar = avatar;
  await req.user.save();
  res.json(await buildMe(req.user));
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await user.checkPassword(currentPassword))) {
    throw new ApiError(422, 'Your current password is not right.', { fields: { currentPassword: 'Your current password is not right.' } });
  }
  await user.setPassword(newPassword);
  await user.save();
  setAuthCookie(res, user);
  res.json({ message: 'Password changed.' });
}
