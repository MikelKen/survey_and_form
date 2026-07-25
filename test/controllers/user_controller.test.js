import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createUserController,
  getUserController,
  loginUserController,
  listUsersController,
} from "../../src/controllers/user_controller.js";
import {
  createUserService,
  getUserService,
  loginUserService,
  listUsersService,
} from "../../src/services/user_service.js";
import { errorCodes } from "../../src/utils/errorCodes.js";

// Mockear la capa de servicio
vi.mock("../../src/services/user_service.js");

// Helper para simular los objetos req y res de Express
const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("User Controller - Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // createUserController
  describe("createUserController", () => {
    it("responde 201 con el usuario creado", async () => {
      createUserService.mockResolvedValue({ id: "u1", token: "abc" });
      const req = { validated: { email: "juan@test.com" } };
      const res = mockRes();

      await createUserController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: "u1", token: "abc" });
    });

    it("responde con status 409 CONFLICT si el service lanza un error de email duplicado", async () => {
      const error = new Error("El email ya esta registrado");
      error.errorCode = errorCodes.CONFLICT;
      createUserService.mockRejectedValue(error);
      const req = { validated: {} };
      const res = mockRes();

      await createUserController(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  // getUserController
  describe("getUserController", () => {
    it("responde 200 con la información del usuario", async () => {
      getUserService.mockResolvedValue({ id: "u1", name: "Juan" });
      const req = { validated: { id: "u1" } };
      const res = mockRes();

      await getUserController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ id: "u1", name: "Juan" });
    });

    it("responde 404 NOT_FOUND si el usuario no existe", async () => {
      const error = new Error("Usuario no encontrado");
      error.errorCode = errorCodes.NOT_FOUND;
      getUserService.mockRejectedValue(error);
      const req = { validated: { id: "u1" } };
      const res = mockRes();

      await getUserController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // loginUserController
  describe("loginUserController", () => {
    it("responde 200 con el token de sesión", async () => {
      loginUserService.mockResolvedValue({ id: "u1", token: "abc" });
      const req = {
        validated: { email: "juan@test.com", password: "12345678" },
      };
      const res = mockRes();

      await loginUserController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ id: "u1", token: "abc" });
    });

    it("responde 400 BAD_REQUEST si las credenciales son inválidas", async () => {
      const error = new Error("Credenciales invalidas");
      error.errorCode = errorCodes.VALIDATION;
      loginUserService.mockRejectedValue(error);
      const req = { validated: {} };
      const res = mockRes();

      await loginUserController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // listUsersController
  describe("listUsersController", () => {
    it("responde 200 con la lista paginada", async () => {
      listUsersService.mockResolvedValue({ data: [], total: 0 });
      const req = { validated: { page: 1 } };
      const res = mockRes();

      await listUsersController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: [], total: 0 });
    });

    it("responde con error si el service de listado falla", async () => {
      const error = new Error("Error interno");
      error.errorCode = errorCodes.UNKNOWN;
      listUsersService.mockRejectedValue(error);
      const req = { validated: {} };
      const res = mockRes();

      await listUsersController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
