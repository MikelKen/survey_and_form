import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pgMock = vi.hoisted(() => ({
  Pool: vi.fn(),
}));

const loggerMock = vi.hoisted(() => ({
  logger: {
    startTimer: vi.fn(),
    endTimer: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("pg", () => ({
  default: {
    Pool: pgMock.Pool,
  },
}));

vi.mock("@tigo/logger", () => loggerMock);

import { logger } from "@tigo/logger";
import pkg from "pg";
import { DbConnectorException } from "../../src/exceptions/connectorException.js";
import { PostgresConnector } from "../../src/lib/postgresConnector.js";

const { Pool } = pkg;

describe("PostgresConnector", () => {
  let connector;

  beforeEach(() => {
    connector = new PostgresConnector({ host: "localhost", max: 2 });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initPool", () => {
    it("creates a pool with the configured connection string and releases the test client", async () => {
      const client = { release: vi.fn() };
      const pool = { connect: vi.fn().mockResolvedValue(client) };
      const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
      Pool.mockImplementation(
        class {
          constructor() {
            return pool;
          }
        }
      );

      connector = new PostgresConnector({
        connectionString: "postgres://user:pass@host/db",
        max: 5,
      });

      await connector.initPool();

      expect(Pool).toHaveBeenCalledWith({
        connectionString: "postgres://user:pass@host/db",
        max: 5,
      });
      expect(connector.pool).toBe(pool);
      expect(pool.connect).toHaveBeenCalledTimes(1);
      expect(client.release).toHaveBeenCalledTimes(1);
      expect(consoleLog).toHaveBeenCalledWith(
        "[Postgres] connection pool initialized successfully"
      );
    });

    it("creates a pool with the provided config when no connection string exists", async () => {
      const client = { release: vi.fn() };
      const pool = { connect: vi.fn().mockResolvedValue(client) };
      const config = { host: "db.local", database: "core", max: 3 };
      vi.spyOn(console, "log").mockImplementation(() => {});
      Pool.mockImplementation(
        class {
          constructor() {
            return pool;
          }
        }
      );

      connector = new PostgresConnector(config);

      await connector.initPool();

      expect(Pool).toHaveBeenCalledWith(config);
    });

    it("throws a generic initialization error when connecting fails", async () => {
      const pool = {
        connect: vi.fn().mockRejectedValue(new Error("timeout")),
      };
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      Pool.mockImplementation(
        class {
          constructor() {
            return pool;
          }
        }
      );

      await expect(connector.initPool()).rejects.toThrow(
        "[Postgres] Error initializing connection pool"
      );
      expect(consoleError).toHaveBeenCalledWith(
        "[Postgres] Error initializing connection pool:",
        "timeout"
      );
    });
  });

  describe("getConnection", () => {
    it("returns a client from the pool", async () => {
      const client = { query: vi.fn() };
      connector.pool = { connect: vi.fn().mockResolvedValue(client) };

      await expect(connector.getConnection()).resolves.toBe(client);
    });

    it("throws when the pool was not initialized", async () => {
      await expect(connector.getConnection()).rejects.toThrow(
        "[Postgres] Connection pool not initialized. Call initPool() first."
      );
    });
  });

  describe("executeQuery", () => {
    it("returns rows and releases the client", async () => {
      const client = {
        query: vi.fn().mockResolvedValue({ rows: [{ id: 1 }] }),
        release: vi.fn(),
      };
      vi.spyOn(connector, "getConnection").mockResolvedValue(client);

      const rows = await connector.executeQuery("SELECT * FROM users", [1]);

      expect(rows).toEqual([{ id: 1 }]);
      expect(client.query).toHaveBeenCalledWith("SELECT * FROM users", [1]);
      expect(client.release).toHaveBeenCalledTimes(1);
      expect(logger.startTimer).toHaveBeenCalledWith(
        "[Postgres] Executing query: SELECT * FROM users"
      );
      expect(logger.endTimer).toHaveBeenCalledWith(
        "[Postgres] Executing query: SELECT * FROM users"
      );
    });

    it("wraps query failures in DbConnectorException and still releases the client", async () => {
      const client = {
        query: vi.fn().mockRejectedValue(new Error("bad query")),
        release: vi.fn(),
      };
      vi.spyOn(connector, "getConnection").mockResolvedValue(client);

      await expect(connector.executeQuery("SELECT broken")).rejects.toThrow(
        DbConnectorException
      );
      expect(client.release).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        "[Postgres] Error executing query:",
        "bad query"
      );
    });

    it("logs release failures without replacing a successful query result", async () => {
      const client = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
        release: vi.fn(() => {
          throw new Error("release failed");
        }),
      };
      vi.spyOn(connector, "getConnection").mockResolvedValue(client);

      await expect(connector.executeQuery("SELECT 1")).resolves.toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        "[Postgres] Error releasing connection:",
        "release failed"
      );
    });
  });

  describe("executeStoreProcedure", () => {
    it("calls a procedure without cursor, commits, and returns empty rows", async () => {
      const client = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
        release: vi.fn(),
      };
      vi.spyOn(connector, "getConnection").mockResolvedValue(client);

      const rows = await connector.executeStoreProcedure("sync_users", [1, "ok"]);

      expect(rows).toEqual([]);
      expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
      expect(client.query).toHaveBeenNthCalledWith(2, "CALL sync_users($1, $2)", [
        1,
        "ok",
      ]);
      expect(client.query).toHaveBeenLastCalledWith("COMMIT");
      expect(client.release).toHaveBeenCalledTimes(1);
      expect(logger.endTimer).toHaveBeenCalledWith(
        "[Postgres] Executing stored procedure: sync_users"
      );
    });

    it("fetches and closes a safe cursor before committing", async () => {
      const client = {
        query: vi.fn((query) => {
          if (query === "FETCH ALL FROM result_cursor") {
            return Promise.resolve({ rows: [{ id: 42 }] });
          }
          return Promise.resolve({ rows: [] });
        }),
        release: vi.fn(),
      };
      vi.spyOn(connector, "getConnection").mockResolvedValue(client);

      const rows = await connector.executeStoreProcedure(
        "load_report",
        [7],
        "result_cursor"
      );

      expect(rows).toEqual([{ id: 42 }]);
      expect(client.query).toHaveBeenNthCalledWith(2, "CALL load_report($1, $2)", [
        7,
        "result_cursor",
      ]);
      expect(client.query).toHaveBeenCalledWith("FETCH ALL FROM result_cursor");
      expect(client.query).toHaveBeenCalledWith("CLOSE result_cursor");
      expect(client.query).toHaveBeenLastCalledWith("COMMIT");
    });

    it("rolls back and rejects unsafe cursor names", async () => {
      const client = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
        release: vi.fn(),
      };
      vi.spyOn(connector, "getConnection").mockResolvedValue(client);

      await expect(
        connector.executeStoreProcedure("load_report", [], "bad-cursor")
      ).rejects.toThrow(DbConnectorException);

      expect(client.query).toHaveBeenCalledWith("ROLLBACK");
      expect(client.query).not.toHaveBeenCalledWith("FETCH ALL FROM bad-cursor");
      expect(client.release).toHaveBeenCalledTimes(1);
    });

    it("rolls back when the procedure call fails", async () => {
      const client = {
        query: vi.fn((query) => {
          if (query.startsWith("CALL")) {
            return Promise.reject(new Error("procedure failed"));
          }
          return Promise.resolve({ rows: [] });
        }),
        release: vi.fn(),
      };
      vi.spyOn(connector, "getConnection").mockResolvedValue(client);

      await expect(
        connector.executeStoreProcedure("broken_proc", [], null)
      ).rejects.toThrow(DbConnectorException);

      expect(client.query).toHaveBeenCalledWith("ROLLBACK");
      expect(logger.error).toHaveBeenCalledWith(
        "[Postgres] Error executing stored procedure:",
        "procedure failed"
      );
      expect(client.release).toHaveBeenCalledTimes(1);
    });

    it("logs release failures after a successful procedure", async () => {
      const client = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
        release: vi.fn(() => {
          throw new Error("release failed");
        }),
      };
      vi.spyOn(connector, "getConnection").mockResolvedValue(client);

      await expect(connector.executeStoreProcedure("sync_users", [])).resolves.toEqual(
        []
      );
      expect(logger.error).toHaveBeenCalledWith(
        "[Postgres] Error releasing connection:",
        "release failed"
      );
    });
  });

  describe("closePool", () => {
    it("ends the pool when it exists", async () => {
      const pool = { end: vi.fn().mockResolvedValue(undefined) };
      connector.pool = pool;

      await connector.closePool();

      expect(pool.end).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(
        "[Postgres] Connection pool closed successfully"
      );
    });

    it("does nothing when the pool is missing", async () => {
      await connector.closePool();

      expect(logger.info).not.toHaveBeenCalledWith(
        "[Postgres] Connection pool closed successfully"
      );
    });

    it("logs and rethrows pool close failures", async () => {
      connector.pool = {
        end: vi.fn().mockRejectedValue(new Error("close failed")),
      };

      await expect(connector.closePool()).rejects.toThrow("close failed");
      expect(logger.error).toHaveBeenCalledWith(
        "[Postgres] Error closing connection pool:",
        "close failed"
      );
    });
  });
});
