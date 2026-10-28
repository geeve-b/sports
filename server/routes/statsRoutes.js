import { Router } from 'express';
import { param, query } from 'express-validator';
import * as c from '../controllers/statsController.js';
import { verifyToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler as h } from '../utils/asyncHandler.js';

const router = Router();
const id = param('id').isMongoId().withMessage('That id is not valid.');

router.use(verifyToken);
router.get('/players/:id', validate([id]), h(c.playerStats));
router.get('/team/:id', validate([id, query('season').optional().isMongoId()]), h(c.teamStats));

export default router;
