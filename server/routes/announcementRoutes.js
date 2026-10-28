import { Router } from 'express';
import { body, param } from 'express-validator';
import * as c from '../controllers/announcementController.js';
import { PRIORITIES } from '../config/constants.js';
import { requireRole, verifyToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler as h } from '../utils/asyncHandler.js';

const router = Router();
const id = param('id').isMongoId().withMessage('That announcement id is not valid.');
const staff = requireRole('admin', 'coach');

const postRules = (required) => [
  (required ? body('title') : body('title').optional()).trim().isLength({ min: 3, max: 90 }).withMessage('Headlines need 3–90 characters.'),
  (required ? body('body') : body('body').optional()).trim().isLength({ min: 3, max: 2000 }).withMessage('Messages need 3–2000 characters.'),
  body('priority').optional().isIn(PRIORITIES).withMessage('Pick a priority.'),
  body('team').optional().isMongoId(),
];

router.use(verifyToken);
router.get('/', h(c.listAnnouncements));
router.get('/ticker', h(c.ticker));
router.post('/', staff, validate(postRules(true)), h(c.createAnnouncement));
router.put('/:id', staff, validate([id, ...postRules(false)]), h(c.updateAnnouncement));
router.delete('/:id', staff, validate([id]), h(c.deleteAnnouncement));

export default router;
