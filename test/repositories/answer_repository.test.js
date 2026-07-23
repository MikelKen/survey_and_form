import { describe, it, expect, vi, beforeEach } from "vitest";

// 1. Mockear conector de Postgres
vi.mock("@tigo/postgres-connector", () => ({
  executeQuery: vi.fn(),
}));

// 2. Mockear utilidades de paginación
vi.mock("../../src/utils/pagination.js", () => ({
  normalizePagination: vi.fn().mockReturnValue({
    page: 1,
    perPage: 15,
    offset: 0,
    sort: "sent_at",
    order: "DESC",
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
  insertSubmission,
  selectSubmissionById,
  selectSubmissionsByForm,
  countSubmissionsByForm,
} from "../../src/repositories/answer_repository.js";

describe("Answer Repository - Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------------------
  // insertSubmission
  // ----------------------------------------------------------------------
  describe("insertSubmission", () => {
    it("debe insertar una cabecera de envío correctamente", async () => {
      const mockSubmission = {
        id: "sub-101",
        form_id: "f101",
        sent_at: "2026-07-22T20:00:00.000Z",
      };

      executeQuery.mockResolvedValue([mockSubmission]);

      const result = await insertSubmission("f101");

      expect(executeQuery).toHaveBeenCalledOnce();
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO answers"),
        ["f101"],
      );
      expect(result).toEqual(mockSubmission);
    });
  });

  // ----------------------------------------------------------------------
  // selectSubmissionById
  // ----------------------------------------------------------------------
  describe("selectSubmissionById", () => {
    it("debe retornar la cabecera de un envío por su ID", async () => {
      const mockSubmission = {
        id: "sub-101",
        form_id: "f101",
        sent_at: "2026-07-22T20:00:00.000Z",
      };

      executeQuery.mockResolvedValue([mockSubmission]);

      const result = await selectSubmissionById("sub-101");

      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining("WHERE id = $1"),
        ["sub-101"],
      );
      expect(result).toEqual(mockSubmission);
    });

    it("debe retornar undefined si el envío no existe", async () => {
      executeQuery.mockResolvedValue([]);

      const result = await selectSubmissionById("sub-999");

      expect(result).toBeUndefined();
    });
  });

  // ----------------------------------------------------------------------
  // selectSubmissionsByForm
  // ----------------------------------------------------------------------
  describe("selectSubmissionsByForm", () => {
    it("debe retornar los envíos paginados de un formulario", async () => {
      const mockRows = [{ id: "sub-1", form_id: "f101" }];
      const mockCount = [{ total: "1" }];

      executeQuery
        .mockResolvedValueOnce(mockCount)
        .mockResolvedValueOnce(mockRows);

      const result = await selectSubmissionsByForm("f101", {
        page: 1,
        perPage: 15,
      });

      expect(executeQuery).toHaveBeenCalledTimes(2);

      const [countSql, countParams] = executeQuery.mock.calls[0];
      expect(countSql).toContain("WHERE form_id = $1");
      expect(countParams).toEqual(["f101"]);

      expect(result).toEqual({
        items: mockRows,
        total: 1,
        page: 1,
        perPage: 15,
        totalPages: 1,
      });
    });
  });

  // ----------------------------------------------------------------------
  // countSubmissionsByForm
  // ----------------------------------------------------------------------
  describe("countSubmissionsByForm", () => {
    it("debe retornar la cantidad de envíos como un número entero", async () => {
      executeQuery.mockResolvedValue([{ total: "5" }]);

      const total = await countSubmissionsByForm("f101");

      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining(
          "SELECT COUNT(*) AS total FROM answers WHERE form_id = $1",
        ),
        ["f101"],
      );
      expect(total).toBe(5);
    });
  });
});
