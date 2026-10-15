import { HttpError } from "../utils/HttpError.js";

export const notFound = (_req, _res, next) => next(new HttpError(404, "Not found"));

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  const status = err.status || (err.type === "entity.parse.failed" ? 400 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? "Internal server error" : err.message });
};
