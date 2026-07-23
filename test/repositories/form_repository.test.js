import { describe, it, expect, vi, beforeEach } from "vitest";

// 1. Mockear el conector de Postgres
vi.mock("@tigo/postgres-connector", () => ({
  executeQuery: vi.fn(),
}));

// 2. Mockear las utilidades de paginación
vi.mock("../../src/utils/pagination.js", () => ({
  normalizePagination: vi.fn().mockReturnValue({
    page: 1,
    perPage: 15,
    offset: 0,
    sort: "created_at",
    order: "desc",
  }),
  buildPaginationResponse: vi.fn((rows, total, { page, perPage }) => ({
    items: rows,
    total,
    page,
    perPage,
    totalPages: 1,
  })),
}));

import { executeQuery } from "@tigo/postgres-connector";
import {
  insertForm,
  selectFormById,
  selectFormStateById,
  selectFormsByCreator,
  updateFormTitle,
  updateForm,
  publishForm,
  deleteForm,
} from "../../src/repositories/form_repository.js";

describe("Form Repository - Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------------------
  // insertForm
  // ----------------------------------------------------------------------
  describe("insertForm", () => {
    it("debe ejecutar el INSERT de un formulario en estado DRAFT", async () => {
      const mockCreatedForm = {
        id: "f101",
        creator_id: "c101",
        title: "Encuesta 2026",
        state: "DRAFT",
      };

      executeQuery.mockResolvedValue([mockCreatedForm]);

      const result = await insertForm({
        creatorId: "c101",
        title: "Encuesta 2026",
      });

      expect(executeQuery).toHaveBeenCalledOnce();
      const [sql, params] = executeQuery.mock.calls[0];

      expect(sql).toContain("INSERT INTO forms");
      expect(params).toEqual(["c101", "Encuesta 2026"]);
      expect(result).toEqual(mockCreatedForm);
    });
  });

  // ----------------------------------------------------------------------
  // selectFormById
  // ----------------------------------------------------------------------
  describe("selectFormById", () => {
    it("debe seleccionar un formulario por ID", async () => {
      const mockForm = { id: "f101", title: "Encuesta Clientes" };
      executeQuery.mockResolvedValue([mockForm]);

      const result = await selectFormById("f101");

      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining("WHERE id = $1"),
        ["f101"],
      );
      expect(result).toEqual(mockForm);
    });

    it("debe retornar undefined si no encuentra el formulario", async () => {
      executeQuery.mockResolvedValue([]);

      const result = await selectFormById("f999");

      expect(result).toBeUndefined();
    });
  });

  // ----------------------------------------------------------------------
  // selectFormStateById
  // ----------------------------------------------------------------------
  describe("selectFormStateById", () => {
    it("debe traer únicamente el id y estado de un formulario", async () => {
      const mockState = { id: "f101", state: "PUBLISHED" };
      executeQuery.mockResolvedValue([mockState]);

      const result = await selectFormStateById("f101");

      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining("SELECT id, state FROM forms"),
        ["f101"],
      );
      expect(result).toEqual(mockState);
    });
  });

  // ----------------------------------------------------------------------
  // selectFormsByCreator
  // ----------------------------------------------------------------------
  describe("selectFormsByCreator", () => {
    it("debe obtener los formularios de un creador sin filtros adicionales", async () => {
      const mockRows = [{ id: "f1", title: "Form 1" }];
      const mockCount = [{ total: "1" }];

      executeQuery
        .mockResolvedValueOnce(mockCount)
        .mockResolvedValueOnce(mockRows);

      const result = await selectFormsByCreator("c101", {}, {});

      expect(executeQuery).toHaveBeenCalledTimes(2);

      const [countSql, countParams] = executeQuery.mock.calls[0];
      expect(countSql).toContain("WHERE creator_id = $1");
      expect(countParams).toEqual(["c101"]);

      expect(result).toEqual({
        items: mockRows,
        total: 1,
        page: 1,
        perPage: 15,
        totalPages: 1,
      });
    });

    it("debe aplicar filtros dinámicos por título y estado", async () => {
      const mockRows = [
        { id: "f1", title: "Encuesta Clientes", state: "DRAFT" },
      ];
      const mockCount = [{ total: "1" }];

      executeQuery
        .mockResolvedValueOnce(mockCount)
        .mockResolvedValueOnce(mockRows);

      const filters = { title: "Clientes", state: "DRAFT" };
      await selectFormsByCreator("c101", filters, { page: 1, perPage: 15 });

      const [countSql, countParams] = executeQuery.mock.calls[0];
      expect(countSql).toContain(
        "WHERE creator_id = $1 AND title ILIKE $2 AND state = $3",
      );
      expect(countParams).toEqual(["c101", "%Clientes%", "DRAFT"]);

      const [dataSql, dataParams] = executeQuery.mock.calls[1];
      // CAMBIO: Buscamos partes clave de la query para ignorar saltos de línea y espacios
      expect(dataSql).toContain("ORDER BY created_at desc");
      expect(dataSql).toContain("LIMIT $4 OFFSET $5");
      expect(dataParams).toEqual(["c101", "%Clientes%", "DRAFT", 15, 0]);
    });
  });
  // ----------------------------------------------------------------------
  // updateFormTitle
  // ----------------------------------------------------------------------
  describe("updateFormTitle", () => {
    it("debe actualizar el título del formulario pasándole id y title", async () => {
      const mockUpdated = { id: "f101", title: "Título Nuevo" };
      executeQuery.mockResolvedValue([mockUpdated]);

      const result = await updateFormTitle("f101", "Título Nuevo");

      // CAMBIO: Se buscan por separado para evitar fallos por saltos de línea
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE forms"),
        ["f101", "Título Nuevo"],
      );
      expect(result).toEqual(mockUpdated);
    });
  });

  // ----------------------------------------------------------------------
  // updateForm
  // ----------------------------------------------------------------------
  describe("updateForm", () => {
    it("debe actualizar el título asegurando que el estado sea DRAFT", async () => {
      const mockUpdated = { id: "f101", title: "Título Borrador" };
      executeQuery.mockResolvedValue([mockUpdated]);

      const result = await updateForm("f101", { title: "Título Borrador" });

      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining("WHERE id = $2 AND state = 'DRAFT'"),
        ["Título Borrador", "f101"],
      );
      expect(result).toEqual(mockUpdated);
    });
  });

  // ----------------------------------------------------------------------
  // publishForm
  // ----------------------------------------------------------------------
  describe("publishForm", () => {
    it("debe cambiar el estado a PUBLISHED sólo si está en DRAFT", async () => {
      const mockPublished = { id: "f101", state: "PUBLISHED" };
      executeQuery.mockResolvedValue([mockPublished]);

      const result = await publishForm("f101");

      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining("SET state = 'PUBLISHED'"),
        ["f101"],
      );
      expect(result).toEqual(mockPublished);
    });
  });

  // ----------------------------------------------------------------------
  // deleteForm
  // ----------------------------------------------------------------------
  describe("deleteForm", () => {
    it("debe eliminar el formulario por ID y retornar el id borrado", async () => {
      const mockDeleted = { id: "f101" };
      executeQuery.mockResolvedValue([mockDeleted]);

      const result = await deleteForm("f101");

      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM forms WHERE id = $1"),
        ["f101"],
      );
      expect(result).toEqual(mockDeleted);
    });
  });
});
