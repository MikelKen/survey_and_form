import { expect } from "chai";
import { CacheRedisService } from "../src/services/cacheRedisService.js";
import sinon from "sinon";

describe("CacheRedisService", () => {
  let redisService;
  let mockRedisClient;

  beforeEach(() => {
    mockRedisClient = {
      redis: {
        call: sinon.stub(),
        expire: sinon.stub().resolves(),
        set: sinon.stub().resolves(),
        get: sinon.stub(),
        hset: sinon.stub().resolves(),
        hgetall: sinon.stub(),
        hget: sinon.stub(),
        del: sinon.stub().resolves(),
      },
    };
    redisService = new CacheRedisService(mockRedisClient);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("getCall should call redis.call with JSON.GET", async () => {
    mockRedisClient.redis.call.resolves('{"field1":"value1"}');
    const result = await redisService.getCall("testKey");
    expect(mockRedisClient.redis.call.calledWith("JSON.GET", "testKey", "$")).to
      .be.true;
    expect(result).to.equal('{"field1":"value1"}');
  });

  it("setCall without TTL should call JSON.SET, without expire", async () => {
    await redisService.setCall("testKey", { field1: "value1" });
    expect(
      mockRedisClient.redis.call.calledWith(
        "JSON.SET",
        "testKey",
        "$",
        '{"field1":"value1"}'
      )
    ).to.be.true;
    expect(mockRedisClient.redis.expire.notCalled).to.be.true;
  });

  it("setValue without TTL should call redis.set(key, value)", async () => {
    await redisService.setValue("testKey", "testValue");
    expect(mockRedisClient.redis.set.calledWith("testKey", "testValue")).to.be
      .true;
  });

  it("getValue should call redis.get", async () => {
    mockRedisClient.redis.get.resolves("testValue");
    const result = await redisService.getValue("testKey");
    expect(mockRedisClient.redis.get.calledWith("testKey")).to.be.true;
    expect(result).to.equal("testValue");
  });

  it("setHashMap without TTL should call hset(key, hashMap)", async () => {
    await redisService.setHashMap("testKey", { field1: "value1" });
    expect(
      mockRedisClient.redis.hset.calledWith("testKey", { field1: "value1" })
    ).to.be.true;
  });

  it("getHashMap should call redis.hgetall", async () => {
    mockRedisClient.redis.hgetall.resolves({ field1: "value1" });
    const result = await redisService.getHashMap("testKey");
    expect(mockRedisClient.redis.hgetall.calledWith("testKey")).to.be.true;
    expect(result).to.deep.equal({ field1: "value1" });
  });

  it("setCall with TTL should call JSON.SET and then expire.", async () => {
    mockRedisClient.redis.call.resolves();
    await redisService.setCall("testKey", { foo: "bar" }, 120);
    expect(
      mockRedisClient.redis.call.calledWith(
        "JSON.SET",
        "testKey",
        "$",
        '{"foo":"bar"}'
      )
    ).to.be.true;
    expect(mockRedisClient.redis.expire.calledWith("testKey", 120)).to.be.true;
  });

  it("setValue with TTL should use EX and not expire separate", async () => {
    await redisService.setValue("testKey", "val", 45);
    expect(mockRedisClient.redis.set.calledWith("testKey", "val", "EX", 45)).to
      .be.true;
  });

  it("setHashMap with TTL should call hset and then call expire", async () => {
    await redisService.setHashMap("testKey", { a: 1 }, 30);
    expect(mockRedisClient.redis.hset.calledWith("testKey", { a: 1 })).to.be
      .true;
    expect(mockRedisClient.redis.expire.calledWith("testKey", 30)).to.be.true;
  });

  it("getHashField should call redis.hget y devolver el valor", async () => {
    mockRedisClient.redis.hget.resolves("someValue");
    const result = await redisService.getHashField("testKey", "field1");
    expect(mockRedisClient.redis.hget.calledWith("testKey", "field1")).to.be
      .true;
    expect(result).to.equal("someValue");
  });

  it("deleteHashField should call redis.hdel with correct key and field", async () => {
    mockRedisClient.redis.hdel = sinon.stub().resolves(); // asegúrate que esté mockeado
    await redisService.deleteHashField("testKey", "field1");
    expect(mockRedisClient.redis.hdel.calledWith("testKey", "field1")).to.be
      .true;
  });

  it("deleteKey should call redis.del with correct key", async () => {
    await redisService.deleteKey("testKey");
    expect(mockRedisClient.redis.del.calledWith("testKey")).to.be.true;
  });
});
