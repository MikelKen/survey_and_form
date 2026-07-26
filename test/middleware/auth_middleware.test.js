import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";

import { authMiddleware } from "../../src/middleware/auth_middleware.js";

vi.mock("@tigo/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../src/utils/response.js", () => ({
  sendError: vi.fn(() => ({
    statusHttp: 401,
    response: {
      message: "Unauthorized",
    },
  })),
}));

describe("authMiddleware", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      headers: {},
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    next = vi.fn();
  });

  it("debería retornar 401 cuando no se proporciona Authorization", () => {
    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Unauthorized",
    });

    expect(next).not.toHaveBeenCalled();
  });

  it("debería retornar 401 cuando Authorization no tiene formato Bearer", () => {
    req.headers.authorization = "Basic abc123";

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Unauthorized",
    });

    expect(next).not.toHaveBeenCalled();
  });

  it("debería validar el token y llamar next cuando es válido", () => {
    const decodedToken = {
      id: 1,
      username: "test",
    };

    vi.spyOn(jwt, "verify").mockReturnValue(decodedToken);

    req.headers.authorization = "Bearer token-valido";

    authMiddleware(req, res, next);

    expect(jwt.verify).toHaveBeenCalled();

    expect(req.user).toEqual(decodedToken);
    expect(next).toHaveBeenCalled();
  });

  it("debería retornar 401 cuando jwt.verify lanza un error", () => {
    vi.spyOn(jwt, "verify").mockImplementation(() => {
      throw new Error("Token inválido");
    });

    req.headers.authorization = "Bearer token-invalido";

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);

    expect(res.json).toHaveBeenCalledWith({
      message: "Unauthorized",
    });

    expect(next).not.toHaveBeenCalled();
  });
});
