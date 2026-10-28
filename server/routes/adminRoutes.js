import { Router } from 'express';
import { body, param, query } from 'express-validator';
import * as c from '../controllers/adminController.js';
import { ROLES } from '../config/constants.js';
import { requireRole, verifyToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler as h } from '../utils/asyncHandler.js';

const router = Router();
const id = param('id').isMongoId().withMessage('That id is not valid.');

const seasonRules = (required) => [
  (required ? body('name') : body('name').optional()).trim().isLength({ min: 4, max: 20 }).withMessage('Name the season, e.g. 2026/27.'),
  (required ? body('startDate') : body('startDate').optional()).isISO8601().withMessage('Enter a valid start date.').toDate(),
  (required ? body('endDate') : body('endDate').optional()).isISO8601().withMessage('Enter a valid end date.').toDate(),
  body('current').optional().isBoolean().toBoolean(),
];

router.use(verifyToken, requireRole('admin'));

router.get('/overview', h(c.overview));
router.get(
  '/users',
  validate([query('role').optional({ values: 'falsy' }).isIn(ROLES), query('approved').optional({ values: 'falsy' }).isIn(['true', 'false'])]),
  h(c.listUsers),
);
router.patch(
  '/users/:id',
  validate([
    id,
    body('role').optional().isIn(ROLES).withMessage('Pick a role.'),
    body('approved').optional().isBoolean().toBoolean(),
    body('team').optional({ values: 'null' }).custom((v) => v === '' || /^[a-f\d]{24}$/i.test(v)).withMessage('Pick a team.'),
  ]),
  h(c.updateUser),
);
router.delete('/users/:id', validate([id]), h(c.deleteUser));

router.get('/seasons', h(c.listSeasons));
router.post('/seasons', validate(seasonRules(true)), h(c.createSeason));
router.put('/seasons/:id', validate([id, ...seasonRules(false)]), h(c.updateSeason));
router.delete('/seasons/:id', validate([id]), h(c.deleteSeason));

export default router;
