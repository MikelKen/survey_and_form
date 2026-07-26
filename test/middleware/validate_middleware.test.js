import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateRequestMiddleware } from "../../src/middleware/validate_middleware.js";

// Mock del logger para mantener limpia la consola durante la ejecución de los tests
vi.mock("@tigo/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Validate Request Middleware - Unit Tests", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      params: {},
      query: {},
      body: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  describe("createUser validation", () => {
    const middleware = validateRequestMiddleware.createUser();

    it("debe pasar al siguiente middleware (next) si los datos de usuario son válidos", () => {
      req.body = {
        name: "Juan Pérez",
        email: "juan@test.com",
        password: "Password123!",
        role: "creator",
      };

      middleware(req, res, next);

      expect(req.validated).toBeDefined();
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("debe retornar error 400 si faltan campos obligatorios en el registro", () => {
      req.body = {
        name: "Juan",
        // Faltan email, password y role
      };

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("getUser (param ID) validation", () => {
    const middleware = validateRequestMiddleware.getUser();

    it("debe validar correctamente un UUID de usuario en los parámetros", () => {
      req.params = {
        id: "123e4567-e89b-12d3-a456-426614174000",
      };

      middleware(req, res, next);

      expect(req.validated.id).toBe(req.params.id);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("debe fallar si el ID proporcionado no cumple con el formato válido", () => {
      req.params = {
        id: "id-invalido-no-uuid",
      };

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("Headers custom (x-traceid y x-clientid)", () => {
    const middleware = validateRequestMiddleware.getUser();

    it("debe capturar y validar los headers x-traceid y x-clientid si están presentes", () => {
      req.headers = {
        "x-traceid": "trace-12345",
        "x-clientid": "client-abc",
      };
      req.params = {
        id: "123e4567-e89b-12d3-a456-426614174000",
      };

      middleware(req, res, next);

      expect(req.validated.xtraceid).toBe("trace-12345");
      expect(req.validated.xclientid).toBe("client-abc");
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
