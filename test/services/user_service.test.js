import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcrypt";
import {
  createUserService,
  getUserService,
  loginUserService,
  listUsersService,
} from "../../src/services/user_service.js";
import {
  insertUser,
  selectUserById,
  selectUserByEmailWithPassword,
  selectAllUsers,
} from "../../src/repositories/user_repository.js";
import { generateToken } from "../../src/helpers/jws_token.js";

vi.mock("../../src/repositories/user_repository.js");
vi.mock("../../src/helpers/jws_token.js");
vi.mock("bcrypt");

describe("createUserService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("crea un usuario correctamente y retorna el token", async () => {
    bcrypt.hash.mockResolvedValue("hashed_password_123");
    insertUser.mockResolvedValue({
      id: "u1",
      name: "Juan Perez",
      email: "juan@test.com",
      role: "creator",
      created_at: new Date(),
    });
    generateToken.mockReturnValue("fake.jwt.token");

    const result = await createUserService({
      name: "  Juan Perez  ",
      email: "  JUAN@TEST.COM  ",
      password: "password123",
      role: "creator",
    });

    // Verifica normalizacion (trim + lowercase) antes de persistir
    expect(insertUser).toHaveBeenCalledWith({
      name: "Juan Perez",
      email: "juan@test.com",
      passwordHash: "hashed_password_123",
      role: "creator",
    });
    expect(result.token).toBe("fake.jwt.token");
    expect(result.email).toBe("juan@test.com");
  });

  it("lanza CONFLICT si el email ya existe (codigo 23505 de postgres)", async () => {
    bcrypt.hash.mockResolvedValue("hashed_password_123");
    insertUser.mockRejectedValue({ code: "23505" });

    await expect(
      createUserService({
        name: "Juan",
        email: "juan@test.com",
        password: "password123",
        role: "creator",
      }),
    ).rejects.toThrow(/ya esta registrado/);
  });

  it("lanza UNKNOWN si insertUser falla por otra razon", async () => {
    bcrypt.hash.mockResolvedValue("hashed_password_123");
    insertUser.mockRejectedValue(new Error("connection timeout"));

    await expect(
      createUserService({
        name: "Juan",
        email: "juan@test.com",
        password: "password123",
        role: "creator",
      }),
    ).rejects.toThrow(/No se pudo crear el usuario/);
  });
});

describe("getUserService", () => {
  const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna el usuario si existe", async () => {
    selectUserById.mockResolvedValue({ id: "u1", name: "Juan" });

    const result = await getUserService({
      id: VALID_UUID,
    });

    expect(result.id).toBe("u1");
    expect(selectUserById).toHaveBeenCalledWith(VALID_UUID);
  });

  it("lanza NOT_FOUND si el usuario no existe", async () => {
    selectUserById.mockResolvedValue(undefined);

    await expect(getUserService({ id: VALID_UUID })).rejects.toThrow(
      /no encontrado/,
    );
  });

  it("lanza VALIDATION si el id no es un uuid valido", async () => {
    await expect(getUserService({ id: "no-es-un-uuid" })).rejects.toThrow(
      /Payload invalido/,
    );
  });
});

describe("loginUserService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna el usuario y el token si las credenciales son validas", async () => {
    selectUserByEmailWithPassword.mockResolvedValue({
      id: "u1",
      email: "juan@test.com",
      password_hash: "hashed_password_123",
      role: "creator",
    });
    bcrypt.compare.mockResolvedValue(true);
    generateToken.mockReturnValue("fake.jwt.token");

    const result = await loginUserService({
      email: "JUAN@TEST.COM",
      password: "password123",
    });

    expect(result.token).toBe("fake.jwt.token");
    // Verifica que el password_hash nunca se filtra en la respuesta
    expect(result.password_hash).toBeUndefined();
  });

  it("lanza VALIDATION si el usuario no existe", async () => {
    selectUserByEmailWithPassword.mockResolvedValue(undefined);

    await expect(
      loginUserService({ email: "noexiste@test.com", password: "12345678" }),
    ).rejects.toThrow(/Credenciales invalidas/);
  });

  it("lanza VALIDATION si el password no coincide", async () => {
    selectUserByEmailWithPassword.mockResolvedValue({
      id: "u1",
      email: "juan@test.com",
      password_hash: "hashed_password_123",
    });
    bcrypt.compare.mockResolvedValue(false);

    await expect(
      loginUserService({ email: "juan@test.com", password: "wrongpass" }),
    ).rejects.toThrow(/Credenciales invalidas/);
  });
});

describe("listUsersService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pasa filtros y paginacion correctamente al repository", async () => {
    selectAllUsers.mockResolvedValue({
      data: [{ id: "u1", name: "Juan" }],
      total: 1,
      page: 1,
      perPage: 10,
    });

    const result = await listUsersService({ name: "Juan", page: "1" });

    expect(selectAllUsers).toHaveBeenCalledWith(
      { name: "Juan", roles: undefined },
      expect.objectContaining({ page: 1 }),
    );
    expect(result.data).toHaveLength(1);
  });
});
