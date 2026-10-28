import Availability from '../models/Availability.js';
import Match from '../models/Match.js';
import Player from '../models/Player.js';
import { assertTeamAccess, isStaff, sameId } from '../utils/access.js';
import { ApiError } from '../utils/ApiError.js';
import { serializePlayer, userFields } from '../utils/players.js';

/**
 * GET /availability?match=:id
 * Staff get every squad member with their response and a summary;
 * players get only their own response.
 */
export async function forMatch(req, res) {
  const match = await Match.findById(req.query.match);
  if (!match) throw new ApiError(404, 'That match is not on the calendar.');
  assertTeamAccess(req, match.team);

  if (!isStaff(req.user)) {
    const player = await Player.findOne({ user: req.user._id });
    const mine = player ? await Availability.findOne({ player: player._id, match: match._id }).lean() : null;
    return res.json({ match: match._id, response: mine });
  }

  const [players, responses] = await Promise.all([
    Player.find({ team: match.team }).populate('user', userFields),
    Availability.find({ match: match._id }).lean(),
  ]);
  const byPlayer = new Map(responses.map((r) => [String(r.player), r]));

  const squad = players
    .map((p) => {
      const r = byPlayer.get(String(p._id));
      return {
        player: serializePlayer(p),
        available: r ? r.available : null,
        reason: r?.reason ?? '',
        respondedAt: r?.updatedAt ?? null,
      };
    })
    .sort((a, b) => (a.player.jerseyNumber ?? 100) - (b.player.jerseyNumber ?? 100));

  const summary = {
    squad: squad.length,
    available: squad.filter((s) => s.available === true).length,
    unavailable: squad.filter((s) => s.available === false).length,
    pending: squad.filter((s) => s.available === null).length,
    injured: squad.filter((s) => s.player.status === 'injured').length,
  };
  res.json({ match: match._id, summary, squad });
}

// Upcoming fixtures with the signed-in player's response for each.
export async function mine(req, res) {
  const player = await Player.findOne({ user: req.user._id });
  if (!player) throw new ApiError(403, 'Only players have availability to set.');

  const matches = await Match.find({ team: player.team, status: 'scheduled', date: { $gte: new Date() } })
    .sort({ date: 1 })
    .limit(10)
    .lean({ virtuals: false });
  const responses = await Availability.find({ player: player._id, match: { $in: matches.map((m) => m._id) } }).lean();
  const byMatch = new Map(responses.map((r) => [String(r.match), r]));
  res.json(matches.map((m) => ({ match: m, response: byMatch.get(String(m._id)) ?? null })));
}

// PUT /availability { match, available, reason, player? }
export async function respond(req, res) {
  const { match: matchId, available, reason = '' } = req.body;
  const match = await Match.findById(matchId);
  if (!match) throw new ApiError(404, 'That match is not on the calendar.');
  assertTeamAccess(req, match.team);
  if (match.status === 'ft') throw new ApiError(422, 'This match has been played. Availability is closed.');

  let player;
  if (req.body.player && isStaff(req.user)) {
    player = await Player.findById(req.body.player);
    if (!player || !sameId(player.team, match.team)) throw new ApiError(422, 'That player is not in this squad.');
  } else {
    player = await Player.findOne({ user: req.user._id });
    if (!player) throw new ApiError(403, 'Only players can respond for themselves.');
  }

  const doc = await Availability.findOneAndUpdate(
    { player: player._id, match: match._id },
    { available, reason: available ? '' : reason },
    { upsert: true, new: true, runValidators: true },
  );
  res.json(doc);
}
