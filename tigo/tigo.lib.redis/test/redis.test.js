import { expect } from "chai";
import { logger } from '@tigo/logger'
import sinon from "sinon";
import RedisMock from "ioredis-mock";
import mock from "mock-require";

mock("ioredis", RedisMock);

import { RedisClient } from "../src/config/redis.js";

describe("RedisClient", () => {
  let client;

  beforeEach(() => {
    client = new RedisClient();
  });

  afterEach(async () => {
    if (client.redis) {
      await client.close();
    }
    sinon.restore();
  });

  it("should initialize a Redis connection if none exists", () => {
    client.initialize();
    expect(client.redis).to.exist;
    expect(["ready", "connecting"]).to.include(client.redis.status);
  });

  it("should handle redis connection error", () => {
    client.initialize();
    const loggerSpy = sinon.spy(console, "error");

    const error = new Error("Simulated error");
    client.redis.emit("error", error);

    expect(loggerSpy.calledWith("Redis connection error:", "Simulated error"))
      .to.be.true;

    loggerSpy.restore();
  });

  it("should not reinitialize if Redis connection already exists", () => {
    client.initialize();
    const redisInstance = client.redis;
    client.initialize();
    expect(client.redis).to.equal(redisInstance);
  });

  it("should return true if ping succeeds", async () => {
    client.initialize();
    sinon.stub(client.redis, "ping").resolves();
    const consoleSpy = sinon.spy(console, "error");
    const result = await client.checkConnection();
    expect(result).to.be.true;
    expect(consoleSpy.notCalled).to.be.true;

    consoleSpy.restore();
  });

  it("should return false if ping fails", async () => {
    client.initialize();
    sinon.stub(client.redis, "ping").rejects(new Error("Ping failed"));
    const result = await client.checkConnection();
    expect(result).to.be.false;
  });

  it("should close redis connection and set redis to null", async () => {
    client.initialize();
    const quitSpy = sinon.spy(client.redis, "quit");
    await client.close();
    expect(quitSpy.calledOnce).to.be.true;
    expect(client.redis).to.be.null;
  });

  it("should return true if ping succeeds", async () => {
    client.initialize();
    sinon.stub(client.redis, "ping").resolves("PONG");

    const ok = await client.checkConnection();
    expect(ok).to.be.true;
  });

  it("should warn when initialize() is called twice", () => {
    const warnStub = sinon.stub(console, "warn");
    client.initialize();
    client.initialize();

    expect(warnStub.calledWith("Redis connection already exists.")).to.be.true;
  });

  it("close() does nothing if not initialized", async () => {
    client.redis = null;
    await client.close();
    expect(client.redis).to.be.null;
  });
});
