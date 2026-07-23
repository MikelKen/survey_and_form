// test/services/question_service.test.js
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

vi.mock("../../src/repositories/question_repository.js");
vi.mock("../../src/repositories/form_repository.js");

const FORM_ID = randomUUID();
const QUESTION_ID = randomUUID();

describe("createQuestionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

describe("getQuestionByIdService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

describe("getQuestionsByFormService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

describe("updateQuestionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
      type: "TEXT", // se mantiene el previo
      required: false, // se mantiene el previo
      orderIndex: 2, // se mantiene el previo
    });
    expect(result.question_text).toBe("Texto nuevo");
  });

  it("lanza NOT_FOUND si la pregunta no existe", async () => {
    selectQuestionById.mockResolvedValue(undefined);

    await expect(
      updateQuestionService({ id: QUESTION_ID, question_text: "X" }),
    ).rejects.toThrow(/no encontrada/);
  });

  it("lanza CONFLICT si el formulario padre ya esta PUBLISHED", async () => {
    selectQuestionById.mockResolvedValue({ id: QUESTION_ID, form_id: FORM_ID });
    selectFormById.mockResolvedValue({ id: FORM_ID, state: "PUBLISHED" });

    await expect(
      updateQuestionService({ id: QUESTION_ID, question_text: "X" }),
    ).rejects.toThrow(/formulario publicado/);
    expect(updateQuestion).not.toHaveBeenCalled();
  });

  it("lanza CONFLICT si el formulario padre ya no existe", async () => {
    selectQuestionById.mockResolvedValue({ id: QUESTION_ID, form_id: FORM_ID });
    selectFormById.mockResolvedValue(undefined);

    await expect(
      updateQuestionService({ id: QUESTION_ID, question_text: "X" }),
    ).rejects.toThrow(/formulario publicado/);
  });
});

describe("deleteQuestionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("elimina la pregunta si el formulario padre esta en DRAFT", async () => {
    selectQuestionById.mockResolvedValue({ id: QUESTION_ID, form_id: FORM_ID });
    selectFormById.mockResolvedValue({ id: FORM_ID, state: "DRAFT" });
    deleteQuestion.mockResolvedValue({ id: QUESTION_ID });

    const result = await deleteQuestionService({ id: QUESTION_ID });

    expect(result.message).toMatch(/eliminada correctamente/);
  });

  it("lanza NOT_FOUND si la pregunta no existe", async () => {
    selectQuestionById.mockResolvedValue(undefined);

    await expect(deleteQuestionService({ id: QUESTION_ID })).rejects.toThrow(
      /no encontrada/,
    );
  });

  it("lanza CONFLICT si el formulario padre ya esta PUBLISHED", async () => {
    selectQuestionById.mockResolvedValue({ id: QUESTION_ID, form_id: FORM_ID });
    selectFormById.mockResolvedValue({ id: FORM_ID, state: "PUBLISHED" });

    await expect(deleteQuestionService({ id: QUESTION_ID })).rejects.toThrow(
      /formulario publicado/,
    );
    expect(deleteQuestion).not.toHaveBeenCalled();
  });
});
