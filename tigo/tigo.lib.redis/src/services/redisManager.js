
import { logger } from "@tigo/logger";
import { SncConnectorException } from "../exceptions/connectorException.js";
import { CacheRedisService } from "./cacheRedisService.js";

export class RedisManager {
  
  constructor(client) {
    this.redisClient = client;
    this.cacheService = new CacheRedisService(this.redisClient);
  }

  async execute(action) {
    try {
      return await action(this.cacheService);
    } catch (error) {
      throw new SncConnectorException(`RedisManager Error: ${error.message}`);
    }
  }

  async closeConnection() {
    await this.redisClient.close();
    logger.info("Redis connection closed");
  }
}