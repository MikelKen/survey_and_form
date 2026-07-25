import { describe, it, expect, vi, beforeEach } from "vitest";
import { randomUUID } from "crypto";
import {
  submitAnswersService,
  getFormResultsService,
  listSubmissionsByFormService,
  getSubmissionDetailService,
} from "../../src/services/answer_service.js";
import {
  insertSubmission,
  selectSubmissionById,
  selectSubmissionsByForm,
} from "../../src/repositories/answer_repository.js";
import {
  insertAnswerDetailsBulk,
  selectDetailsBySubmission,
  selectRawAggregationByForm,
  buildResultsReport,
} from "../../src/repositories/answer_details_repository.js";
import { selectFormStateById } from "../../src/repositories/form_repository.js";
import { selectQuestionsByFormId } from "../../src/repositories/question_repository.js";
import { getCall, setCall } from "@tigo/redis-connector";

// 1. Mockear los repositorios de datos
vi.mock("../../src/repositories/answer_repository.js");
vi.mock("../../src/repositories/answer_details_repository.js");
vi.mock("../../src/repositories/form_repository.js");
vi.mock("../../src/repositories/question_repository.js");

// 2. Mockear el conector corporativo de Redis
vi.mock("@tigo/redis-connector", () => ({
  getCall: vi.fn(),
  setCall: vi.fn(),
}));

const FORM_ID = randomUUID();
const Q_TEXT_ID = randomUUID();
const Q_NUMBER_ID = randomUUID();
const Q_BOOLEAN_ID = randomUUID();
const SUBMISSION_ID = randomUUID();

