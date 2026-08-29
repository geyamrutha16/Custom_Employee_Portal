import { ApiError } from './errorHandler.js';

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return next(new ApiError(400, 'Invalid request data', result.error.flatten().fieldErrors));
  }
  req.body = result.data;
  next();
};
