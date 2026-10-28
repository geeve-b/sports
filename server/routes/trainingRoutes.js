import { Router } from 'express';
import { body, param, query } from 'express-validator';
import * as c from '../controllers/trainingController.js';
import { requireRole, verifyToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler as h } from '../utils/asyncHandler.js';

const router = Router();
const id = param('id').isMongoId().withMessage('That session id is not valid.');
const staff = requireRole('admin', 'coach');

const sessionRules = (required) => [
  (required ? body('date') : body('date').optional()).isISO8601().withMessage('Enter a valid date and start time.').toDate(),
  (required ? body('focus') : body('focus').optional()).trim().isLength({ min: 2, max: 60 }).withMessage('Add a focus for the session.'),
  body('duration').optional().isInt({ min: 15, max: 300 }).withMessage('Sessions run 15–300 minutes.').toInt(),
  body('location').optional().trim().isLength({ max: 60 }),
  body('drills').optional().isArray({ max: 12 }),
  body('drills.*').optional().trim().isLength({ max: 80 }),
  body('team').optional().isMongoId(),
];

router.use(verifyToken);
router.get('/', validate([query('from').optional().isISO8601(), query('to').optional().isISO8601()]), h(c.listSessions));
router.post('/', staff, validate(sessionRules(true)), h(c.createSession));
router.put('/:id', staff, validate([id, ...sessionRules(false)]), h(c.updateSession));
router.delete('/:id', staff, validate([id]), h(c.deleteSession));
router.put(
  '/:id/attendance',
  staff,
  validate([id, body('attendance').isArray(), body('attendance.*.player').isMongoId(), body('attendance.*.present').isBoolean().toBoolean()]),
  h(c.setAttendance),
);
router.post('/:id/attendance/check-in', requireRole('player'), validate([id]), h(c.checkIn));

export default router;
