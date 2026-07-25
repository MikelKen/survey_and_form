import { RedisClient } from "./config/redis.js";
import { RedisManager } from "./services/redisManager.js";

let redisManager = null;

export const initializeRedis = async (config) => {
  const redisClient = new RedisClient();
  redisClient.initialize(config);

  const isConnected = await redisClient.checkConnection();
  if (!isConnected) {
    throw new Error(
      "Failed to connect to Redis. Please check your configuration."
    );
  }

  redisManager = new RedisManager(redisClient);
  console.log("RedisManager initialized successfully.");
};

const ensureInitialized = () => {
  if (!redisManager) {
    throw new Error(
      "RedisManager is not initialized. Call initializeRedis first."
    );
  }
};

export const setCall = (key, json, ttl = 0) => {
  ensureInitialized();
  return redisManager.execute((svc) => svc.setCall(key, json, ttl));
};

export const getCall = (key) => {
  ensureInitialized();
  return redisManager.execute((svc) => svc.getCall(key));
};

export const setValue = (key, value, ttl = 0) => {
  ensureInitialized();
  return redisManager.execute((svc) => svc.setValue(key, value, ttl));
};

export const getValue = (key) => {
  ensureInitialized();
  return redisManager.execute((svc) => svc.getValue(key));
};

export const setHashMap = (key, map, ttl = 0) => {
  ensureInitialized();
  return redisManager.execute((svc) => svc.setHashMap(key, map, ttl));
};

export const setHashField = (key, field, value) => {
  ensureInitialized();
  return redisManager.execute((svc) => svc.setHashField(key, field, value));
};

export const getHashMap = (key) => {
  ensureInitialized();
  return redisManager.execute((svc) => svc.getHashMap(key));
};

export const getHashField = (key, field) => {
  ensureInitialized();
  return redisManager.execute((svc) => svc.getHashField(key, field));
};

export const deleteHashField = (key, field) => {
  ensureInitialized();
  return redisManager.execute((svc) => svc.deleteHashField(key, field));
};

export const deleteKey = (key) => {
  ensureInitialized();
  return redisManager.execute((svc) => svc.deleteKey(key));
};

export const closeConnection = () => {
  ensureInitialized();
  return redisManager.closeConnection();
};

export const findKeys = (key) => {
  ensureInitialized();
  return redisManager.execute((svc) => svc.findKeys(key));
};

export const scanKeys = (key) => {
  ensureInitialized();
  return redisManager.execute((svc) => svc.scanKeys(key));
};
