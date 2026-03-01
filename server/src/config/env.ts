export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'starforge',
    user: process.env.DB_USER || 'starforge',
    password: process.env.DB_PASSWORD || 'starforge_dev',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'starforge-dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },

  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100,
  },

  // OAuth providers
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/oauth/google/callback',
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID || '',
      teamId: process.env.APPLE_TEAM_ID || '',
      keyId: process.env.APPLE_KEY_ID || '',
      callbackUrl: process.env.APPLE_CALLBACK_URL || 'http://localhost:3001/api/auth/oauth/apple/callback',
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID || '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
      callbackUrl: process.env.DISCORD_CALLBACK_URL || 'http://localhost:3001/api/auth/oauth/discord/callback',
    },
  },

  // Payment providers
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    publicKey: process.env.STRIPE_PUBLIC_KEY || '',
  },

  // Error tracking
  sentry: {
    dsn: process.env.SENTRY_DSN || '',
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
  },

  // Feature flags / A/B testing
  abTesting: {
    enabled: process.env.AB_TESTING_ENABLED === 'true',
    seed: process.env.AB_TESTING_SEED || 'starforge-ab-v1',
  },

  // Redis (for caching, sessions, pub/sub)
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
};
