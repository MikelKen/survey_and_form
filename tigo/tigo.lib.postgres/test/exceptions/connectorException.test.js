import { describe, expect, it } from "vitest";
import { DbConnectorException } from "../../src/exceptions/connectorException.js";

describe("DbConnectorException", () => {
  it("creates an Error with the provided message and custom name", () => {
    const exception = new DbConnectorException("Connection error");

    expect(exception).toBeInstanceOf(Error);
    expect(exception.name).toBe("DbConnectorException");
    expect(exception.message).toBe("Connection error");
  });

  it("captures a stack trace", () => {
    const exception = new DbConnectorException("Trace me");

    expect(exception.stack).toContain("DbConnectorException");
  });
});
