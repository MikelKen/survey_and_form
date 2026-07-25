import { expect } from "chai";
import { SncConnectorException } from "../src/exceptions/connectorException.js";

describe("SncConnectorException", () => {
  it("should create an exception with a message", () => {
    const exception = new SncConnectorException("Test error");
    expect(exception.message).to.equal("Test error");
    expect(exception.name).to.equal("SncConnectorException");
  });
});