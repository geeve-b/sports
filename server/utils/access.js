import { ApiError } from './ApiError.js';

export const sameId = (a, b) => a != null && b != null && String(a) === String(b);

/**
 * Which team a request is about. Admins may ask for any team (falling back to
 * their own); everyone else is pinned to the team on their account.
 */
export function resolveTeamId(req, requested) {
  const own = req.user.team;
  if (req.user.role === 'admin') {
    const team = requested || own;
    if (!team) throw new ApiError(400, 'Choose a team first.');
    return String(team);
  }
  if (!own) throw new ApiError(403, 'Your account is not on a team yet. Ask an admin to add you to one.');
  if (requested && !sameId(requested, own)) throw new ApiError(403, 'You can only view your own team.');
  return String(own);
}

export function assertTeamAccess(req, teamId) {
  if (req.user.role === 'admin') return;
  if (!sameId(teamId, req.user.team)) throw new ApiError(403, 'That belongs to another team.');
}

export const isStaff = (user) => user.role === 'admin' || user.role === 'coach';
