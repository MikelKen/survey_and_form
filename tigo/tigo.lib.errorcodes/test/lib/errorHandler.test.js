import { expect } from "chai";
import { getErrorMessage } from "../../src/lib/errorHandler.js";

describe("getErrorMessage", () => {
  it("debería devolver el mensaje correcto para BUYP0001", () => {
    expect(getErrorMessage("BUYP0001")).to.equal(
      "Payload validation failed or request is malformed"
    );
  });
  it("debería devolver el mensaje correcto para BUYP0002", () => {
    expect(getErrorMessage("BUYP0002")).to.equal(
      "Missing Authorization header or token is invalid"
    );
  });
  it("debería devolver el mensaje correcto para BUYP0003", () => {
    expect(getErrorMessage("BUYP0003")).to.equal(
      "Token is valid but does not grant sufficient permissions for this resource"
    );
  });
  it("debería devolver mensaje genérico para código desconocido", () => {
    expect(getErrorMessage("ERR-999")).to.equal("Unknown error");
  });
});
