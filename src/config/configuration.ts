export default () => ({
  port: parseInt(process.env.PORT ?? '3070', 10) || 3070,
  nodeEnv: process.env.NODE_ENV || 'development',

  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'secret',
    // Short-lived access token (Section 6.1).
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    // Refresh tokens are stored in DB (hashed); this is just the cookie/payload TTL.
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    // Legacy alias kept for backward compatibility while modules migrate.
    expiresIn: process.env.JWT_EXPIRES_IN || process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  },

  // Account lockout policy (Section 6.1 — IAM).
  auth: {
    maxFailedAttempts: parseInt(process.env.AUTH_MAX_FAILED_ATTEMPTS ?? '5', 10),
    lockoutMinutes: parseInt(process.env.AUTH_LOCKOUT_MINUTES ?? '15', 10),
    // Window over which failed attempts are counted before reset.
    failedAttemptWindowMinutes: parseInt(
      process.env.AUTH_FAILED_ATTEMPT_WINDOW_MINUTES ?? '15',
      10,
    ),
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
});
