import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  submitAnswersController,
  getFormResultsController,
  listSubmissionsByFormController,
  getSubmissionDetailController,
} from "../../src/controllers/answer_controller.js";
import {
  submitAnswersService,
  getFormResultsService,
  listSubmissionsByFormService,
  getSubmissionDetailService,
} from "../../src/services/answer_service.js";
import { errorCodes } from "../../src/utils/errorCodes.js";

// 1. Mock de la capa de servicios de respuestas
vi.mock("../../src/services/answer_service.js");

// 2. Silenciar logger de Tigo en los tests
vi.mock("@tigo/logger", () => ({
  logger: {
    startTimer: vi.fn(),
    endTimer: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// 3. Helper para simular req/res de Express
const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

// ----------------------------------------------------------------------
// POST /forms/:form_id/responses -> submitAnswersController
// ----------------------------------------------------------------------
describe("submitAnswersController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 201 tras guardar las respuestas exitosamente", async () => {
    const mockServiceResponse = {
      submissionId: "sub-101",
      formId: "1f8720bb-bbdc-4e01-a550-bbbbe38de3b0",
      sentAt: "2026-07-22T20:40:00.000Z",
      totalAnswered: 2,
      message: "Respuesta registrada exitosamente",
    };

    submitAnswersService.mockResolvedValue(mockServiceResponse);

    const req = {
      validated: {
        form_id: "1f8720bb-bbdc-4e01-a550-bbbbe38de3b0",
        answers: [
          { questionId: "q1", value: "Excelente" },
          { questionId: "q2", value: 5 },
        ],
      },
    };
    const res = mockRes();

    await submitAnswersController(req, res);

    expect(submitAnswersService).toHaveBeenCalledWith(req.validated);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(mockServiceResponse);
  });

  it("responde 409 (Conflict) si el formulario no está en estado PUBLISHED", async () => {
    const error = new Error(
      "Un formulario en borrador no puede recibir respuestas",
    );
    error.errorCode = errorCodes.CONFLICT;
    submitAnswersService.mockRejectedValue(error);

    const req = {
      validated: {
        form_id: "1f8720bb-bbdc-4e01-a550-bbbbe38de3b0",
        answers: [],
      },
    };
    const res = mockRes();

    await submitAnswersController(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("responde 400 (Validation) si falta responder una pregunta requerida", async () => {
    const error = new Error("La pregunta es requerida");
    error.errorCode = errorCodes.VALIDATION;
    submitAnswersService.mockRejectedValue(error);

    const req = {
      validated: {
        form_id: "1f8720bb-bbdc-4e01-a550-bbbbe38de3b0",
        answers: [],
      },
    };
    const res = mockRes();

    await submitAnswersController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ----------------------------------------------------------------------
// GET /forms/:form_id/results -> getFormResultsController
// ----------------------------------------------------------------------
describe("getFormResultsController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 200 con el reporte de resultados agregados", async () => {
    const mockReport = {
      formId: "1f8720bb-bbdc-4e01-a550-bbbbe38de3b0",
      questions: [
        {
          questionId: "q1",
          questionText: "Calificación",
          type: "NUMBER",
          totalResponses: 1,
          distribution: { 5: 1 },
          average: 5,
        },
      ],
    };

    getFormResultsService.mockResolvedValue(mockReport);

    const req = {
      validated: { form_id: "1f8720bb-bbdc-4e01-a550-bbbbe38de3b0" },
    };
    const res = mockRes();

    await getFormResultsController(req, res);

    expect(getFormResultsService).toHaveBeenCalledWith(req.validated);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockReport);
  });

  it("responde 404 si el formulario consultado no existe", async () => {
    const error = new Error("Formulario no encontrado");
    error.errorCode = errorCodes.NOT_FOUND;
    getFormResultsService.mockRejectedValue(error);

    const req = {
      validated: { form_id: "1f8720bb-bbdc-4e01-a550-bbbbe38de3b0" },
    };
    const res = mockRes();

    await getFormResultsController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ----------------------------------------------------------------------
// GET /forms/:form_id/submissions -> listSubmissionsByFormController
// ----------------------------------------------------------------------
describe("listSubmissionsByFormController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 200 con la lista paginada de envíos", async () => {
    const mockSubmissionsList = {
      items: [
        { id: "sub-101", form_id: "1f8720bb-bbdc-4e01-a550-bbbbe38de3b0" },
      ],
      total: 1,
      page: 1,
      perPage: 15,
      totalPages: 1,
    };

    listSubmissionsByFormService.mockResolvedValue(mockSubmissionsList);

    const req = {
      validated: {
        form_id: "1f8720bb-bbdc-4e01-a550-bbbbe38de3b0",
        page: 1,
        perPage: 15,
      },
    };
    const res = mockRes();

    await listSubmissionsByFormController(req, res);

    expect(listSubmissionsByFormService).toHaveBeenCalledWith(req.validated);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockSubmissionsList);
  });
});

// ----------------------------------------------------------------------
// GET /submissions/:form_id -> getSubmissionDetailController
// ----------------------------------------------------------------------
describe("getSubmissionDetailController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 200 con el detalle puntual de las respuestas de un envío", async () => {
    const mockDetail = {
      submission: { id: "sub-101", form_id: "form-abc" },
      answers: [
        { id: "ans-1", submission_id: "sub-101", value: "Respuesta 1" },
      ],
    };

    getSubmissionDetailService.mockResolvedValue(mockDetail);

    const req = { validated: { form_id: "sub-101" } };
    const res = mockRes();

    await getSubmissionDetailController(req, res);

    expect(getSubmissionDetailService).toHaveBeenCalledWith(req.validated);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockDetail);
  });

  it("responde 404 si el envío no existe", async () => {
    const error = new Error("Envío no encontrado");
    error.errorCode = errorCodes.NOT_FOUND;
    getSubmissionDetailService.mockRejectedValue(error);

    const req = { validated: { form_id: "sub-999" } };
    const res = mockRes();

    await getSubmissionDetailController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
