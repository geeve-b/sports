import mongoose from 'mongoose';
import Match from '../models/Match.js';
import Player from '../models/Player.js';
import PlayerMatchStat from '../models/PlayerMatchStat.js';
import TrainingSession from '../models/TrainingSession.js';
import { assertTeamAccess, isStaff } from '../utils/access.js';
import { ApiError } from '../utils/ApiError.js';
import { serializePlayer, totalsByPlayer, userFields } from '../utils/players.js';

const oid = (id) => new mongoose.Types.ObjectId(String(id));

// W/D/L from the score, as an aggregation expression.
const RESULT_EXPR = {
  $switch: {
    branches: [
      { case: { $gt: ['$score.for', '$score.against'] }, then: 'W' },
      { case: { $lt: ['$score.for', '$score.against'] }, then: 'L' },
    ],
    default: 'D',
  },
};

/** Leaderboards from PlayerMatchStat, joined to player and user. */
function leaderboard(teamId, sortBy, { limit = 5, minApps = 1 } = {}) {
  return PlayerMatchStat.aggregate([
    { $match: { team: oid(teamId) } },
    {
      $group: {
        _id: '$player',
        apps: { $sum: { $cond: [{ $gt: ['$minutes', 0] }, 1, 0] } },
        minutes: { $sum: '$minutes' },
        goals: { $sum: '$goals' },
        assists: { $sum: '$assists' },
        shots: { $sum: '$shots' },
        rating: { $avg: '$rating' },
      },
    },
    { $match: { apps: { $gte: minApps } } },
    { $addFields: { contributions: { $add: ['$goals', '$assists'] }, rating: { $round: ['$rating', 2] } } },
    { $sort: { [sortBy]: -1, minutes: 1 } },
    { $limit: limit },
    { $lookup: { from: 'players', localField: '_id', foreignField: '_id', as: 'player' } },
    { $unwind: '$player' },
    { $lookup: { from: 'users', localField: 'player.user', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    {
      $project: {
        _id: 0,
        playerId: '$_id',
        name: '$user.name',
        jerseyNumber: '$player.jerseyNumber',
        position: '$player.position',
        apps: 1,
        minutes: 1,
        goals: 1,
        assists: 1,
        shots: 1,
        rating: 1,
        contributions: 1,
      },
    },
  ]);
}

export async function teamStats(req, res) {
  const teamId = req.params.id;
  assertTeamAccess(req, teamId);
  const match = { team: oid(teamId), status: 'ft', 'score.for': { $ne: null }, 'score.against': { $ne: null } };
  if (req.query.season) match.season = oid(req.query.season);

  const [agg] = await Match.aggregate([
    { $match: match },
    { $addFields: { result: RESULT_EXPR } },
    { $addFields: { points: { $switch: { branches: [{ case: { $eq: ['$result', 'W'] }, then: 3 }, { case: { $eq: ['$result', 'D'] }, then: 1 }], default: 0 } } } },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              played: { $sum: 1 },
              wins: { $sum: { $cond: [{ $eq: ['$result', 'W'] }, 1, 0] } },
              draws: { $sum: { $cond: [{ $eq: ['$result', 'D'] }, 1, 0] } },
              losses: { $sum: { $cond: [{ $eq: ['$result', 'L'] }, 1, 0] } },
              goalsFor: { $sum: '$score.for' },
              goalsAgainst: { $sum: '$score.against' },
              points: { $sum: '$points' },
              cleanSheets: { $sum: { $cond: [{ $eq: ['$score.against', 0] }, 1, 0] } },
            },
          },
          {
            $addFields: {
              winRate: { $round: [{ $multiply: [{ $divide: ['$wins', '$played'] }, 100] }, 1] },
              goalDifference: { $subtract: ['$goalsFor', '$goalsAgainst'] },
            },
          },
          { $project: { _id: 0 } },
        ],
        form: [
          { $sort: { date: -1 } },
          { $limit: 5 },
          { $project: { result: 1, opponent: 1, opponentShort: 1, date: 1, score: 1, homeAway: 1 } },
        ],
        // Running points total and goals per match, oldest first.
        trend: [
          {
            $setWindowFields: {
              sortBy: { date: 1 },
              output: {
                cumulativePoints: { $sum: '$points', window: { documents: ['unbounded', 'current'] } },
                rollingGoals: { $avg: '$score.for', window: { documents: [-2, 'current'] } },
              },
            },
          },
          {
            $project: {
              date: 1,
              opponent: 1,
              opponentShort: 1,
              result: 1,
              points: 1,
              cumulativePoints: 1,
              rollingGoals: { $round: ['$rollingGoals', 2] },
              goalsFor: '$score.for',
              goalsAgainst: '$score.against',
            },
          },
        ],
      },
    },
  ]);

  const [topScorers, topAssists, topRated] = await Promise.all([
    leaderboard(teamId, 'goals'),
    leaderboard(teamId, 'assists'),
    leaderboard(teamId, 'rating', { minApps: 2 }),
  ]);

  const summary = agg.summary[0] ?? {
    played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0, cleanSheets: 0, winRate: 0, goalDifference: 0,
  };

  res.json({
    summary,
    form: agg.form.reverse(), // oldest → newest, reads left to right
    trend: agg.trend,
    topScorers: topScorers.filter((p) => p.goals > 0),
    topAssists: topAssists.filter((p) => p.assists > 0),
    topRated,
  });
}

