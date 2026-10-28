import { Router } from 'express';
import { body } from 'express-validator';
import * as c from '../controllers/authController.js';
import { POSITIONS } from '../config/constants.js';
import { verifyToken } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler as h } from '../utils/asyncHandler.js';

const router = Router();

const email = body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail({ gmail_remove_dots: false });
const password = (field) =>
  body(field).isLength({ min: 8, max: 128 }).withMessage('Passwords need at least 8 characters.');

router.post(
  '/register',
  authLimiter,
  validate([
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Add your full name.'),
    email,
    password('password'),
    body('role').optional().isIn(['player', 'coach']).withMessage('Register as a player or a coach.'),
    body('team').optional({ values: 'falsy' }).isMongoId().withMessage('Pick a team from the list.'),
    body('position').optional({ values: 'falsy' }).isIn(POSITIONS).withMessage('Pick a position.'),
    body('jerseyNumber').optional({ values: 'falsy' }).isInt({ min: 1, max: 99 }).withMessage('Jersey numbers run 1–99.').toInt(),
  ]),
  h(c.register),
);

router.post(
  '/login',
  authLimiter,
  validate([email, body('password').notEmpty().withMessage('Enter your password.')]),
  h(c.login),
);

router.post('/logout', c.logout);
router.get('/me', verifyToken, h(c.me));

router.put(
  '/me',
  verifyToken,
  validate([
    body('name').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Names need 2–80 characters.'),
    body('email').optional().trim().isEmail().withMessage('Enter a valid email address.'),
    body('avatar').optional({ values: 'falsy' }).isURL().withMessage('Avatar must be an image URL.'),
  ]),
  h(c.updateMe),
);

router.put(
  '/password',
  verifyToken,
  validate([
    body('currentPassword').notEmpty().withMessage('Enter your current password.'),
    password('newPassword'),
  ]),
  h(c.changePassword),
);

export default router;
