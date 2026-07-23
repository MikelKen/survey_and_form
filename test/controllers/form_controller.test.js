import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createFormController,
  getFormByIdController,
  listFormsByCreatorController,
  updateFormController,
  publishFormController,
  deleteFormController,
} from "../../src/controllers/form_controller.js";
import {
  createFormService,
  getFormById,
  listFormsByCreatorService,
  updateFormService,
  publishFormService,
  deleteFormService,
} from "../../src/services/form_service.js";
import { errorCodes } from "../../src/utils/errorCodes.js";

// 1. Mock de los servicios de formularios
vi.mock("../../src/services/form_service.js");

// 2. Helper para simular req/res de Express
const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

// ----------------------------------------------------------------------
// POST /forms -> createFormController
// ----------------------------------------------------------------------
describe("createFormController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 201 con el formulario creado exitosamente", async () => {
    const mockCreatedForm = {
      id: "f101",
      creator_id: "c101",
      title: "Encuesta 2026",
      state: "DRAFT",
    };

    createFormService.mockResolvedValue(mockCreatedForm);

    const req = {
      validated: { title: "Encuesta 2026", xclientid: "c101" },
      user: { id: "c101" },
    };
    const res = mockRes();

    await createFormController(req, res);

    expect(createFormService).toHaveBeenCalledWith("c101", req.validated);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(mockCreatedForm);
  });

  it("responde con error si la creación falla en el servicio", async () => {
    const error = new Error("No se pudo crear el formulario");
    error.errorCode = errorCodes.UNKNOWN;
    createFormService.mockRejectedValue(error);

    const req = { validated: { title: "Encuesta" } };
    const res = mockRes();

    await createFormController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ----------------------------------------------------------------------
// GET /forms/:id -> getFormByIdController
// ----------------------------------------------------------------------
describe("getFormByIdController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 200 con el formulario encontrado", async () => {
    const mockForm = {
      id: "f101",
      title: "Encuesta Satisfaccion",
      state: "DRAFT",
    };
    getFormById.mockResolvedValue(mockForm);

    const req = { validated: { id: "1f8720bb-bbdc-4e01-a550-bbbbe38de3b0" } };
    const res = mockRes();

    await getFormByIdController(req, res);

    expect(getFormById).toHaveBeenCalledWith(req.validated);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockForm);
  });

  it("responde 404 si el formulario no existe", async () => {
    const error = new Error("Formulario no encontrado");
    error.errorCode = errorCodes.NOT_FOUND;
    getFormById.mockRejectedValue(error);

    const req = { validated: { id: "1f8720bb-bbdc-4e01-a550-bbbbe38de3b0" } };
    const res = mockRes();

    await getFormByIdController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ----------------------------------------------------------------------
// GET /forms -> listFormsByCreatorController
// ----------------------------------------------------------------------
describe("listFormsByCreatorController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 200 con la lista paginada de formularios del creador", async () => {
    const mockPaginatedData = { items: [], total: 0, page: 1, perPage: 15 };
    listFormsByCreatorService.mockResolvedValue(mockPaginatedData);

    const req = {
      validated: { xclientid: "c101" },
      query: { page: "1", perPage: "15" },
    };
    const res = mockRes();

    await listFormsByCreatorController(req, res);

    expect(listFormsByCreatorService).toHaveBeenCalledWith("c101", req.query);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockPaginatedData);
  });
});

// ----------------------------------------------------------------------
// PUT /forms/:id -> updateFormController
// ----------------------------------------------------------------------
describe("updateFormController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 200 con el formulario actualizado", async () => {
    const mockUpdatedForm = {
      id: "f101",
      title: "Nuevo Titulo",
      state: "DRAFT",
    };
    updateFormService.mockResolvedValue(mockUpdatedForm);

    const req = {
      validated: {
        id: "1f8720bb-bbdc-4e01-a550-bbbbe38de3b0",
        title: "Nuevo Titulo",
      },
    };
    const res = mockRes();

    await updateFormController(req, res);

    expect(updateFormService).toHaveBeenCalledWith(req.validated);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockUpdatedForm);
  });

  it("responde 409 (Conflict) si intenta editar un formulario ya publicado", async () => {
    const error = new Error("No se puede modificar un formulario publicado");
    error.errorCode = errorCodes.CONFLICT;
    updateFormService.mockRejectedValue(error);

    const req = { validated: { id: "f101", title: "Titulo" } };
    const res = mockRes();

    await updateFormController(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });
});

// ----------------------------------------------------------------------
// POST /forms/:id/publish -> publishFormController
// ----------------------------------------------------------------------
describe("publishFormController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 200 con el formulario publicado", async () => {
    const mockPublishedForm = { id: "f101", state: "PUBLISHED" };
    publishFormService.mockResolvedValue(mockPublishedForm);

    const req = { validated: { id: "1f8720bb-bbdc-4e01-a550-bbbbe38de3b0" } };
    const res = mockRes();

    await publishFormController(req, res);

    expect(publishFormService).toHaveBeenCalledWith(req.validated);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockPublishedForm);
  });

  it("responde 400 (Bad Request) si el formulario no tiene preguntas para publicarse", async () => {
    const error = new Error("El formulario requiere al menos una pregunta");
    error.errorCode = errorCodes.VALIDATION;
    publishFormService.mockRejectedValue(error);

    const req = { validated: { id: "1f8720bb-bbdc-4e01-a550-bbbbe38de3b0" } };
    const res = mockRes();

    await publishFormController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ----------------------------------------------------------------------
// DELETE /forms/:id -> deleteFormController
// ----------------------------------------------------------------------
describe("deleteFormController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 200 tras eliminar el formulario", async () => {
    const mockResponse = {
      id: "f101",
      message: "Formulario eliminado correctamente",
    };
    deleteFormService.mockResolvedValue(mockResponse);

    const req = { validated: { id: "1f8720bb-bbdc-4e01-a550-bbbbe38de3b0" } };
    const res = mockRes();

    await deleteFormController(req, res);

    expect(deleteFormService).toHaveBeenCalledWith(req.validated);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockResponse);
  });

  it("responde 404 si intenta eliminar un formulario inexistente", async () => {
    const error = new Error("Formulario no encontrado");
    error.errorCode = errorCodes.NOT_FOUND;
    deleteFormService.mockRejectedValue(error);

    const req = { validated: { id: "1f8720bb-bbdc-4e01-a550-bbbbe38de3b0" } };
    const res = mockRes();

    await deleteFormController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
