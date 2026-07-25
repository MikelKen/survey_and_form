import { describe, it, expect, vi, beforeEach } from "vitest";

// Mockear el conector de Postgres
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

  // insertAnswerDetails
  describe("insertAnswerDetailsBulk", () => {
    it("debe retornar arreglo vacío si el arreglo de detalles está vacío", async () => {
      const result = await insertAnswerDetailsBulk("sub-101", []);
      expect(result).toEqual([]);
      expect(executeQuery).not.toHaveBeenCalled();
    });

    it("debe construir y ejecutar el query bulk insert para múltiples respuestas", async () => {
      const mockInsertedDetails = [
        { id: "ad1", submission_id: "sub-101", question_id: "q1", value: "30" },
        {
          id: "ad2",
          submission_id: "sub-101",
          question_id: "q2",
          value: "true",
        },
      ];

      executeQuery.mockResolvedValue(mockInsertedDetails);

      const details = [
        { questionId: "q1", value: 30 },
        { questionId: "q2", value: true },
      ];

      const result = await insertAnswerDetailsBulk("sub-101", details);

      expect(executeQuery).toHaveBeenCalledOnce();
      const [sql, params] = executeQuery.mock.calls[0];

      expect(sql).toContain("INSERT INTO answer_details");
      expect(sql).toContain("($1, $2, $3), ($4, $5, $6)");
      expect(params).toEqual(["sub-101", "q1", "30", "sub-101", "q2", "true"]);
      expect(result).toEqual(mockInsertedDetails);
    });
  });

  // selectDetailsBySubmission
  describe("selectDetailsBySubmission", () => {
    it("debe retornar los detalles de respuestas asociadas a un envío", async () => {
      const mockDetails = [
        {
          id: "ad1",
          submission_id: "sub-101",
          question_id: "q1",
          value: "Texto",
        },
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

  // selectRawAggregationByForm
  describe("selectRawAggregationByForm", () => {
    it("debe ejecutar la consulta de agregación raw por formulario", async () => {
      const mockRawRows = [
        {
          question_id: "q1",
          question_text: "Edad",
          type: "NUMBER",
          order_index: 1,
          value: "25",
          value_count: "2",
        },
      ];

      executeQuery.mockResolvedValue(mockRawRows);

      const result = await selectRawAggregationByForm("f101");

      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining("WHERE q.form_id = $1"),
        ["f101"],
      );
      expect(result).toEqual(mockRawRows);
    });
  });

  // buildResultsReport (Helper de Métricas)
  describe("buildResultsReport", () => {
    it("debe retornar arreglo vacío si no se pasan filas", () => {
      const report = buildResultsReport([]);
      expect(report).toEqual([]);
    });

    it("debe calcular distribución para preguntas tipo TEXT o BOOLEAN", () => {
      const rawRows = [
        {
          question_id: "q1",
          question_text: "¿Te gusta el servicio?",
          type: "BOOLEAN",
          order_index: 1,
          value: "true",
          value_count: "5",
        },
        {
          question_id: "q1",
          question_text: "¿Te gusta el servicio?",
          type: "BOOLEAN",
          order_index: 1,
          value: "false",
          value_count: "2",
        },
      ];

      const report = buildResultsReport(rawRows);

      expect(report).toHaveLength(1);
      expect(report[0]).toEqual({
        questionId: "q1",
        questionText: "¿Te gusta el servicio?",
        type: "BOOLEAN",
        totalResponses: 7,
        distribution: { true: 5, false: 2 },
      });
    });

    it("debe calcular average, min y max correctamente para preguntas tipo NUMBER", () => {
      const rawRows = [
        {
          question_id: "q2",
          question_text: "Puntuación",
          type: "NUMBER",
          order_index: 1,
          value: "10",
          value_count: "2",
        },
        {
          question_id: "q2",
          question_text: "Puntuación",
          type: "NUMBER",
          order_index: 1,
          value: "20",
          value_count: "1",
        },
      ];

      const report = buildResultsReport(rawRows);

      expect(report).toHaveLength(1);
      expect(report[0].totalResponses).toBe(3);
      expect(report[0].distribution).toEqual({ 10: 2, 20: 1 });
      expect(report[0].average).toBeCloseTo(13.33, 1);
      expect(report[0].min).toBe(10);
      expect(report[0].max).toBe(20);
    });

    it("debe asignar null a average/min/max si una pregunta NUMBER no tiene respuestas", () => {
      const rawRows = [
        {
          question_id: "q3",
          question_text: "Edad opcional",
          type: "NUMBER",
          order_index: 1,
          value: null,
          value_count: "0",
        },
      ];

      const report = buildResultsReport(rawRows);

      expect(report[0].totalResponses).toBe(0);
      expect(report[0].average).toBeNull();
      expect(report[0].min).toBeNull();
      expect(report[0].max).toBeNull();
    });
  });
});
