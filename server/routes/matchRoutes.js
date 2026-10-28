import { Router } from 'express';
import { body, param, query } from 'express-validator';
import * as c from '../controllers/matchController.js';
import { EVENT_TYPES, FORMATIONS, MATCH_STATUSES } from '../config/constants.js';
import { requireRole, verifyToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler as h } from '../utils/asyncHandler.js';

const router = Router();
const id = param('id').isMongoId().withMessage('That match id is not valid.');
const staff = requireRole('admin', 'coach');

const matchRules = (required) => [
  (required ? body('opponent') : body('opponent').optional()).trim().isLength({ min: 2, max: 60 }).withMessage('Add the opponent’s name.'),
  (required ? body('date') : body('date').optional()).isISO8601().withMessage('Enter a valid kick-off date and time.').toDate(),
  body('opponentShort').optional({ values: 'falsy' }).trim().isLength({ min: 2, max: 4 }).withMessage('Short names are 2–4 letters.'),
  body('opponentColor').optional().matches(/^#[0-9a-fA-F]{6}$/).withMessage('Use a hex colour like #2B6CB0.'),
  body('venue').optional().trim().isLength({ max: 80 }),
  body('homeAway').optional().isIn(['home', 'away']).withMessage('Choose home or away.'),
  body('competition').optional().trim().isLength({ max: 60 }),
  body('status').optional().isIn(MATCH_STATUSES).withMessage('Pick a match status.'),
  body('score.for').optional({ values: 'null' }).isInt({ min: 0, max: 99 }).withMessage('Scores are whole numbers.').toInt(),
  body('score.against').optional({ values: 'null' }).isInt({ min: 0, max: 99 }).withMessage('Scores are whole numbers.').toInt(),
  body('team').optional().isMongoId(),
  body('season').optional({ values: 'null' }).isMongoId(),
];

router.use(verifyToken);

router.get(
  '/',
  validate([query('team').optional().isMongoId(), query('from').optional().isISO8601(), query('to').optional().isISO8601()]),
  h(c.listMatches),
);
router.get('/:id', validate([id]), h(c.getMatch));
router.post('/', staff, validate(matchRules(true)), h(c.createMatch));
router.put('/:id', staff, validate([id, ...matchRules(false)]), h(c.updateMatch));
router.delete('/:id', staff, validate([id]), h(c.deleteMatch));

router.put(
  '/:id/lineup',
  staff,
  validate([
    id,
    body('formation').isIn(Object.keys(FORMATIONS)).withMessage('Pick one of the listed formations.'),
    body('positions').isArray({ max: 11 }).withMessage('A lineup has at most 11 starters.'),
    body('positions.*.player').isMongoId(),
    body('positions.*.slot').isString(),
    body('bench').optional().isArray({ max: 12 }).withMessage('The bench holds at most 12 players.'),
    body('bench.*').isMongoId(),
  ]),
  h(c.saveLineup),
);

router.post(
  '/:id/events',
  staff,
  validate([
    id,
    body('type').isIn(EVENT_TYPES).withMessage('Pick an event type.'),
    body('minute').isInt({ min: 0, max: 130 }).withMessage('Minutes run 0–130.').toInt(),
    body('player').optional({ values: 'falsy' }).isMongoId(),
    body('note').optional().trim().isLength({ max: 120 }),
  ]),
  h(c.addEvent),
);
router.delete('/:id/events/:eventId', staff, validate([id, param('eventId').isMongoId()]), h(c.deleteEvent));

router.put(
  '/:id/stats',
  staff,
  validate([
    id,
    body('stats').isArray({ max: 30 }),
    body('stats.*.player').isMongoId(),
    body('stats.*.minutes').optional().isInt({ min: 0, max: 130 }).withMessage('Minutes run 0–130.').toInt(),
    body(['stats.*.goals', 'stats.*.assists', 'stats.*.shots', 'stats.*.passes']).optional().isInt({ min: 0, max: 500 }).toInt(),
    body('stats.*.rating').optional({ values: 'null' }).isFloat({ min: 0, max: 10 }).withMessage('Ratings run 0–10.').toFloat(),
  ]),
  h(c.saveStats),
);

export default router;
