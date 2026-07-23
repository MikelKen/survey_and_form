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

vi.mock("../../src/repositories/answer_repository.js");
vi.mock("../../src/repositories/answer_details_repository.js");
vi.mock("../../src/repositories/form_repository.js");
vi.mock("../../src/repositories/question_repository.js");

const FORM_ID = randomUUID();
const Q_TEXT_ID = randomUUID();
const Q_NUMBER_ID = randomUUID();
const Q_BOOLEAN_ID = randomUUID();
const SUBMISSION_ID = randomUUID();

describe("submitAnswersService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lanza NOT_FOUND si el formulario no existe", async () => {
    selectFormStateById.mockResolvedValue(undefined);

    await expect(
      submitAnswersService({
        form_id: FORM_ID,
        answers: [{ questionId: Q_TEXT_ID, value: "hola" }],
      }),
    ).rejects.toThrow(/no encontrado/);
  });

  it("lanza CONFLICT si el formulario no esta PUBLISHED", async () => {
    selectFormStateById.mockResolvedValue({ id: FORM_ID, state: "DRAFT" });

    await expect(
      submitAnswersService({
        form_id: FORM_ID,
        answers: [{ questionId: Q_TEXT_ID, value: "hola" }],
      }),
    ).rejects.toThrow(/borrador/);
  });

  it("lanza VALIDATION si falta responder una pregunta requerida", async () => {
    selectFormStateById.mockResolvedValue({ id: FORM_ID, state: "PUBLISHED" });
    selectQuestionsByFormId.mockResolvedValue([
      { id: Q_TEXT_ID, required: true, question_text: "Nombre", type: "TEXT" },
    ]);

    await expect(
      submitAnswersService({
        form_id: FORM_ID,
        answers: [{ questionId: Q_TEXT_ID, value: "" }],
      }),
    ).rejects.toThrow(/requerida/);
  });

  it("lanza VALIDATION si la pregunta no pertenece al formulario", async () => {
    selectFormStateById.mockResolvedValue({ id: FORM_ID, state: "PUBLISHED" });
    selectQuestionsByFormId.mockResolvedValue([]);

    await expect(
      submitAnswersService({
        form_id: FORM_ID,
        answers: [{ questionId: Q_TEXT_ID, value: "hola" }],
      }),
    ).rejects.toThrow(/no pertenece al formulario/);
  });

  it("lanza VALIDATION si el valor NUMBER no es numerico", async () => {
    selectFormStateById.mockResolvedValue({ id: FORM_ID, state: "PUBLISHED" });
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

  it("lanza VALIDATION si el valor BOOLEAN no es valido", async () => {
    selectFormStateById.mockResolvedValue({ id: FORM_ID, state: "PUBLISHED" });
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

  it("acepta valores BOOLEAN validos (true/false/1/0)", async () => {
    selectFormStateById.mockResolvedValue({ id: FORM_ID, state: "PUBLISHED" });
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
    selectFormStateById.mockResolvedValue({ id: FORM_ID, state: "PUBLISHED" });
    selectQuestionsByFormId.mockResolvedValue([
      { id: Q_TEXT_ID, required: true, question_text: "Nombre", type: "TEXT" },
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

  it("lanza UNKNOWN si falla la persistencia", async () => {
    selectFormStateById.mockResolvedValue({ id: FORM_ID, state: "PUBLISHED" });
    selectQuestionsByFormId.mockResolvedValue([
      { id: Q_TEXT_ID, required: true, question_text: "Nombre", type: "TEXT" },
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

describe("getFormResultsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lanza NOT_FOUND si el formulario no existe", async () => {
    selectFormStateById.mockResolvedValue(undefined);

    await expect(getFormResultsService({ form_id: FORM_ID })).rejects.toThrow(
      /no encontrado/,
    );
  });

  it("retorna el reporte construido a partir de la agregacion cruda", async () => {
    selectFormStateById.mockResolvedValue({ id: FORM_ID, state: "PUBLISHED" });
    selectRawAggregationByForm.mockResolvedValue([{ question_id: "q1" }]);
    buildResultsReport.mockReturnValue([
      { questionId: "q1", totalResponses: 5 },
    ]);

    const result = await getFormResultsService({ form_id: FORM_ID });

    expect(buildResultsReport).toHaveBeenCalledWith([{ question_id: "q1" }]);
    expect(result.questions).toEqual([{ questionId: "q1", totalResponses: 5 }]);
  });
});

describe("listSubmissionsByFormService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lanza NOT_FOUND si el formulario no existe", async () => {
    selectFormStateById.mockResolvedValue(undefined);

    await expect(
      listSubmissionsByFormService({ form_id: FORM_ID }),
    ).rejects.toThrow(/no encontrado/);
  });

  it("retorna los envios paginados", async () => {
    selectFormStateById.mockResolvedValue({ id: FORM_ID, state: "PUBLISHED" });
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

describe("getSubmissionDetailService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lanza NOT_FOUND si el envio no existe", async () => {
    selectSubmissionById.mockResolvedValue(undefined);

    await expect(
      getSubmissionDetailService({ form_id: SUBMISSION_ID }),
    ).rejects.toThrow(/no encontrado/);
  });

  it("retorna el envio junto a sus respuestas", async () => {
    selectSubmissionById.mockResolvedValue({
      id: SUBMISSION_ID,
      form_id: FORM_ID,
    });
    selectDetailsBySubmission.mockResolvedValue([{ id: "d1", value: "Juan" }]);

    const result = await getSubmissionDetailService({ form_id: SUBMISSION_ID });

    expect(result.submission.id).toBe(SUBMISSION_ID);
    expect(result.answers).toHaveLength(1);
  });
});
