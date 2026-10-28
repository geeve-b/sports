import mongoose from 'mongoose';
import PlayerMatchStat from '../models/PlayerMatchStat.js';

const EMPTY_TOTALS = { apps: 0, minutes: 0, goals: 0, assists: 0, shots: 0, passes: 0, rating: null };

const toObjectId = (id) => new mongoose.Types.ObjectId(String(id));

/** Season totals per player, keyed by player id. */
export async function totalsByPlayer(playerIds) {
  if (!playerIds.length) return new Map();
  const rows = await PlayerMatchStat.aggregate([
    { $match: { player: { $in: playerIds.map(toObjectId) } } },
    {
      $group: {
        _id: '$player',
        apps: { $sum: { $cond: [{ $gt: ['$minutes', 0] }, 1, 0] } },
        minutes: { $sum: '$minutes' },
        goals: { $sum: '$goals' },
        assists: { $sum: '$assists' },
        shots: { $sum: '$shots' },
        passes: { $sum: '$passes' },
        rating: { $avg: '$rating' },
      },
    },
  ]);
  return new Map(
    rows.map(({ _id, rating, ...rest }) => [
      String(_id),
      { ...rest, rating: rating == null ? null : Math.round(rating * 10) / 10 },
    ]),
  );
}

/**
 * Flatten a populated player for the client: name/email/avatar come from the
 * user account. Email is only included for staff.
 */
export function serializePlayer(player, { totals, includeEmail = false } = {}) {
  const obj = typeof player.toObject === 'function' ? player.toObject() : player;
  const user = obj.user && typeof obj.user === 'object' ? obj.user : {};
  const out = {
    ...obj,
    user: user._id ?? obj.user,
    name: user.name ?? 'Unknown player',
    avatar: user.avatar ?? '',
    stats: totals ?? EMPTY_TOTALS,
  };
  if (includeEmail) out.email = user.email;
  delete out.__v;
  return out;
}

export const userFields = 'name email avatar';
