import { describe, it, expect, vi, beforeEach } from "vitest";

// Mockear conector de Postgres
vi.mock("@tigo/postgres-connector", () => ({
  executeQuery: vi.fn(),
}));

import { executeQuery } from "@tigo/postgres-connector";
import {
  insertAnswerDetailsBulk,
  selectDetailsBySubmission,
  selectRawAggregationByForm,
  buildResultsReport,
} from "../../src/repositories/answer_details_repository.js";

describe("Answer Details Repository - Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------------------
  // insertAnswerDetailsBulk
  // ----------------------------------------------------------------------
  describe("insertAnswerDetailsBulk", () => {
    it("debe retornar un arreglo vacío si details es nulo o está vacío", async () => {
      const resNull = await insertAnswerDetailsBulk("sub-101", null);
      const resEmpty = await insertAnswerDetailsBulk("sub-101", []);

      expect(resNull).toEqual([]);
      expect(resEmpty).toEqual([]);
      expect(executeQuery).not.toHaveBeenCalled();
    });

    it("debe construir placeholders dinámicos e insertar en lote (bulk)", async () => {
      const details = [
        { questionId: "q1", value: "Satisfecho" },
        { questionId: "q2", value: 5 },
      ];

      const mockInserted = [
        {
          id: "ad1",
          submission_id: "sub-101",
          question_id: "q1",
          value: "Satisfecho",
        },
        { id: "ad2", submission_id: "sub-101", question_id: "q2", value: "5" },
      ];

      executeQuery.mockResolvedValue(mockInserted);

      const result = await insertAnswerDetailsBulk("sub-101", details);

      expect(executeQuery).toHaveBeenCalledOnce();
      const [sql, params] = executeQuery.mock.calls[0];

      expect(sql).toContain("INSERT INTO answer_details");
      expect(sql).toContain("($1, $2, $3), ($4, $5, $6)");
      expect(params).toEqual([
        "sub-101",
        "q1",
        "Satisfecho",
        "sub-101",
        "q2",
        "5",
      ]);
      expect(result).toEqual(mockInserted);
    });
  });

  // ----------------------------------------------------------------------
  // selectDetailsBySubmission
  // ----------------------------------------------------------------------
  describe("selectDetailsBySubmission", () => {
    it("debe consultar las respuestas pertenecientes a un envío", async () => {
      const mockDetails = [
        { id: "ad1", submission_id: "sub-101", question_id: "q1", value: "Si" },
      ];

      executeQuery.mockResolvedValue(mockDetails);

      const result = await selectDetailsBySubmission("sub-101");

      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining("WHERE submission_id = $1"),
        ["sub-101"],
      );
      expect(result).toEqual(mockDetails);
    });
  });

  // ----------------------------------------------------------------------
  // selectRawAggregationByForm
  // ----------------------------------------------------------------------
  describe("selectRawAggregationByForm", () => {
    it("debe ejecutar la query con LEFT JOIN para agrupar respuestas", async () => {
      const mockRawRows = [
        {
          question_id: "q1",
          question_text: "¿Edad?",
          type: "NUMBER",
          value: "25",
          value_count: "2",
        },
      ];

      executeQuery.mockResolvedValue(mockRawRows);

      const result = await selectRawAggregationByForm("f101");

      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining("LEFT JOIN answer_details"),
        ["f101"],
      );
      expect(result).toEqual(mockRawRows);
    });
  });

  // ----------------------------------------------------------------------
  // buildResultsReport (Helper)
  // ----------------------------------------------------------------------
  describe("buildResultsReport", () => {
    it("debe omitir respuestas nulas (LEFT JOIN sin respuestas) y mapear la estructura correctamente", () => {
      const rawRows = [
        {
          question_id: "q1",
          question_text: "Comentarios",
          type: "TEXT",
          value: null,
          value_count: "0",
        },
      ];

      const report = buildResultsReport(rawRows);

      expect(report).toEqual([
        {
          questionId: "q1",
          questionText: "Comentarios",
          type: "TEXT",
          totalResponses: 0,
          distribution: {},
        },
      ]);
    });

    it("debe procesar respuestas de texto y calcular min, max y average para preguntas NUMBER", () => {
      const rawRows = [
        {
          question_id: "q1",
          question_text: "Calificación de soporte",
          type: "NUMBER",
          value: "10",
          value_count: "2",
        },
        {
          question_id: "q1",
          question_text: "Calificación de soporte",
          type: "NUMBER",
          value: "20",
          value_count: "1",
        },
        {
          question_id: "q2",
          question_text: "¿Recomendaría?",
          type: "BOOLEAN",
          value: "true",
          value_count: "3",
        },
      ];

      const report = buildResultsReport(rawRows);

      // Verificación Pregunta 1 (NUMBER) -> (10*2 + 20*1) / 3 = 40 / 3 = 13.333...
      const numQuestion = report.find((q) => q.questionId === "q1");
      expect(numQuestion.totalResponses).toBe(3);
      expect(numQuestion.distribution).toEqual({ 10: 2, 20: 1 });
      expect(numQuestion.min).toBe(10);
      expect(numQuestion.max).toBe(20);
      expect(numQuestion.average).toBeCloseTo(13.333, 3);

      // Verificación Pregunta 2 (BOOLEAN)
      const boolQuestion = report.find((q) => q.questionId === "q2");
      expect(boolQuestion.totalResponses).toBe(3);
      expect(boolQuestion.distribution).toEqual({ true: 3 });
      expect(boolQuestion.average).toBeUndefined();
    });

    it("debe retornar average, min y max como null si una pregunta NUMBER no tiene respuestas", () => {
      const rawRows = [
        {
          question_id: "q1",
          question_text: "Puntaje sin responder",
          type: "NUMBER",
          value: null,
          value_count: "0",
        },
      ];

      const report = buildResultsReport(rawRows);

      expect(report[0].average).toBeNull();
      expect(report[0].min).toBeNull();
      expect(report[0].max).toBeNull();
    });
  });
});
