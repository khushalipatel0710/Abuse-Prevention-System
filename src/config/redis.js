const redis = require('redis');
require('dotenv').config();

let redisClient = null;

const initRedis = async () => {
  try {
    redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500),
      },
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.warn('⚠ Redis connection failed, continuing without Redis:', error.message);
    return null;
  }
};

const isRedisConnected = () => {
  return redisClient && redisClient.isOpen;
};

const getRedisClient = () => {
  return redisClient;
};

module.exports = {
  initRedis,
  isRedisConnected,
  getRedisClient,
  redisClient,
};