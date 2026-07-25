import { expect } from "chai";
import { logger } from '@tigo/logger'
import sinon from "sinon";
import { RedisManager } from "../src/services/redisManager.js";
import { SncConnectorException } from "../src/exceptions/connectorException.js";
import { CacheRedisService } from "../src/services/cacheRedisService.js";

describe("RedisManager", () => {
  let redisClientMock;
  let manager;

  beforeEach(() => {
    redisClientMock = {
      close: sinon.stub().resolves()
    };

    manager = new RedisManager(redisClientMock);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should create a cacheService in the constructor", () => {
    expect(manager.cacheService).to.be.instanceOf(CacheRedisService);
    expect(manager.redisClient).to.equal(redisClientMock);
  });

  it("should execute an action with cacheService and return result", async () => {
    const fakeAction = sinon.stub().resolves("success");

    const result = await manager.execute(fakeAction);

    expect(result).to.equal("success");
    expect(fakeAction.calledOnceWith(manager.cacheService)).to.be.true;
  });

  it("should throw SncConnectorException if action throws", async () => {
    const errorAction = sinon.stub().rejects(new Error("boom"));

    try {
      await manager.execute(errorAction);
      throw new Error("Should not reach this line");
    } catch (err) {
      expect(err).to.be.instanceOf(SncConnectorException);
      expect(err.message).to.equal("RedisManager Error: boom");
    }
  });

  it("should close redis connection and log", async () => {
    const logSpy = sinon.spy(logger, "info");

    await manager.closeConnection();

    expect(redisClientMock.close.calledOnce).to.be.true;
    expect(logSpy.calledWith("Redis connection closed")).to.be.true;

    logSpy.restore();
  });
});
