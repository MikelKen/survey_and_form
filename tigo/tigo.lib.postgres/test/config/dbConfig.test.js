import { afterEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = [
  "P_DB_USER",
  "P_DB_NAME",
  "P_DB_PORT",
  "P_DB_HOST",
  "P_DB_PASSWORD",
  "P_DB_MAX_CONNECTIONS",
  "P_DB_CONNECTION_STRING",
];

const originalEnv = { ...process.env };

const importDbConfig = async () => {
  vi.resetModules();
  return await import("../../src/config/dbConfig.js");
};

describe("dbConfig", () => {
  afterEach(() => {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
    vi.resetModules();
  });

  it("maps database environment variables", async () => {
    process.env.P_DB_USER = "postgres";
    process.env.P_DB_NAME = "customers";
    process.env.P_DB_PORT = "5432";
    process.env.P_DB_HOST = "localhost";
    process.env.P_DB_PASSWORD = "secret";
    process.env.P_DB_MAX_CONNECTIONS = "8";
    process.env.P_DB_CONNECTION_STRING = "postgres://user:pass@host/db";

    const { dbConfig } = await importDbConfig();

    expect(dbConfig).toEqual({
      user: "postgres",
      database: "customers",
      port: "5432",
      host: "localhost",
      password: "secret",
      max: 8,
      connectionString: "postgres://user:pass@host/db",
    });
  });

  it("defaults max connections to 2 and connectionString to null", async () => {
    process.env.P_DB_MAX_CONNECTIONS = "not-a-number";
    delete process.env.P_DB_CONNECTION_STRING;

    const { dbConfig } = await importDbConfig();

    expect(dbConfig.max).toBe(2);
    expect(dbConfig.connectionString).toBeNull();
  });
});
