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

vi.mock("../../src/services/user_service.js");

// Helper para simular req/res de express
const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("createUserController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 201 con el usuario creado", async () => {
    createUserService.mockResolvedValue({ id: "u1", token: "abc" });
    const req = { validated: { email: "juan@test.com" } };
    const res = mockRes();

    await createUserController(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: "u1", token: "abc" });
  });

  it("responde con el status de error si el service falla", async () => {
    const error = new Error("El email ya esta registrado");
    error.errorCode = errorCodes.CONFLICT;
    createUserService.mockRejectedValue(error);
    const req = { validated: {} };
    const res = mockRes();

    await createUserController(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe("getUserController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 200 con el usuario", async () => {
    getUserService.mockResolvedValue({ id: "u1", name: "Juan" });
    const req = { validated: { id: "u1" } };
    const res = mockRes();

    await getUserController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ id: "u1", name: "Juan" });
  });

  it("responde 404 si el usuario no existe", async () => {
    const error = new Error("Usuario no encontrado");
    error.errorCode = errorCodes.NOT_FOUND;
    getUserService.mockRejectedValue(error);
    const req = { validated: { id: "u1" } };
    const res = mockRes();

    await getUserController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("loginUserController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 200 con el token de sesion", async () => {
    loginUserService.mockResolvedValue({ id: "u1", token: "abc" });
    const req = { validated: { email: "juan@test.com", password: "12345678" } };
    const res = mockRes();

    await loginUserController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("responde con error de validacion si las credenciales son invalidas", async () => {
    const error = new Error("Credenciales invalidas");
    error.errorCode = errorCodes.VALIDATION;
    loginUserService.mockRejectedValue(error);
    const req = { validated: {} };
    const res = mockRes();

    await loginUserController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("listUsersController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 200 con la lista paginada", async () => {
    listUsersService.mockResolvedValue({ data: [], total: 0 });
    const req = { validated: { page: 1 } };
    const res = mockRes();

    await listUsersController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: [], total: 0 });
  });
});
