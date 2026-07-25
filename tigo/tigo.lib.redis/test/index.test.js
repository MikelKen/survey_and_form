import { expect } from "chai";
import sinon from "sinon";
import { RedisClient } from "../src/config/redis.js";
import {
  initializeRedis,
  setCall,
  getCall,
  setValue,
  getValue,
  setHashMap,
  setHashField,
  getHashMap,
  getHashField,
  closeConnection,
  deleteHashField,
  deleteKey,
  findKeys,
} from "../src/index.js";

describe("index.js public methods", () => {
  let redisMock;

  beforeEach(async () => {
    sinon.stub(RedisClient.prototype, "checkConnection").resolves(true);
    sinon.stub(RedisClient.prototype, "close").callsFake(async function () {
      if (this.redis && this.redis.quit) {
        await this.redis.quit();
        this.redis = null;
      }
    });

    const callStub = sinon.stub();
    callStub
      .withArgs("JSON.SET", "key1", "$", JSON.stringify({ a: 1 }))
      .resolves("OK");
    callStub.withArgs("JSON.GET", "key1", "$").resolves('{"a":1}');

    const setStub = sinon.stub().withArgs("key1", "val1").resolves("OK");
    const getStub = sinon.stub().withArgs("key1").resolves("val1");
    const hsetStub = sinon.stub().resolves(1);
    const hsetFieldStub = sinon
      .stub()
      .withArgs("key1", "a", "value1")
      .resolves("OK");
    const hgetallStub = sinon.stub().withArgs("key1").resolves({ a: "b" });
    const hgetStub = sinon.stub().withArgs("key1", "a").resolves("b");
    const quitStub = sinon.stub().resolves();
    const hdelStub = sinon.stub().withArgs("key1", "a").resolves(1);
    const delStub = sinon.stub().withArgs("key1").resolves(1);

    redisMock = {
      call: callStub,
      set: setStub,
      get: getStub,
      hset: hsetStub,
      hsetFields: hsetFieldStub,
      hgetall: hgetallStub,
      hget: hgetStub,
      hdel: hdelStub,
      del: delStub,
      quit: quitStub,
    };

    sinon.stub(RedisClient.prototype, "initialize").callsFake(function () {
      this.redis = redisMock;
    });

    await initializeRedis({
      host: "localhost",
      port: 6379,
      password: "password",
    });
  });

  afterEach(async () => {
    try {
      await closeConnection();
    } catch (e) {
      console.log(e);
    }
    sinon.restore();
  });

  it("should call setCall and execute Redis JSON.SET", async () => {
    await setCall("key1", { a: 1 });
    expect(
      redisMock.call.calledWith(
        "JSON.SET",
        "key1",
        "$",
        JSON.stringify({ a: 1 })
      )
    ).to.be.true;
  });

  it("should call getCall and return result", async () => {
    const result = await getCall("key1");
    expect(result).to.equal('{"a":1}');
    expect(redisMock.call.calledWith("JSON.GET", "key1", "$")).to.be.true;
  });

  it("should call setValue using Redis SET", async () => {
    await setValue("key1", "val1");
    expect(redisMock.set.calledWith("key1", "val1")).to.be.true;
  });

  it("should call getValue and return result", async () => {
    const result = await getValue("key1");
    expect(result).to.equal("val1");
    expect(redisMock.get.calledWith("key1")).to.be.true;
  });

  it("should call setHashMap using Redis HSET", async () => {
    await setHashMap("key1", { a: "b" });
    expect(redisMock.hset.called).to.be.true;
    expect(redisMock.hset.calledWith("key1", { a: "b" })).to.be.true;
  });
  it("should call setHashField and set the specific field value", async () => {
    await setHashField("key1", "a", "value1");
    expect(redisMock.hset.calledWith("key1", "a", "value1")).to.be.true;
  });

  it("should call getHashMap and return result", async () => {
    const result = await getHashMap("key1");
    expect(result).to.deep.equal({ a: "b" });
    expect(redisMock.hgetall.calledWith("key1")).to.be.true;
  });

  it("should call getHashField and return the specific field value", async () => {
    const result = await getHashField("key1", "a");
    expect(result).to.equal("b");
    expect(redisMock.hget.calledWith("key1", "a")).to.be.true;
  });

  it("should call closeConnection and call Redis quit", async () => {
    await closeConnection();
    expect(redisMock.quit.calledOnce).to.be.true;
  });

  it("should throw if Redis connection fails during initializeRedis", async () => {
    sinon.restore();
    sinon.stub(RedisClient.prototype, "checkConnection").resolves(false);
    sinon.stub(RedisClient.prototype, "initialize").callsFake(function () {
      this.redis = {};
    });

    try {
      await initializeRedis({});
      throw new Error("Should not reach here");
    } catch (err) {
      expect(err.message).to.equal(
        "Failed to connect to Redis. Please check your configuration."
      );
    }
  });

  it("should throw if RedisManager is not initialized when calling setCall", async () => {
    sinon.restore();
    const modulePath = "../src/index.js";
    const fresh = await import(modulePath + "?forceReload=" + Date.now());

    expect(() => fresh.setCall("key", {})).to.throw(
      "RedisManager is not initialized. Call initializeRedis first."
    );
  });

  it("should call deleteHashField and remove the specific field", async () => {
    await deleteHashField("key1", "a");
    expect(redisMock.hdel.calledWith("key1", "a")).to.be.true;
  });

  it("should call deleteKey and remove the key", async () => {
    await deleteKey("key1");
    expect(redisMock.del.calledWith("key1")).to.be.true;
  });
  it("should call findKeys and return matching keys", async () => {
    // Simula que Redis devuelve dos keys para el patrón dado
    redisMock.keys = sinon
      .stub()
      .withArgs("imei_order:*:*")
      .resolves([
        "imei_order:e217cfa2-05c7-4876-8dcc-6ef68e68d557:1",
        "imei_order:e217cfa2-05c7-4876-8dcc-6ef68e68d557:2",
      ]);
    // Vuelve a inyectar el mock si es necesario
    // (esto depende de cómo esté implementado tu RedisClient y setup)

    const result = await findKeys("imei_order:*:*");
    expect(redisMock.keys.calledWith("imei_order:*:*")).to.be.true;
    expect(result).to.deep.equal([
      "imei_order:e217cfa2-05c7-4876-8dcc-6ef68e68d557:1",
      "imei_order:e217cfa2-05c7-4876-8dcc-6ef68e68d557:2",
    ]);
  });
});
