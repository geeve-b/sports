import User from '../models/User.js';
import { AUTH_COOKIE } from '../config/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyJwt } from '../utils/token.js';

export const verifyToken = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  const token = req.cookies?.[AUTH_COOKIE] || (header?.startsWith('Bearer ') ? header.slice(7) : null);
  if (!token) throw new ApiError(401, 'Sign in to continue.');

  let payload;
  try {
    payload = verifyJwt(token);
  } catch {
    throw new ApiError(401, 'Your session has ended. Sign in again.');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(401, 'This account no longer exists.');
  if (!user.approved) throw new ApiError(403, 'Your coach account is waiting for an admin to approve it.');

  req.user = user;
  next();
});

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(new ApiError(401, 'Sign in to continue.'));
  if (!roles.includes(req.user.role)) return next(new ApiError(403, 'Your role does not allow this.'));
  next();
};
