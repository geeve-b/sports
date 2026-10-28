import Announcement from '../models/Announcement.js';
import Match from '../models/Match.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';
import { assertTeamAccess, resolveTeamId } from '../utils/access.js';
import { ApiError } from '../utils/ApiError.js';

async function loadAnnouncement(req) {
  const post = await Announcement.findById(req.params.id);
  if (!post) throw new ApiError(404, 'That announcement has been removed.');
  assertTeamAccess(req, post.team);
  return post;
}

export async function listAnnouncements(req, res) {
  const team = resolveTeamId(req, req.query.team);
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const posts = await Announcement.find({ team }).sort({ createdAt: -1 }).limit(limit).populate('author', 'name role avatar').lean();
  res.json(posts);
}

export async function createAnnouncement(req, res) {
  const team = resolveTeamId(req, req.body.team);
  const { title, body, priority } = req.body;
  const post = await Announcement.create({ team, author: req.user._id, title, body, priority });
  await post.populate('author', 'name role avatar');
  res.status(201).json(post);
}

export async function updateAnnouncement(req, res) {
  const post = await loadAnnouncement(req);
  for (const key of ['title', 'body', 'priority']) if (req.body[key] !== undefined) post.set(key, req.body[key]);
  await post.save();
  await post.populate('author', 'name role avatar');
  res.json(post);
}

export async function deleteAnnouncement(req, res) {
  const post = await loadAnnouncement(req);
  await post.deleteOne();
  res.json({ message: 'Announcement removed.' });
}

const fmtDay = (d) =>
  new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase();
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** Items for the live ticker: recent results, next fixtures, injuries, latest posts. */
export async function ticker(req, res) {
  const team = resolveTeamId(req, req.query.team);
  const [teamDoc, results, fixtures, posts, injured] = await Promise.all([
    Team.findById(team).select('name').lean(),
    Match.find({ team, status: { $in: ['ft', 'live', 'ht'] } }).sort({ date: -1 }).limit(3).lean(),
    Match.find({ team, status: 'scheduled', date: { $gte: new Date() } }).sort({ date: 1 }).limit(2).lean(),
    Announcement.find({ team }).sort({ createdAt: -1 }).limit(4).lean(),
    Player.find({ team, status: 'injured' }).populate('user', 'name').limit(3).lean(),
  ]);

  const us = teamDoc?.name ?? 'Us';
  const items = [];
  for (const m of fixtures) {
    items.push({ kind: 'fixture', label: 'Next', text: `${m.opponent} (${m.homeAway === 'home' ? 'H' : 'A'})`, meta: `${fmtDay(m.date)} ${fmtTime(m.date)}`, href: `/fixtures/${m._id}` });
  }
  for (const m of results) {
    const live = m.status !== 'ft';
    items.push({
      kind: live ? 'live' : 'result',
      label: live ? 'Live' : 'FT',
      text: m.homeAway === 'home' ? `${us} ${m.score.for}–${m.score.against} ${m.opponent}` : `${m.opponent} ${m.score.against}–${m.score.for} ${us}`,
      href: `/fixtures/${m._id}`,
    });
  }
  for (const p of posts) {
    items.push({ kind: p.priority === 'urgent' ? 'alert' : 'post', label: p.priority === 'urgent' ? 'Urgent' : 'Notice', text: p.title, href: '/announcements' });
  }
  for (const p of injured) {
    const open = p.injuries?.find((i) => !i.endDate || new Date(i.endDate) > new Date());
    items.push({ kind: 'injury', label: 'Injury', text: `${p.user?.name ?? 'Player'}${open ? `, ${open.type.toLowerCase()}` : ''}`, href: `/squad/${p._id}` });
  }
  res.json(items);
}
