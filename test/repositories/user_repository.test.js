import { describe, it, expect, vi, beforeEach } from "vitest";

// 1. Mockear el conector de Postgres corporativo
vi.mock("@tigo/postgres-connector", () => ({
  executeQuery: vi.fn(),
}));

// 2. Mockear la utilidad interna de paginación
vi.mock("../../src/utils/pagination.js", () => ({
  normalizePagination: vi.fn().mockReturnValue({
    page: 1,
    perPage: 10,
    offset: 0,
    sort: "created_at",
    order: "DESC",
  }),
  buildPaginationResponse: vi.fn((rows, total, { page, perPage }) => ({
    data: rows,
    pagination: { page, perPage, total, totalPages: 1 },
  })),
}));

import { executeQuery } from "@tigo/postgres-connector";
import {
  insertUser,
  selectUserById,
  selectUserByEmailWithPassword,
  selectAllUsers,
} from "../../src/repositories/user_repository.js";

describe("User Repository - Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. insertUser
  describe("insertUser", () => {
    it("debe ejecutar la consulta INSERT y retornar el usuario creado", async () => {
      const mockCreatedUser = {
        id: "usr-101",
        name: "Juan Suarez",
        email: "juan@gmail.com",
        role: "creator",
        created_at: "2026-07-22T20:00:00.000Z",
      };

      executeQuery.mockResolvedValue([mockCreatedUser]);

      const newUserInput = {
        name: "Juan Suarez",
        email: "juan@gmail.com",
        passwordHash: "$2b$10$hashedpassword...",
        role: "creator",
      };

      const result = await insertUser(newUserInput);

      expect(executeQuery).toHaveBeenCalledOnce();
      const [sqlQuery, params] = executeQuery.mock.calls[0];

      expect(sqlQuery).toContain("INSERT INTO users");
      expect(params).toEqual([
        "Juan Suarez",
        "juan@gmail.com",
        "$2b$10$hashedpassword...",
        "creator",
      ]);
      expect(result).toEqual(mockCreatedUser);
    });
  });

  // 2. selectUserById
  describe("selectUserById", () => {
    it("debe ejecutar la consulta SELECT por ID y retornar el usuario", async () => {
      const mockUser = {
        id: "usr-101",
        name: "Juan Suarez",
        email: "juan@gmail.com",
        role: "creator",
      };

      executeQuery.mockResolvedValue([mockUser]);

      const result = await selectUserById("usr-101");

      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining("WHERE id = $1"),
        ["usr-101"],
      );
      expect(result).toEqual(mockUser);
    });

    it("debe retornar undefined si la base de datos no encuentra el usuario", async () => {
      executeQuery.mockResolvedValue([]);

      const result = await selectUserById("usr-999");

      expect(result).toBeUndefined();
    });
  });

  // 3. selectUserByEmailWithPassword
  describe("selectUserByEmailWithPassword", () => {
    it("debe retornar los datos del usuario incluyendo password_hash para el login", async () => {
      const mockUserWithPassword = {
        id: "usr-101",
        name: "Juan Suarez",
        email: "juan@gmail.com",
        password_hash: "$2b$10$hashedpassword...",
        role: "creator",
      };

      executeQuery.mockResolvedValue([mockUserWithPassword]);

      const result = await selectUserByEmailWithPassword("juan@gmail.com");

      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining("WHERE email = $1"),
        ["juan@gmail.com"],
      );
      expect(result).toEqual(mockUserWithPassword);
    });

    it("debe retornar undefined si el email no existe en el login", async () => {
      executeQuery.mockResolvedValue([]);

      const result = await selectUserByEmailWithPassword("noexiste@gmail.com");

      expect(result).toBeUndefined();
    });
  });

  // 4. selectAllUsers
  describe("selectAllUsers", () => {
    it("debe obtener la lista de usuarios paginada sin filtros", async () => {
      const mockRows = [{ id: "usr-1", name: "User 1" }];
      const mockCountResult = [{ total: "1" }];

      executeQuery
        .mockResolvedValueOnce(mockCountResult) // 1. countQuery
        .mockResolvedValueOnce(mockRows); // 2. dataQuery

      const result = await selectAllUsers({}, { page: 1, perPage: 10 });

      expect(executeQuery).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        data: mockRows,
        pagination: { page: 1, perPage: 10, total: 1, totalPages: 1 },
      });
    });

    it("debe aplicar la cláusula WHERE cuando se pasa un filtro por nombre", async () => {
      const mockRows = [{ id: "usr-1", name: "Juan" }];
      const mockCountResult = [{ total: "1" }];

      executeQuery
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockRows);

      await selectAllUsers({ name: "Juan" }, { page: 1, perPage: 10 });

      // Verificar query de conteo
      const [countSql, countParams] = executeQuery.mock.calls[0];
      expect(countSql).toContain("WHERE name ILIKE $1");
      expect(countParams).toEqual(["%Juan%"]);

      // Verificar query de datos paginados con limit y offset
      const [dataSql, dataParams] = executeQuery.mock.calls[1];
      expect(dataSql).toContain("WHERE name ILIKE $1");
      expect(dataParams).toEqual(["%Juan%", 10, 0]);
    });

    it("debe aplicar cláusulas WHERE múltiples si se pasa filtro por nombre y por rol", async () => {
      const mockRows = [{ id: "usr-1", name: "Juan", role: "creator" }];
      const mockCountResult = [{ total: "1" }];

      executeQuery
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockRows);

      await selectAllUsers(
        { name: "Juan", role: "creator" },
        { page: 1, perPage: 10 },
      );

      const [countSql, countParams] = executeQuery.mock.calls[0];
      expect(countSql).toContain("WHERE name ILIKE $1 AND role = $2");
      expect(countParams).toEqual(["%Juan%", "creator"]);

      const [dataSql, dataParams] = executeQuery.mock.calls[1];
      expect(dataSql).toContain("WHERE name ILIKE $1 AND role = $2");
      expect(dataParams).toEqual(["%Juan%", "creator", 10, 0]);
    });
  });
});
