// Read lazily so tests and tooling can import modules without a full environment.
export const env = {
  get mongoUri() { return process.env.MONGODB_URI; },
  get jwtSecret() { return process.env.JWT_SECRET; },
  get corsOrigins() { return (process.env.CORS_ORIGINS || "*").split(",").map((s) => s.trim().replace(/\/+$/, "")); },
  get port() { return Number(process.env.PORT) || 4000; },
};
