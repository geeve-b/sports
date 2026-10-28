import { validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiError.js';

// Usage: router.post('/', validate([body('x').notEmpty()]), handler)
export const validate = (rules) => [
  ...rules,
  (req, _res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) return next();
    const fields = {};
    for (const err of result.array()) {
      if (err.type === 'field' && !fields[err.path]) fields[err.path] = err.msg;
    }
    next(new ApiError(422, Object.values(fields)[0] || 'Some fields need fixing.', { fields }));
  },
];
