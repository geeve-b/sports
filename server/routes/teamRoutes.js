import { Router } from 'express';
import { body, param } from 'express-validator';
import * as c from '../controllers/teamController.js';
import { requireRole, verifyToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler as h } from '../utils/asyncHandler.js';

const router = Router();
const id = param('id').isMongoId().withMessage('That team id is not valid.');
const hex = (f) => body(f).optional().matches(/^#[0-9a-fA-F]{6}$/).withMessage('Use a hex colour like #E8FF3A.');

const teamRules = (required) => [
  (required ? body('name') : body('name').optional()).trim().isLength({ min: 2, max: 60 }).withMessage('Team names need 2–60 characters.'),
  (required ? body('shortName') : body('shortName').optional()).trim().isLength({ min: 2, max: 4 }).withMessage('Short names are 2–4 letters.'),
  body('crestUrl').optional({ values: 'falsy' }).isURL().withMessage('Crest must be an image URL.'),
  hex('colors.primary'),
  hex('colors.secondary'),
  body('season').optional({ values: 'null' }).isMongoId().withMessage('Pick a season from the list.'),
  body('coaches').optional().isArray(),
  body('coaches.*').optional().isMongoId(),
];

router.get('/public', h(c.listPublicTeams));
router.use(verifyToken);
router.get('/', h(c.listTeams));
router.get('/:id', validate([id]), h(c.getTeam));
router.post('/', requireRole('admin'), validate(teamRules(true)), h(c.createTeam));
router.put('/:id', requireRole('admin', 'coach'), validate([id, ...teamRules(false)]), h(c.updateTeam));
router.delete('/:id', requireRole('admin'), validate([id]), h(c.deleteTeam));

export default router;
