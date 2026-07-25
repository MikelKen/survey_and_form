import { logger } from "@tigo/logger";
export class CacheRedisService {
  constructor(redisClient) {
    this.redisClient = redisClient;
  }

  async getCall(key) {
    logger.startTimer(`REDIS getCall:${key}`);
    const result = await this.redisClient.redis.call("JSON.GET", key, "$");
    logger.info(`getCall: Key=${key}, Result=${result}`);
    logger.endTimer(`REDIS getCall:${key}`);
    return result;
  }

  async setCall(key, json, ttl) {
    logger.startTimer(`REDIS setCall:${key}`);
    await this.redisClient.redis.call(
      "JSON.SET",
      key,
      "$",
      JSON.stringify(json)
    ); // Guarda el JSON
    if (ttl > 0) {
      await this.redisClient.redis.expire(key, ttl); // Aplica el TTL solo si es mayor a 0
      logger.info(
        `setCall: Key=${key}, Value=${JSON.stringify(json)}, TTL=${ttl}`
      );
    } else {
      logger.info(`setCall: Key=${key}, Value=${JSON.stringify(json)}`);
    }
    logger.endTimer(`REDIS setCall:${key}`);
  }

  async setValue(key, value, ttl) {
    logger.startTimer(`REDIS setValue:${key}`);
    if (ttl > 0) {
      await this.redisClient.redis.set(key, value, "EX", ttl);
      logger.info(`setValue: Key=${key}, Value=${value}, TTL=${ttl}`);
      return;
    }
    await this.redisClient.redis.set(key, value);
    logger.info(`setValue: Key=${key}, Value=${value}`);
    logger.endTimer(`REDIS setValue:${key}`);
  }

  async getValue(key) {
    logger.startTimer(`REDIS getValue:${key}`);
    const value = await this.redisClient.redis.get(key);
    logger.info(`getValue: Key=${key}, Value=${value}`);
    logger.endTimer(`REDIS getValue:${key}`);
    return value;
  }

  async setHashMap(key, hashMap, ttl) {
    logger.startTimer(`REDIS setHashMap:${key}`);
    await this.redisClient.redis.hset(key, hashMap);
    logger.info(`setHashMap: Key=${key}, HashMap=${JSON.stringify(hashMap)}`);
    if (ttl > 0) {
      await this.redisClient.redis.expire(key, ttl);
      logger.info(`setHashMap: TTL=${ttl} seconds set for Key=${key}`);
    }
    logger.endTimer(`REDIS setHashMap:${key}`);
  }

  async setHashField(key, field, value) {
    logger.startTimer(`REDIS setHashField:${key}`);
    await this.redisClient.redis.hset(key, field, value);
    logger.info(`setHashField: Key=${key}, Field=${field}, Value=${value}`);
    logger.endTimer(`REDIS setHashField:${key}`);
  }

  async getHashMap(key) {
    logger.startTimer(`REDIS getHashMap:${key}`);
    const map = await this.redisClient.redis.hgetall(key);
    logger.info(`getHashMap: Key=${key}, HashMap=${JSON.stringify(map)}`);
    logger.endTimer(`REDIS getHashMap:${key}`);
    return map;
  }

  async getHashField(key, field) {
    logger.startTimer(`REDIS getHashField:${key}`);
    const value = await this.redisClient.redis.hget(key, field);
    logger.info(`getHashField: Key=${key}, Field=${field}, Value=${value}`);
    logger.endTimer(`REDIS getHashField:${key}`);
    return value;
  }

  async deleteHashField(key, field) {
    logger.startTimer(`REDIS deleteHashField:${key}`);
    await this.redisClient.redis.hdel(key, field);
    logger.info(`deleteHashField: Key=${key}, Field=${field}`);
    logger.endTimer(`REDIS deleteHashField:${key}`);
  }

  async deleteKey(key) {
    logger.startTimer(`REDIS deleteKey:${key}`);
    await this.redisClient.redis.del(key);
    logger.info(`deleteKey: Key=${key}`);
    logger.endTimer(`REDIS deleteKey:${key}`);
  }

  async findKeys(pattern) {
    logger.startTimer(`REDIS findKeys:${pattern}`);
    const value = this.redisClient.redis.keys(pattern);
    logger.info(`findKeys: Key=${pattern}, Value=${value}`);
    logger.endTimer(`REDIS findKeys:${pattern}`);
    return value;
  }

  async scanKeys(pattern) {
    logger.startTimer(`REDIS scanKeys:${pattern}`);

    return new Promise((resolve, reject) => {
      const stream = this.redisClient.redis.scanStream({
        match: pattern,
        count: 100
      });

      const keys = [];

      stream.on('data', (resultKeys) => {
        keys.push(...resultKeys);
      });

      stream.on('end', () => {
        logger.info(`scanKeys: completo => ${JSON.stringify(keys)}`);
        logger.endTimer(`REDIS scanKeys:${pattern}`);
        resolve(keys);
      });

      stream.on('error', (err) => {
        logger.error(`scanKeys: error => ${err.message}`);
        logger.endTimer(`REDIS scanKeys:${pattern}`);
        reject(err);
      });
    });
  }
}
