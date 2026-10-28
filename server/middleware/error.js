import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export const notFound = (req, _res, next) =>
  next(new ApiError(404, `No route for ${req.method} ${req.originalUrl}.`));

const FIELD_LABELS = { email: 'email address', jerseyNumber: 'jersey number', name: 'name', shortName: 'short name' };

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Something went wrong on our side.';
  let details = err.details;

  if (err instanceof mongoose.Error.ValidationError) {
    status = 422;
    const fields = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    details = { fields };
    message = Object.values(fields)[0];
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `That ${err.path === '_id' ? 'id' : err.path} is not valid.`;
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || err.keyValue || {}).filter((k) => k !== 'team')[0] || 'value';
    message = `That ${FIELD_LABELS[field] || field} is already taken.`;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'The request body is not valid JSON.';
  } else if (!(err instanceof ApiError) && status === 500) {
    console.error(err);
    if (env.isProd) message = 'Something went wrong on our side.';
  }

  res.status(status).json({ message, ...(details ? { details } : {}) });
}
