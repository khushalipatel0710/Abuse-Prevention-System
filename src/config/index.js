let dotenv;

const getConfig = () => {
  if (!dotenv) {
    dotenv = require('dotenv');
    dotenv.config();
  }

  return {
    // Server
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    apiUrl: process.env.API_URL || 'http://localhost:3000',

    // Database
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      name: process.env.DB_NAME || 'rate_limiting_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development',
    },

    // JWT
    jwt: {
      secret: process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production',
      expiresIn: process.env.JWT_EXPIRY || '24h',
    },

    // Redis
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || '',
      db: parseInt(process.env.REDIS_DB || '0', 10),
    },

    // Rate Limiting
    rateLimiting: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
      perIpMax: parseInt(process.env.RATE_LIMIT_PER_IP_MAX || '200', 10),
      perUserMax: parseInt(process.env.RATE_LIMIT_PER_USER_MAX || '100', 10),
      perEndpointMax: parseInt(process.env.RATE_LIMIT_PER_ENDPOINT_MAX || '500', 10),
    },

    // Abuse Prevention
    abusePrevention: {
      threshold: parseInt(process.env.ABUSE_THRESHOLD || '5', 10),
      blockDurationMinutes: parseInt(process.env.BLOCK_DURATION_MINUTES || '5', 10),
      progressiveBlockDurationMinutes: parseInt(process.env.PROGRESSIVE_BLOCK_DURATION_MINUTES || '15', 10),
    },

    // Logging
    logging: {
      level: process.env.LOG_LEVEL || 'debug',
      format: process.env.LOG_FORMAT || 'combined',
    },

    // Admin
    admin: {
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      password: process.env.ADMIN_PASSWORD || 'admin123',
    },

    // Whitelist
    whitelist: {
      internalIps: (process.env.WHITELIST_INTERNAL_IPS || '127.0.0.1,::1,192.168.1.0/24').split(','),
      adminIps: (process.env.WHITELIST_ADMIN_IPS || '127.0.0.1').split(','),
    },

    // Blacklist
    blacklist: {
      ips: (process.env.BLACKLIST_IPS || '').split(',').filter(Boolean),
    },
  };
};

module.exports = getConfig();
