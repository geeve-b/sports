import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AUTH_COOKIE } from '../config/constants.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const cookieOptions = () => ({
  httpOnly: true,
  secure: env.isProd,
  sameSite: env.isProd ? 'strict' : 'lax',
  path: '/',
});

export function setAuthCookie(res, user) {
  const token = jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions(), maxAge: WEEK_MS });
}

export const clearAuthCookie = (res) => res.clearCookie(AUTH_COOKIE, cookieOptions());

export const verifyJwt = (token) => jwt.verify(token, env.jwtSecret);
