import { expect } from "chai";
import errorMap from "../../src/lib/errorMap.js";

describe("errorMap", () => {
  it("debería contener BUYP0001", () => {
    expect(errorMap).to.have.property(
      "BUYP0001",
      "Payload validation failed or request is malformed"
    );
  });
  it("debería contener BUYP0002", () => {
    expect(errorMap).to.have.property(
      "BUYP0002",
      "Missing Authorization header or token is invalid"
    );
  });
  it("debería contener ERR-3", () => {
    expect(errorMap).to.have.property(
      "BUYP0003",
      "Token is valid but does not grant sufficient permissions for this resource"
    );
  });
});
