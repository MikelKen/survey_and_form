import { describe, it, expect, vi, beforeEach } from "vitest";

// 1. Mockear el conector de Postgres
vi.mock("@tigo/postgres-connector", () => ({
  executeQuery: vi.fn(),
}));

import { executeQuery } from "@tigo/postgres-connector";
import {
  insertQuestion,
  selectQuestionById,
  selectQuestionsByFormId,
  countQuestionsByFormId,
  updateQuestion,
  deleteQuestion,
} from "../../src/repositories/question_repository.js";

describe("Question Repository - Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------------------
  // insertQuestion
  // ----------------------------------------------------------------------
  describe("insertQuestion", () => {
    it("debe insertar una pregunta con valores proporcionados y valores por defecto", async () => {
      const mockQuestion = {
        id: "q101",
        form_id: "f101",
        question_text: "¿Cuál es tu edad?",
        type: "NUMBER",
        required: false,
        order_index: 1,
      };

      executeQuery.mockResolvedValue([mockQuestion]);

      const input = {
        formId: "f101",
        questionText: "¿Cuál es tu edad?",
        type: "NUMBER",
      };

      const result = await insertQuestion(input);

      expect(executeQuery).toHaveBeenCalledOnce();
      const [sql, params] = executeQuery.mock.calls[0];

      expect(sql).toContain("INSERT INTO questions");
      expect(params).toEqual(["f101", "¿Cuál es tu edad?", "NUMBER", false, 1]);
      expect(result).toEqual(mockQuestion);
    });

    it("debe insertar una pregunta pasando required y orderIndex personalizados", async () => {
      const mockQuestion = {
        id: "q102",
        form_id: "f101",
        question_text: "Comentarios",
        type: "TEXT",
        required: true,
        order_index: 2,
      };

      executeQuery.mockResolvedValue([mockQuestion]);

      const input = {
        formId: "f101",
        questionText: "Comentarios",
        type: "TEXT",
        required: true,
        orderIndex: 2,
      };

      const result = await insertQuestion(input);

      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO questions"),
        ["f101", "Comentarios", "TEXT", true, 2],
      );
      expect(result).toEqual(mockQuestion);
    });
  });

  // ----------------------------------------------------------------------
  // selectQuestionById
  // ----------------------------------------------------------------------
  describe("selectQuestionById", () => {
    it("debe seleccionar una pregunta por su ID", async () => {
      const mockQuestion = { id: "q101", question_text: "¿Tienes mascota?" };
      executeQuery.mockResolvedValue([mockQuestion]);

      const result = await selectQuestionById("q101");

      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining("WHERE id = $1"),
        ["q101"],
      );
      expect(result).toEqual(mockQuestion);
    });

    it("debe retornar undefined si la pregunta no existe", async () => {
      executeQuery.mockResolvedValue([]);

      const result = await selectQuestionById("q999");

      expect(result).toBeUndefined();
    });
  });

  // ----------------------------------------------------------------------
  // selectQuestionsByFormId
  // ----------------------------------------------------------------------
  describe("selectQuestionsByFormId", () => {
    it("debe retornar la lista de preguntas ordenadas por order_index ASC", async () => {
      const mockQuestions = [
        { id: "q1", order_index: 1 },
        { id: "q2", order_index: 2 },
      ];
      executeQuery.mockResolvedValue(mockQuestions);

      const result = await selectQuestionsByFormId("f101");

      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining("WHERE form_id = $1"),
        ["f101"],
      );
      expect(result).toEqual(mockQuestions);
    });
  });

  // ----------------------------------------------------------------------
  // countQuestionsByFormId
  // ----------------------------------------------------------------------
  describe("countQuestionsByFormId", () => {
    it("debe retornar el total de preguntas como un número", async () => {
      executeQuery.mockResolvedValue([{ total: "3" }]);

      const total = await countQuestionsByFormId("f101");

      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining("SELECT COUNT(*) AS total FROM questions"),
        ["f101"],
      );
      expect(total).toBe(3);
    });
  });

  // ----------------------------------------------------------------------
  // updateQuestion
  // ----------------------------------------------------------------------
  describe("updateQuestion", () => {
    it("debe actualizar los campos de una pregunta por su ID", async () => {
      const mockUpdated = {
        id: "q101",
        question_text: "Nuevo texto",
        type: "TEXT",
        required: true,
        order_index: 5,
      };

      executeQuery.mockResolvedValue([mockUpdated]);

      const updateData = {
        questionText: "Nuevo texto",
        type: "TEXT",
        required: true,
        orderIndex: 5,
      };

      const result = await updateQuestion("q101", updateData);

      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE questions"),
        ["q101", "Nuevo texto", "TEXT", true, 5],
      );
      expect(result).toEqual(mockUpdated);
    });
  });

  // ----------------------------------------------------------------------
  // deleteQuestion
  // ----------------------------------------------------------------------
  describe("deleteQuestion", () => {
    it("debe eliminar la pregunta por ID y retornar su id", async () => {
      const mockDeleted = { id: "q101" };
      executeQuery.mockResolvedValue([mockDeleted]);

      const result = await deleteQuestion("q101");

      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM questions WHERE id = $1"),
        ["q101"],
      );
      expect(result).toEqual(mockDeleted);
    });
  });
});
