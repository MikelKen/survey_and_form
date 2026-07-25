import { describe, it, expect, vi, beforeEach } from "vitest";
import { randomUUID } from "crypto";
import {
  createQuestionService,
  getQuestionByIdService,
  getQuestionsByFormService,
  updateQuestionService,
  deleteQuestionService,
} from "../../src/services/question_service.js";
import {
  insertQuestion,
  selectQuestionById,
  selectQuestionsByFormId,
  updateQuestion,
  deleteQuestion,
} from "../../src/repositories/question_repository.js";
import { selectFormById } from "../../src/repositories/form_repository.js";
import { deleteKey } from "@tigo/redis-connector";

// Mockear repositorios
vi.mock("../../src/repositories/question_repository.js");
vi.mock("../../src/repositories/form_repository.js");

// Mockear conector de Redis
vi.mock("@tigo/redis-connector", () => ({
  deleteKey: vi.fn(),
}));

const FORM_ID = randomUUID();
const QUESTION_ID = randomUUID();

describe("Question Service - Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // createQuestionService
  describe("createQuestionService", () => {
    it("crea la pregunta si el formulario existe y esta en DRAFT", async () => {
      selectFormById.mockResolvedValue({ id: FORM_ID, state: "DRAFT" });
      insertQuestion.mockResolvedValue({
        id: QUESTION_ID,
        form_id: FORM_ID,
        question_text: "Cual es tu edad?",
        type: "NUMBER",
      });

      const result = await createQuestionService({
        form_id: FORM_ID,
        question_text: "  Cual es tu edad?  ",
        type: "NUMBER",
        required: true,
        order_index: 1,
      });

      expect(insertQuestion).toHaveBeenCalledWith({
        formId: FORM_ID,
        questionText: "Cual es tu edad?",
        type: "NUMBER",
        required: true,
        orderIndex: 1,
      });
      expect(deleteKey).toHaveBeenCalledWith(`form:${FORM_ID}:schema`);
      expect(result.id).toBe(QUESTION_ID);
    });

    it("lanza NOT_FOUND si el formulario no existe", async () => {
      selectFormById.mockResolvedValue(undefined);

      await expect(
        createQuestionService({
          form_id: FORM_ID,
          question_text: "Pregunta",
          type: "TEXT",
        }),
      ).rejects.toThrow(/no existe/);
    });

    it("lanza CONFLICT si el formulario ya esta PUBLISHED", async () => {
      selectFormById.mockResolvedValue({ id: FORM_ID, state: "PUBLISHED" });

      await expect(
        createQuestionService({
          form_id: FORM_ID,
          question_text: "Pregunta",
          type: "TEXT",
        }),
      ).rejects.toThrow(/ya esta publicado/);
      expect(insertQuestion).not.toHaveBeenCalled();
    });

    it("lanza UNKNOWN si insertQuestion falla", async () => {
      selectFormById.mockResolvedValue({ id: FORM_ID, state: "DRAFT" });
      insertQuestion.mockRejectedValue(new Error("db down"));

      await expect(
        createQuestionService({
          form_id: FORM_ID,
          question_text: "Pregunta",
          type: "TEXT",
        }),
      ).rejects.toThrow(/No se pudo crear la pregunta/);
    });
  });

  // getQuestionByIdService
  describe("getQuestionByIdService", () => {
    it("retorna la pregunta si existe", async () => {
      selectQuestionById.mockResolvedValue({
        id: QUESTION_ID,
        question_text: "Edad",
      });

      const result = await getQuestionByIdService({ id: QUESTION_ID });

      expect(result.id).toBe(QUESTION_ID);
    });

    it("lanza NOT_FOUND si la pregunta no existe", async () => {
      selectQuestionById.mockResolvedValue(undefined);

      await expect(getQuestionByIdService({ id: QUESTION_ID })).rejects.toThrow(
        /no encontrada/,
      );
    });
  });

  // getQuestionsByFormService
  describe("getQuestionsByFormService", () => {
    it("retorna las preguntas si el formulario existe", async () => {
      selectFormById.mockResolvedValue({ id: FORM_ID, state: "DRAFT" });
      selectQuestionsByFormId.mockResolvedValue([{ id: QUESTION_ID }]);

      const result = await getQuestionsByFormService({ form_id: FORM_ID });

      expect(result).toHaveLength(1);
    });

    it("lanza NOT_FOUND si el formulario no existe", async () => {
      selectFormById.mockResolvedValue(undefined);

      await expect(
        getQuestionsByFormService({ form_id: FORM_ID }),
      ).rejects.toThrow(/no existe/);
    });
  });

  // updateQuestionService
  describe("updateQuestionService", () => {
    it("actualiza la pregunta manteniendo valores previos si no se envian", async () => {
      selectQuestionById.mockResolvedValue({
        id: QUESTION_ID,
        form_id: FORM_ID,
        question_text: "Texto original",
        type: "TEXT",
        required: false,
        order_index: 2,
      });
      selectFormById.mockResolvedValue({ id: FORM_ID, state: "DRAFT" });
      updateQuestion.mockResolvedValue({
        id: QUESTION_ID,
        question_text: "Texto nuevo",
      });

      const result = await updateQuestionService({
        id: QUESTION_ID,
        question_text: "  Texto nuevo  ",
      });

      expect(updateQuestion).toHaveBeenCalledWith(QUESTION_ID, {
        questionText: "Texto nuevo",
        type: "TEXT",
        required: false,
        orderIndex: 2,
      });
      expect(deleteKey).toHaveBeenCalledWith(`form:${FORM_ID}:schema`);
      expect(result.question_text).toBe("Texto nuevo");
    });

    it("lanza NOT_FOUND si la pregunta no existe", async () => {
      selectQuestionById.mockResolvedValue(undefined);

      await expect(
        updateQuestionService({ id: QUESTION_ID, question_text: "X" }),
      ).rejects.toThrow(/no encontrada/);
    });

    it("lanza CONFLICT si el formulario padre ya esta PUBLISHED", async () => {
      selectQuestionById.mockResolvedValue({
        id: QUESTION_ID,
        form_id: FORM_ID,
      });
      selectFormById.mockResolvedValue({ id: FORM_ID, state: "PUBLISHED" });

      await expect(
        updateQuestionService({ id: QUESTION_ID, question_text: "X" }),
      ).rejects.toThrow(/formulario publicado/);
      expect(updateQuestion).not.toHaveBeenCalled();
    });

    it("lanza CONFLICT si el formulario padre ya no existe", async () => {
      selectQuestionById.mockResolvedValue({
        id: QUESTION_ID,
        form_id: FORM_ID,
      });
      selectFormById.mockResolvedValue(undefined);

      await expect(
        updateQuestionService({ id: QUESTION_ID, question_text: "X" }),
      ).rejects.toThrow(/formulario publicado/);
    });
  });

  // deleteQuestionService
  describe("deleteQuestionService", () => {
    it("elimina la pregunta si el formulario padre esta en DRAFT", async () => {
      selectQuestionById.mockResolvedValue({
        id: QUESTION_ID,
        form_id: FORM_ID,
      });
      selectFormById.mockResolvedValue({ id: FORM_ID, state: "DRAFT" });
      deleteQuestion.mockResolvedValue({ id: QUESTION_ID });

      const result = await deleteQuestionService({ id: QUESTION_ID });

      expect(deleteKey).toHaveBeenCalledWith(`form:${FORM_ID}:schema`);
      expect(result.message).toMatch(/eliminada correctamente/);
    });

    it("lanza NOT_FOUND si la pregunta no existe", async () => {
      selectQuestionById.mockResolvedValue(undefined);

      await expect(deleteQuestionService({ id: QUESTION_ID })).rejects.toThrow(
        /no encontrada/,
      );
    });

    it("lanza CONFLICT si el formulario padre ya esta PUBLISHED", async () => {
      selectQuestionById.mockResolvedValue({
        id: QUESTION_ID,
        form_id: FORM_ID,
      });
      selectFormById.mockResolvedValue({ id: FORM_ID, state: "PUBLISHED" });

      await expect(deleteQuestionService({ id: QUESTION_ID })).rejects.toThrow(
        /formulario publicado/,
      );
      expect(deleteQuestion).not.toHaveBeenCalled();
    });
  });
});
