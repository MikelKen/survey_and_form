import { describe, it, expect, vi, beforeEach } from "vitest";
import { randomUUID } from "crypto";
import {
  createFormService,
  getFormByIdService,
  listFormsByCreatorService,
  updateFormService,
  publishFormService,
  deleteFormService,
} from "../../src/services/form_service.js";
import {
  insertForm,
  selectFormById,
  selectFormsByCreator,
  updateForm,
  publishForm,
  deleteForm,
} from "../../src/repositories/form_repository.js";
import {
  countQuestionsByFormId,
  selectQuestionsByFormId,
} from "../../src/repositories/question_repository.js";
import { getCall, setCall, deleteKey } from "@tigo/redis-connector";

// Mock de la capa de acceso a datos (Repositories)
vi.mock("../../src/repositories/form_repository.js");
vi.mock("../../src/repositories/question_repository.js");

// Mock de la librería corporativa de Redis Connector
vi.mock("@tigo/redis-connector", () => ({
  getCall: vi.fn(),
  setCall: vi.fn(),
  deleteKey: vi.fn(),
}));

const FORM_ID = randomUUID();
const CREATOR_ID = randomUUID();

describe("Form Service - Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createFormService", () => {
    it("crea un formulario en DRAFT con el título normalizado (trim)", async () => {
      insertForm.mockResolvedValue({
        id: FORM_ID,
        creator_id: CREATOR_ID,
        title: "Encuesta de clima laboral",
        state: "DRAFT",
      });

      const result = await createFormService(CREATOR_ID, {
        title: "  Encuesta de clima laboral  ",
      });

      expect(insertForm).toHaveBeenCalledWith({
        creatorId: CREATOR_ID,
        title: "Encuesta de clima laboral",
      });
      expect(result.state).toBe("DRAFT");
    });

    it("lanza un error UNKNOWN si la inserción en base de datos falla", async () => {
      insertForm.mockRejectedValue(new Error("Database error"));

      await expect(
        createFormService(CREATOR_ID, { title: "Encuesta" }),
      ).rejects.toThrow(/No se pudo crear el formulario/);
    });
  });

  describe("getFormByIdService", () => {
    it("retorna el formulario directo desde Redis si está cacheado (Cache Hit)", async () => {
      const mockCachedForm = {
        id: FORM_ID,
        title: "Encuesta Cacheada",
        state: "PUBLISHED",
        questions: [],
      };

      // Simulamos que Redis devuelve el JSON cacheado
      getCall.mockResolvedValue(JSON.stringify(mockCachedForm));

      const result = await getFormByIdService({ id: FORM_ID });

      expect(getCall).toHaveBeenCalledWith(`form:${FORM_ID}:schema`);
      expect(selectFormById).not.toHaveBeenCalled();
      expect(result.title).toBe("Encuesta Cacheada");
    });

    it("consulta en PostgreSQL si no está en Redis y lo guarda en caché si está PUBLISHED", async () => {
      getCall.mockResolvedValue(null); // Cache Miss
      selectFormById.mockResolvedValue({
        id: FORM_ID,
        title: "Encuesta Publicada",
        state: "PUBLISHED",
      });
      selectQuestionsByFormId.mockResolvedValue([
        { id: "q1", question_text: "¿Pregunta 1?" },
      ]);

      const result = await getFormByIdService({ id: FORM_ID });

      expect(selectFormById).toHaveBeenCalledWith(FORM_ID);
      expect(selectQuestionsByFormId).toHaveBeenCalledWith(FORM_ID);
      expect(setCall).toHaveBeenCalledWith(
        `form:${FORM_ID}:schema`,
        expect.objectContaining({ id: FORM_ID }),
        300,
      );
      expect(result.questions).toHaveLength(1);
    });

    it("no guarda en Redis si el formulario consultado está en estado DRAFT", async () => {
      getCall.mockResolvedValue(null);
      selectFormById.mockResolvedValue({
        id: FORM_ID,
        title: "Encuesta Borrador",
        state: "DRAFT",
      });
      selectQuestionsByFormId.mockResolvedValue([]);

      await getFormByIdService({ id: FORM_ID });

      expect(setCall).not.toHaveBeenCalled();
    });

    it("lanza NOT_FOUND si el formulario no existe en la base de datos", async () => {
      getCall.mockResolvedValue(null);
      selectFormById.mockResolvedValue(undefined);

      await expect(getFormByIdService({ id: FORM_ID })).rejects.toThrow(
        /no encontrado/,
      );
    });
  });

  describe("listFormsByCreatorService", () => {
    it("pasa filtros y paginación correctamente al repositorio", async () => {
      selectFormsByCreator.mockResolvedValue({
        data: [{ id: FORM_ID, title: "Encuesta" }],
        total: 1,
        page: 1,
        perPage: 15,
      });

      const result = await listFormsByCreatorService(CREATOR_ID, {
        title: "Encuesta",
        state: "DRAFT",
        page: 1,
        perPage: 15,
      });

      expect(selectFormsByCreator).toHaveBeenCalledWith(
        CREATOR_ID,
        { title: "Encuesta", state: "DRAFT" },
        expect.objectContaining({ page: 1, perPage: 15 }),
      );
      expect(result.data).toHaveLength(1);
    });
  });

  describe("updateFormService", () => {
    it("actualiza el título en DRAFT e invalida la caché en Redis", async () => {
      selectFormById.mockResolvedValue({ id: FORM_ID, state: "DRAFT" });
      updateForm.mockResolvedValue({
        id: FORM_ID,
        title: "Nuevo Título",
        state: "DRAFT",
      });

      const result = await updateFormService({
        id: FORM_ID,
        title: "  Nuevo Título  ",
      });

      expect(updateForm).toHaveBeenCalledWith(FORM_ID, {
        title: "Nuevo Título",
      });
      expect(deleteKey).toHaveBeenCalledWith(`form:${FORM_ID}:schema`);
      expect(result.title).toBe("Nuevo Título");
    });

    it("lanza NOT_FOUND si el formulario a actualizar no existe", async () => {
      selectFormById.mockResolvedValue(undefined);

      await expect(
        updateFormService({ id: FORM_ID, title: "Nuevo Título" }),
      ).rejects.toThrow(/no encontrado/);
    });

    it("lanza CONFLICT si se intenta actualizar un formulario ya PUBLISHED", async () => {
      selectFormById.mockResolvedValue({ id: FORM_ID, state: "PUBLISHED" });

      await expect(
        updateFormService({ id: FORM_ID, title: "Nuevo Título" }),
      ).rejects.toThrow(/ya se encuentra publicado/);
    });
  });

  describe("publishFormService", () => {
    it("publica el formulario si tiene al menos 1 pregunta e invalida caché", async () => {
      selectFormById.mockResolvedValue({ id: FORM_ID, state: "DRAFT" });
      countQuestionsByFormId.mockResolvedValue(2);
      publishForm.mockResolvedValue({ id: FORM_ID, state: "PUBLISHED" });

      const result = await publishFormService({ id: FORM_ID });

      expect(publishForm).toHaveBeenCalledWith(FORM_ID);
      expect(deleteKey).toHaveBeenCalledWith(`form:${FORM_ID}:schema`);
      expect(result.state).toBe("PUBLISHED");
    });

    it("lanza NOT_FOUND si el formulario a publicar no existe", async () => {
      selectFormById.mockResolvedValue(undefined);

      await expect(publishFormService({ id: FORM_ID })).rejects.toThrow(
        /no encontrado/,
      );
    });

    it("lanza CONFLICT si el formulario ya está en estado PUBLISHED", async () => {
      selectFormById.mockResolvedValue({ id: FORM_ID, state: "PUBLISHED" });

      await expect(publishFormService({ id: FORM_ID })).rejects.toThrow(
        /ya se encuentra publicado/,
      );
    });

    it("lanza VALIDATION si el formulario no tiene preguntas creadas (RF-27.2)", async () => {
      selectFormById.mockResolvedValue({ id: FORM_ID, state: "DRAFT" });
      countQuestionsByFormId.mockResolvedValue(0);

      await expect(publishFormService({ id: FORM_ID })).rejects.toThrow(
        /al menos una pregunta/,
      );
      expect(publishForm).not.toHaveBeenCalled();
    });
  });

  describe("deleteFormService", () => {
    it("elimina el formulario por su ID si existe", async () => {
      selectFormById.mockResolvedValue({ id: FORM_ID, state: "DRAFT" });
      deleteForm.mockResolvedValue({ id: FORM_ID });

      const result = await deleteFormService({ id: FORM_ID });

      expect(deleteForm).toHaveBeenCalledWith(FORM_ID);
      expect(deleteKey).toHaveBeenCalledWith(`form:${FORM_ID}:schema`);
      expect(result.message).toMatch(/eliminado correctamente/);
    });

    it("lanza NOT_FOUND si el formulario a eliminar no existe", async () => {
      selectFormById.mockResolvedValue(undefined);

      await expect(deleteFormService({ id: FORM_ID })).rejects.toThrow(
        /no encontrado/,
      );
      expect(deleteForm).not.toHaveBeenCalled();
    });
  });
});
