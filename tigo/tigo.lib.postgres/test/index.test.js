import { afterEach, describe, expect, it, vi } from "vitest";

const connectorMock = vi.hoisted(() => {
  const instances = [];

  const PostgresConnector = vi.fn(function PostgresConnector(config) {
    this.config = config;
    this.initPool = vi.fn().mockResolvedValue(undefined);
    this.executeQuery = vi.fn().mockResolvedValue([{ id: 1 }]);
    this.executeStoreProcedure = vi.fn().mockResolvedValue([{ id: 2 }]);
    this.closePool = vi.fn().mockResolvedValue(undefined);
    instances.push(this);
  });

  return { instances, PostgresConnector };
});

vi.mock("../src/lib/postgresConnector.js", () => ({
  PostgresConnector: connectorMock.PostgresConnector,
}));

import {
  closeAllConnections,
  closeConnection,
  executeQuery,
  executeStoreProcedure,
  getDB,
  initializeDB,
} from "../src/index.js";
import { PostgresConnector } from "../src/lib/postgresConnector.js";

describe("index database registry", () => {
  afterEach(async () => {
    await closeAllConnections();
    connectorMock.instances.length = 0;
    vi.clearAllMocks();
  });

  it("throws when the default database was not initialized", () => {
    expect(() => getDB()).toThrow(
      "[Postgres] Database 'default' not initialized. Call initializeDB('default') first."
    );
  });

  it("initializes the default database with the provided config", async () => {
    const config = { host: "localhost", max: 3 };

    const db = await initializeDB("default", config);

    expect(db).toBeInstanceOf(PostgresConnector);
    expect(PostgresConnector).toHaveBeenCalledWith(config);
    expect(db.initPool).toHaveBeenCalledTimes(1);
    expect(getDB()).toBe(db);
  });

  it("returns an existing instance without initializing a second pool", async () => {
    const first = await initializeDB("analytics", { database: "analytics" });
    const second = await initializeDB("analytics", { database: "ignored" });

    expect(second).toBe(first);
    expect(PostgresConnector).toHaveBeenCalledTimes(1);
    expect(first.initPool).toHaveBeenCalledTimes(1);
  });

  it("routes queries and stored procedures to the named instance", async () => {
    const sales = await initializeDB("sales", { database: "sales" });
    const audit = await initializeDB("audit", { database: "audit" });

    const queryRows = await executeQuery("SELECT * FROM sales", [10], "sales");
    const procedureRows = await executeStoreProcedure(
      "refresh_audit",
      [1],
      "audit_cursor",
      "audit"
    );

    expect(queryRows).toEqual([{ id: 1 }]);
    expect(procedureRows).toEqual([{ id: 2 }]);
    expect(sales.executeQuery).toHaveBeenCalledWith("SELECT * FROM sales", [10]);
    expect(audit.executeStoreProcedure).toHaveBeenCalledWith(
      "refresh_audit",
      [1],
      "audit_cursor"
    );
  });

  it("closes and removes a named connection", async () => {
    const db = await initializeDB("reports", { database: "reports" });

    await closeConnection("reports");

    expect(db.closePool).toHaveBeenCalledTimes(1);
    expect(() => getDB("reports")).toThrow(
      "[Postgres] Database 'reports' not initialized. Call initializeDB('reports') first."
    );
  });

  it("closes every initialized connection", async () => {
    const first = await initializeDB("one", { database: "one" });
    const second = await initializeDB("two", { database: "two" });

    await closeAllConnections();

    expect(first.closePool).toHaveBeenCalledTimes(1);
    expect(second.closePool).toHaveBeenCalledTimes(1);
    expect(() => getDB("one")).toThrow("Database 'one' not initialized");
    expect(() => getDB("two")).toThrow("Database 'two' not initialized");
  });
});
