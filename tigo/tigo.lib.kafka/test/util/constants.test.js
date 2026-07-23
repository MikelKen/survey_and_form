import { afterEach, describe, expect, it, vi } from "vitest";

const CONSTANTS_MODULE_PATH = "../../../src/util/constants.js";
const ORIGINAL_KAFKA_HOST = process.env.KAFKA_HOST;
const ORIGINAL_KAFKA_PORT = process.env.KAFKA_PORT;
const ORIGINAL_KAFKA_RETRIES = process.env.KAFKA_RETRIES;
const ORIGINAL_KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID;
const ORIGINAL_KAFKA_GROUP_ID = process.env.KAFKA_GROUP_ID;
const ORIGINAL_KAFKA_ACKS = process.env.KAFKA_ACKS;

describe("util/constants", () => {
  afterEach(() => {
    vi.resetModules();

    if (ORIGINAL_KAFKA_HOST === undefined) {
      delete process.env.KAFKA_HOST;
    } else {
      process.env.KAFKA_HOST = ORIGINAL_KAFKA_HOST;
    }

    if (ORIGINAL_KAFKA_PORT === undefined) {
      delete process.env.KAFKA_PORT;
    } else {
      process.env.KAFKA_PORT = ORIGINAL_KAFKA_PORT;
    }

    if (ORIGINAL_KAFKA_RETRIES === undefined) {
      delete process.env.KAFKA_RETRIES;
    } else {
      process.env.KAFKA_RETRIES = ORIGINAL_KAFKA_RETRIES;
    }

    if (ORIGINAL_KAFKA_CLIENT_ID === undefined) {
      delete process.env.KAFKA_CLIENT_ID;
    } else {
      process.env.KAFKA_CLIENT_ID = ORIGINAL_KAFKA_CLIENT_ID;
    }

    if (ORIGINAL_KAFKA_GROUP_ID === undefined) {
      delete process.env.KAFKA_GROUP_ID;
    } else {
      process.env.KAFKA_GROUP_ID = ORIGINAL_KAFKA_GROUP_ID;
    }

    if (ORIGINAL_KAFKA_ACKS === undefined) {
      delete process.env.KAFKA_ACKS;
    } else {
      process.env.KAFKA_ACKS = ORIGINAL_KAFKA_ACKS;
    }
  });

  it("returns default values when env vars are missing", async () => {
    delete process.env.KAFKA_HOST;
    delete process.env.KAFKA_PORT;
    delete process.env.KAFKA_RETRIES;
    delete process.env.KAFKA_CLIENT_ID;
    delete process.env.KAFKA_GROUP_ID;
    delete process.env.KAFKA_ACKS;

    vi.resetModules();
    const constants = await import(CONSTANTS_MODULE_PATH);

    expect(constants.KAFKA_CONFIGS).toEqual({
      HOST: undefined,
      PORT: "9092",
      RETRIES: 3,
      CLIENT_ID: "my-app",
      GROUP_ID: "test-group",
      ACKS: -1,
    });
  });

  it("reads constants from environment variables", async () => {
    process.env.KAFKA_HOST = "localhost";
    process.env.KAFKA_PORT = "1234";
    process.env.KAFKA_RETRIES = "5";
    process.env.KAFKA_CLIENT_ID = "my-app";
    process.env.KAFKA_GROUP_ID = "test-group";
    process.env.KAFKA_ACKS = "1";

    vi.resetModules();

    const constants = await import(CONSTANTS_MODULE_PATH);

    expect(constants.KAFKA_CONFIGS).toEqual({
      HOST: "localhost",
      PORT: "1234",
      RETRIES: 5,
      CLIENT_ID: "my-app",
      GROUP_ID: "test-group",
      ACKS: 1,
    });
  });
});
