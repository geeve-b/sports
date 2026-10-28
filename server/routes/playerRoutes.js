import { Router } from 'express';
import { body, param, query } from 'express-validator';
import * as c from '../controllers/playerController.js';
import { FEET, PLAYER_STATUSES, POSITIONS } from '../config/constants.js';
import { requireRole, verifyToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler as h } from '../utils/asyncHandler.js';

const router = Router();
const id = param('id').isMongoId().withMessage('That player id is not valid.');
const staff = requireRole('admin', 'coach');

const profileRules = [
  body('jerseyNumber').optional({ values: 'falsy' }).isInt({ min: 1, max: 99 }).withMessage('Jersey numbers run 1–99.').toInt(),
  body('position').optional().isIn(POSITIONS).withMessage('Pick a position.'),
  body('status').optional().isIn(PLAYER_STATUSES).withMessage('Pick a fitness status.'),
  body('foot').optional().isIn(FEET).withMessage('Pick left, right or both.'),
  body('dob').optional({ values: 'falsy' }).isISO8601().withMessage('Enter a valid date of birth.').toDate(),
  body('height').optional({ values: 'falsy' }).isInt({ min: 120, max: 230 }).withMessage('Height is in cm, between 120 and 230.').toInt(),
];

// A factory, because .optional() mutates a chain in place.
const injuryRules = (required) => [
  (required ? body('type') : body('type').optional()).trim().isLength({ min: 2, max: 80 }).withMessage('Describe the injury.'),
  body('startDate').optional({ values: 'falsy' }).isISO8601().withMessage('Enter a valid start date.').toDate(),
  body('endDate').optional({ values: 'falsy' }).isISO8601().withMessage('Enter a valid return date.').toDate(),
  body('notes').optional().trim().isLength({ max: 500 }),
];

router.use(verifyToken);

router.get(
  '/',
  validate([
    query('team').optional().isMongoId(),
    query('position').optional().isIn(POSITIONS),
    query('status').optional().isIn(PLAYER_STATUSES),
  ]),
  h(c.listPlayers),
);
router.get('/:id', validate([id]), h(c.getPlayer));

router.post(
  '/',
  staff,
  validate([
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Add the player’s full name.'),
    body('email').trim().isEmail().withMessage('Enter a valid email address.'),
    body('password').optional({ values: 'falsy' }).isLength({ min: 8 }).withMessage('Passwords need at least 8 characters.'),
    body('team').optional().isMongoId(),
    ...profileRules,
  ]),
  h(c.createPlayer),
);
router.put(
  '/:id',
  staff,
  validate([
    id,
    body('name').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Names need 2–80 characters.'),
    body('email').optional().trim().isEmail().withMessage('Enter a valid email address.'),
    ...profileRules,
  ]),
  h(c.updatePlayer),
);
router.delete('/:id', staff, validate([id]), h(c.deletePlayer));

router.post('/:id/injuries', staff, validate([id, ...injuryRules(true)]), h(c.addInjury));
router.put(
  '/:id/injuries/:injuryId',
  staff,
  validate([id, param('injuryId').isMongoId(), ...injuryRules(false)]),
  h(c.updateInjury),
);

export default router;