describe("Answer Service - Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. submitAnswersService
  describe("submitAnswersService", () => {
    it("lanza NOT_FOUND si el formulario no existe", async () => {
      selectFormStateById.mockResolvedValue(undefined);

      await expect(
        submitAnswersService({
          form_id: FORM_ID,
          answers: [{ questionId: Q_TEXT_ID, value: "hola" }],
        }),
      ).rejects.toThrow(/no encontrado/);
    });

    it("lanza CONFLICT si el formulario no está en estado PUBLISHED", async () => {
      selectFormStateById.mockResolvedValue({ id: FORM_ID, state: "DRAFT" });

      await expect(
        submitAnswersService({
          form_id: FORM_ID,
          answers: [{ questionId: Q_TEXT_ID, value: "hola" }],
        }),
      ).rejects.toThrow(/borrador/);
    });

    it("lanza VALIDATION si falta responder una pregunta requerida", async () => {
      selectFormStateById.mockResolvedValue({
        id: FORM_ID,
        state: "PUBLISHED",
      });
      selectQuestionsByFormId.mockResolvedValue([
        {
          id: Q_TEXT_ID,
          required: true,
          question_text: "Nombre",
          type: "TEXT",
        },
      ]);

      await expect(
        submitAnswersService({
          form_id: FORM_ID,
          answers: [{ questionId: Q_TEXT_ID, value: "" }],
        }),
      ).rejects.toThrow(/requerida/);
    });

    it("lanza VALIDATION si la pregunta respondida no pertenece al formulario", async () => {
      selectFormStateById.mockResolvedValue({
        id: FORM_ID,
        state: "PUBLISHED",
      });
      selectQuestionsByFormId.mockResolvedValue([]);

      await expect(
        submitAnswersService({
          form_id: FORM_ID,
          answers: [{ questionId: Q_TEXT_ID, value: "hola" }],
        }),
      ).rejects.toThrow(/no pertenece al formulario/);
    });

    it("lanza VALIDATION si el valor NUMBER no es numérico", async () => {
      selectFormStateById.mockResolvedValue({
        id: FORM_ID,
        state: "PUBLISHED",
      });
      selectQuestionsByFormId.mockResolvedValue([
        {
          id: Q_NUMBER_ID,
          required: false,
          question_text: "Edad",
          type: "NUMBER",
        },
      ]);

      await expect(
        submitAnswersService({
          form_id: FORM_ID,
          answers: [{ questionId: Q_NUMBER_ID, value: "abc" }],
        }),
      ).rejects.toThrow(/numerico/);
    });

    it("lanza VALIDATION si el valor BOOLEAN no es válido", async () => {
      selectFormStateById.mockResolvedValue({
        id: FORM_ID,
        state: "PUBLISHED",
      });
      selectQuestionsByFormId.mockResolvedValue([
        {
          id: Q_BOOLEAN_ID,
          required: false,
          question_text: "Acepta?",
          type: "BOOLEAN",
        },
      ]);

      await expect(
        submitAnswersService({
          form_id: FORM_ID,
          answers: [{ questionId: Q_BOOLEAN_ID, value: "tal vez" }],
        }),
      ).rejects.toThrow(/booleano/);
    });

    it("acepta valores BOOLEAN válidos (true/false/1/0)", async () => {
      selectFormStateById.mockResolvedValue({
        id: FORM_ID,
        state: "PUBLISHED",
      });
      selectQuestionsByFormId.mockResolvedValue([
        {
          id: Q_BOOLEAN_ID,
          required: false,
          question_text: "Acepta?",
          type: "BOOLEAN",
        },
      ]);
      insertSubmission.mockResolvedValue({
        id: SUBMISSION_ID,
        form_id: FORM_ID,
        sent_at: new Date(),
      });
      insertAnswerDetailsBulk.mockResolvedValue([{ id: "d1" }]);

      const result = await submitAnswersService({
        form_id: FORM_ID,
        answers: [{ questionId: Q_BOOLEAN_ID, value: "1" }],
      });

      expect(result.submissionId).toBe(SUBMISSION_ID);
    });

    it("registra la respuesta correctamente (happy path)", async () => {
      selectFormStateById.mockResolvedValue({
        id: FORM_ID,
        state: "PUBLISHED",
      });
      selectQuestionsByFormId.mockResolvedValue([
        {
          id: Q_TEXT_ID,
          required: true,
          question_text: "Nombre",
          type: "TEXT",
        },
      ]);
      insertSubmission.mockResolvedValue({
        id: SUBMISSION_ID,
        form_id: FORM_ID,
        sent_at: new Date(),
      });
      insertAnswerDetailsBulk.mockResolvedValue([{ id: "d1" }]);

      const result = await submitAnswersService({
        form_id: FORM_ID,
        answers: [{ questionId: Q_TEXT_ID, value: "Juan" }],
      });

      expect(result.totalAnswered).toBe(1);
      expect(result.message).toMatch(/registrada exitosamente/);
    });

    it("lanza UNKNOWN si falla la persistencia en base de datos", async () => {
      selectFormStateById.mockResolvedValue({
        id: FORM_ID,
        state: "PUBLISHED",
      });
      selectQuestionsByFormId.mockResolvedValue([
        {
          id: Q_TEXT_ID,
          required: true,
          question_text: "Nombre",
          type: "TEXT",
        },
      ]);
      insertSubmission.mockRejectedValue(new Error("db down"));

      await expect(
        submitAnswersService({
          form_id: FORM_ID,
          answers: [{ questionId: Q_TEXT_ID, value: "Juan" }],
        }),
      ).rejects.toThrow(/No se pudo registrar la respuesta/);
    });
  });

  // 2. getFormResultsService (Con Caché Redis)
  describe("getFormResultsService", () => {
    it("retorna los resultados directamente desde Redis si existen (Cache Hit)", async () => {
      const mockCachedPayload = {
        formId: FORM_ID,
        questions: [{ questionId: "q1", totalResponses: 10 }],
      };

      getCall.mockResolvedValue(JSON.stringify(mockCachedPayload));

      const result = await getFormResultsService({ form_id: FORM_ID });

      expect(getCall).toHaveBeenCalledWith(`results:${FORM_ID}`);
      expect(selectFormStateById).not.toHaveBeenCalled(); // No debe consultar a PostgreSQL
      expect(result).toEqual(mockCachedPayload);
    });

    it("consulta en PostgreSQL si no está en Redis y guarda el reporte en caché (Cache Miss)", async () => {
      getCall.mockResolvedValue(null); // Cache Miss
      selectFormStateById.mockResolvedValue({
        id: FORM_ID,
        state: "PUBLISHED",
      });
      selectRawAggregationByForm.mockResolvedValue([{ question_id: "q1" }]);
      buildResultsReport.mockReturnValue([
        { questionId: "q1", totalResponses: 5 },
      ]);

      const result = await getFormResultsService({ form_id: FORM_ID });

      expect(selectRawAggregationByForm).toHaveBeenCalledWith(FORM_ID);
      expect(buildResultsReport).toHaveBeenCalledWith([{ question_id: "q1" }]);
      expect(setCall).toHaveBeenCalledWith(
        `results:${FORM_ID}`,
        {
          formId: FORM_ID,
          questions: [{ questionId: "q1", totalResponses: 5 }],
        },
        60,
      );
      expect(result.questions).toEqual([
        { questionId: "q1", totalResponses: 5 },
      ]);
    });

    it("lanza NOT_FOUND si el formulario no existe", async () => {
      getCall.mockResolvedValue(null);
      selectFormStateById.mockResolvedValue(undefined);

      await expect(getFormResultsService({ form_id: FORM_ID })).rejects.toThrow(
        /no encontrado/,
      );
    });
  });

  // 3. listSubmissionsByFormService
  describe("listSubmissionsByFormService", () => {
    it("lanza NOT_FOUND si el formulario no existe", async () => {
      selectFormStateById.mockResolvedValue(undefined);

      await expect(
        listSubmissionsByFormService({ form_id: FORM_ID }),
      ).rejects.toThrow(/no encontrado/);
    });

    it("retorna los envíos paginados", async () => {
      selectFormStateById.mockResolvedValue({
        id: FORM_ID,
        state: "PUBLISHED",
      });
      selectSubmissionsByForm.mockResolvedValue({
        data: [{ id: SUBMISSION_ID }],
        total: 1,
        page: 1,
        perPage: 15,
      });

      const result = await listSubmissionsByFormService({ form_id: FORM_ID });

      expect(result.data).toHaveLength(1);
    });
  });

  // 4. getSubmissionDetailService
  describe("getSubmissionDetailService", () => {
    it("lanza NOT_FOUND si el envío no existe", async () => {
      selectSubmissionById.mockResolvedValue(undefined);

      await expect(
        getSubmissionDetailService({ form_id: SUBMISSION_ID }),
      ).rejects.toThrow(/no encontrado/);
    });

    it("retorna el envío junto a sus respuestas detalladas", async () => {
      selectSubmissionById.mockResolvedValue({
        id: SUBMISSION_ID,
        form_id: FORM_ID,
      });
      selectDetailsBySubmission.mockResolvedValue([
        { id: "d1", value: "Juan" },
      ]);

      const result = await getSubmissionDetailService({
        form_id: SUBMISSION_ID,
      });

      expect(result.submission.id).toBe(SUBMISSION_ID);
      expect(result.answers).toHaveLength(1);
    });
  });
});