export async function playerStats(req, res) {
  const player = await Player.findById(req.params.id).populate('user', userFields);
  if (!player) throw new ApiError(404, 'That player is not in the squad.');
  assertTeamAccess(req, player.team);

  const [history, teamTotals, sessions] = await Promise.all([
    PlayerMatchStat.find({ player: player._id })
      .populate('match', 'opponent opponentShort date homeAway competition score status')
      .lean(),
    PlayerMatchStat.aggregate([
      { $match: { team: player.team } },
      {
        $group: {
          _id: '$player',
          minutes: { $sum: '$minutes' },
          goals: { $sum: '$goals' },
          assists: { $sum: '$assists' },
          shots: { $sum: '$shots' },
          passes: { $sum: '$passes' },
          rating: { $avg: '$rating' },
        },
      },
    ]),
    TrainingSession.find({ team: player.team, date: { $lte: new Date() } }).select('date attendance').lean(),
  ]);

  // Radar: per-90 rates, scaled 0–100 against the best in the squad (min 90 minutes played).
  const per90 = (row, key) => (row.minutes >= 90 ? (row[key] / row.minutes) * 90 : 0);
  const metrics = [
    { key: 'goals', label: 'Goals', value: (r) => per90(r, 'goals') },
    { key: 'assists', label: 'Assists', value: (r) => per90(r, 'assists') },
    { key: 'shots', label: 'Shots', value: (r) => per90(r, 'shots') },
    { key: 'passes', label: 'Passing', value: (r) => per90(r, 'passes') },
    { key: 'rating', label: 'Rating', value: (r) => r.rating ?? 0 },
    { key: 'minutes', label: 'Minutes', value: (r) => r.minutes },
  ];
  const mine = teamTotals.find((r) => String(r._id) === String(player._id)) ?? { minutes: 0 };
  const radar = metrics.map((m) => {
    const best = Math.max(0, ...teamTotals.map(m.value));
    const value = m.value(mine);
    return { metric: m.label, value: best > 0 ? Math.round((value / best) * 100) : 0, raw: Math.round(value * 100) / 100 };
  });

  const attended = sessions.filter((s) => s.attendance.some((a) => String(a.player) === String(player._id) && a.present)).length;
  const recorded = sessions.filter((s) => s.attendance.length > 0).length;

  const matches = history
    .filter((h) => h.match)
    .sort((a, b) => new Date(b.match.date) - new Date(a.match.date))
    .map((h) => {
      const { for: f, against: a } = h.match.score ?? {};
      const result = h.match.status === 'ft' && f != null ? (f > a ? 'W' : f < a ? 'L' : 'D') : null;
      return { ...h, match: { ...h.match, result } };
    });

  const totals = (await totalsByPlayer([player._id])).get(String(player._id));
  res.json({
    player: serializePlayer(player, {
      totals,
      includeEmail: isStaff(req.user) || String(player.user._id) === String(req.user._id),
    }),
    radar,
    matches,
    attendance: { attended, sessions: recorded, rate: recorded ? Math.round((attended / recorded) * 100) : null },
    injuries: [...player.injuries].sort((a, b) => b.startDate - a.startDate),
  });
}
