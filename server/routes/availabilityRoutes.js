import { Router } from 'express';
import { body, query } from 'express-validator';
import * as c from '../controllers/availabilityController.js';
import { requireRole, verifyToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler as h } from '../utils/asyncHandler.js';

const router = Router();

router.use(verifyToken);
router.get('/', validate([query('match').isMongoId().withMessage('Pick a match.')]), h(c.forMatch));
router.get('/mine', requireRole('player'), h(c.mine));
router.put(
  '/',
  validate([
    body('match').isMongoId().withMessage('Pick a match.'),
    body('available').isBoolean().withMessage('Say whether you can play.').toBoolean(),
    body('reason').optional().trim().isLength({ max: 160 }).withMessage('Keep the reason under 160 characters.'),
    body('player').optional().isMongoId(),
  ]),
  h(c.respond),
);

export default router;
