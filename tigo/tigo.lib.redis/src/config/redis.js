import Redis from "ioredis";
export class RedisClient {

  constructor() {
    // Initially, there is no active connection
    this.redis = null; 
  }

  initialize() {
    if (this.redis) {
      console.warn("Redis connection already exists.");
      return; 
    }
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD
    });

    this.redis.on('error', err => {
      console.error('Redis connection error:', err.message);
    });
  }

  async checkConnection() {
    try {
      await this.redis.ping();
      return true;
    } catch (err) {
      console.error("Redis connection error:", err.message);
      return false;
    }
  }

  async close() {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }
}
