import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createQuestionController,
  getQuestionByIdController,
  getQuestionsByFormController,
  updateQuestionController,
  deleteQuestionController,
} from "../../src/controllers/question_controller.js";
import {
  createQuestionService,
  getQuestionByIdService,
  getQuestionsByFormService,
  updateQuestionService,
  deleteQuestionService,
} from "../../src/services/question_service.js";
import { errorCodes } from "../../src/utils/errorCodes.js";

// 1. Mock de los servicios de preguntas
vi.mock("../../src/services/question_service.js");

// 2. Silenciar el logger durante la ejecución de los tests
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
// POST /questions -> createQuestionController
// ----------------------------------------------------------------------
describe("createQuestionController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 201 con la pregunta creada exitosamente", async () => {
    const mockCreatedQuestion = {
      id: "q101",
      form_id: "1f8720bb-bbdc-4e01-a550-bbbbe38de3b0",
      question_text: "¿Cuál es tu edad?",
      type: "NUMBER",
      required: true,
      order_index: 1,
    };

    createQuestionService.mockResolvedValue(mockCreatedQuestion);

    const req = {
      validated: {
        form_id: "1f8720bb-bbdc-4e01-a550-bbbbe38de3b0",
        question_text: "¿Cuál es tu edad?",
        type: "NUMBER",
        required: true,
        order_index: 1,
      },
    };
    const res = mockRes();

    await createQuestionController(req, res);

    expect(createQuestionService).toHaveBeenCalledWith(req.validated);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(mockCreatedQuestion);
  });

  it("responde 409 (Conflict) si el formulario ya está publicado", async () => {
    const error = new Error(
      "No se pueden agregar preguntas a un formulario publicado",
    );
    error.errorCode = errorCodes.CONFLICT;
    createQuestionService.mockRejectedValue(error);

    const req = {
      validated: { form_id: "1f8720bb-bbdc-4e01-a550-bbbbe38de3b0" },
    };
    const res = mockRes();

    await createQuestionController(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });
});

// ----------------------------------------------------------------------
// GET /questions/:id -> getQuestionByIdController
// ----------------------------------------------------------------------
describe("getQuestionByIdController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 200 con la pregunta encontrada", async () => {
    const mockQuestion = {
      id: "q101",
      question_text: "¿Tienes vehículo?",
      type: "BOOLEAN",
    };
    getQuestionByIdService.mockResolvedValue(mockQuestion);

    const req = { validated: { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" } };
    const res = mockRes();

    await getQuestionByIdController(req, res);

    expect(getQuestionByIdService).toHaveBeenCalledWith(req.validated);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockQuestion);
  });

  it("responde 404 si la pregunta no existe", async () => {
    const error = new Error("Pregunta no encontrada");
    error.errorCode = errorCodes.NOT_FOUND;
    getQuestionByIdService.mockRejectedValue(error);

    const req = { validated: { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" } };
    const res = mockRes();

    await getQuestionByIdController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ----------------------------------------------------------------------
// GET /forms/:form_id/questions -> getQuestionsByFormController
// ----------------------------------------------------------------------
describe("getQuestionsByFormController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 200 con la lista de preguntas del formulario", async () => {
    const mockQuestionsList = [
      { id: "q1", question_text: "Pregunta 1", order_index: 1 },
      { id: "q2", question_text: "Pregunta 2", order_index: 2 },
    ];
    getQuestionsByFormService.mockResolvedValue(mockQuestionsList);

    const req = {
      validated: { form_id: "1f8720bb-bbdc-4e01-a550-bbbbe38de3b0" },
    };
    const res = mockRes();

    await getQuestionsByFormController(req, res);

    expect(getQuestionsByFormService).toHaveBeenCalledWith(req.validated);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockQuestionsList);
  });

  it("responde 404 si el formulario padre no existe", async () => {
    const error = new Error("El formulario no existe");
    error.errorCode = errorCodes.NOT_FOUND;
    getQuestionsByFormService.mockRejectedValue(error);

    const req = {
      validated: { form_id: "1f8720bb-bbdc-4e01-a550-bbbbe38de3b0" },
    };
    const res = mockRes();

    await getQuestionsByFormController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ----------------------------------------------------------------------
// PUT /questions/:id -> updateQuestionController
// ----------------------------------------------------------------------
describe("updateQuestionController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 200 con la pregunta actualizada", async () => {
    const mockUpdatedQuestion = {
      id: "q101",
      question_text: "Nuevo texto",
      type: "TEXT",
    };
    updateQuestionService.mockResolvedValue(mockUpdatedQuestion);

    const req = {
      validated: {
        id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        question_text: "Nuevo texto",
      },
    };
    const res = mockRes();

    await updateQuestionController(req, res);

    expect(updateQuestionService).toHaveBeenCalledWith(req.validated);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockUpdatedQuestion);
  });

  it("responde 409 (Conflict) si se intenta editar una pregunta de un formulario publicado", async () => {
    const error = new Error(
      "No se puede editar una pregunta de un formulario publicado",
    );
    error.errorCode = errorCodes.CONFLICT;
    updateQuestionService.mockRejectedValue(error);

    const req = { validated: { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" } };
    const res = mockRes();

    await updateQuestionController(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });
});

// ----------------------------------------------------------------------
// DELETE /questions/:id -> deleteQuestionController
// ----------------------------------------------------------------------
describe("deleteQuestionController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 200 tras eliminar la pregunta exitosamente", async () => {
    const mockResponse = {
      id: "q101",
      message: "Pregunta eliminada correctamente",
    };
    deleteQuestionService.mockResolvedValue(mockResponse);

    const req = { validated: { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" } };
    const res = mockRes();

    await deleteQuestionController(req, res);

    expect(deleteQuestionService).toHaveBeenCalledWith(req.validated);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockResponse);
  });

  it("responde 404 si la pregunta a eliminar no existe", async () => {
    const error = new Error("Pregunta no encontrada");
    error.errorCode = errorCodes.NOT_FOUND;
    deleteQuestionService.mockRejectedValue(error);

    const req = { validated: { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" } };
    const res = mockRes();

    await deleteQuestionController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
