import { describe, it, expect, vi, beforeEach } from "vitest";
import { randomUUID } from "crypto";
import {
  createFormService,
  getFormById,
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
import { countQuestionsByFormId } from "../../src/repositories/question_repository.js";

vi.mock("../../src/repositories/form_repository.js");
vi.mock("../../src/repositories/question_repository.js");

const FORM_ID = randomUUID();
const CREATOR_ID = randomUUID();

describe("createFormService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("crea un formulario en DRAFT con el titulo normalizado", async () => {
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

  it("lanza VALIDATION si el titulo esta vacio", async () => {
    await expect(createFormService(CREATOR_ID, { title: "" })).rejects.toThrow(
      /Payload invalido/,
    );
    expect(insertForm).not.toHaveBeenCalled();
  });

  it("lanza UNKNOWN si insertForm falla", async () => {
    insertForm.mockRejectedValue(new Error("db down"));

    await expect(
      createFormService(CREATOR_ID, { title: "Encuesta" }),
    ).rejects.toThrow(/No se pudo crear el formulario/);
  });
});

describe("getFormById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna el formulario si existe", async () => {
    selectFormById.mockResolvedValue({
      id: FORM_ID,
      title: "Encuesta",
      state: "DRAFT",
    });

    const result = await getFormById({ id: FORM_ID });

    expect(result.id).toBe(FORM_ID);
  });

  it("lanza NOT_FOUND si el formulario no existe", async () => {
    selectFormById.mockResolvedValue(undefined);

    await expect(getFormById({ id: FORM_ID })).rejects.toThrow(/no encontrado/);
  });
});

describe("listFormsByCreatorService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pasa filtros y paginacion correctamente al repository", async () => {
    selectFormsByCreator.mockResolvedValue({
      data: [{ id: FORM_ID, title: "Encuesta" }],
      total: 1,
      page: 1,
      perPage: 15,
    });

    const result = await listFormsByCreatorService(CREATOR_ID, {
      state: "DRAFT",
    });

    expect(selectFormsByCreator).toHaveBeenCalledWith(
      CREATOR_ID,
      { title: undefined, state: "DRAFT" },
      expect.objectContaining({ page: 1, perPage: 15 }),
    );
    expect(result.data).toHaveLength(1);
  });
});

describe("updateFormService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("actualiza el titulo si el formulario esta en DRAFT", async () => {
    selectFormById.mockResolvedValue({ id: FORM_ID, state: "DRAFT" });
    updateForm.mockResolvedValue({
      id: FORM_ID,
      title: "Nuevo titulo",
      state: "DRAFT",
    });

    const result = await updateFormService({
      id: FORM_ID,
      title: "  Nuevo titulo  ",
    });

    expect(updateForm).toHaveBeenCalledWith(FORM_ID, { title: "Nuevo titulo" });
    expect(result.title).toBe("Nuevo titulo");
  });

  it("lanza NOT_FOUND si el formulario no existe", async () => {
    selectFormById.mockResolvedValue(undefined);

    await expect(
      updateFormService({ id: FORM_ID, title: "Nuevo titulo" }),
    ).rejects.toThrow(/no encontrado/);
  });

  it("lanza CONFLICT si el formulario ya esta PUBLISHED", async () => {
    selectFormById.mockResolvedValue({ id: FORM_ID, state: "PUBLISHED" });

    await expect(
      updateFormService({ id: FORM_ID, title: "Nuevo titulo" }),
    ).rejects.toThrow(/ya se encuentra publicado/);
  });
});

describe("publishFormService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("publica el formulario si tiene al menos una pregunta", async () => {
    selectFormById.mockResolvedValue({ id: FORM_ID, state: "DRAFT" });
    countQuestionsByFormId.mockResolvedValue(3);
    publishForm.mockResolvedValue({ id: FORM_ID, state: "PUBLISHED" });

    const result = await publishFormService({ id: FORM_ID });

    expect(result.state).toBe("PUBLISHED");
  });

  it("lanza NOT_FOUND si el formulario no existe", async () => {
    selectFormById.mockResolvedValue(undefined);

    await expect(publishFormService({ id: FORM_ID })).rejects.toThrow(
      /no encontrado/,
    );
  });

  it("lanza CONFLICT si ya esta publicado", async () => {
    selectFormById.mockResolvedValue({ id: FORM_ID, state: "PUBLISHED" });

    await expect(publishFormService({ id: FORM_ID })).rejects.toThrow(
      /ya se encuentra publicado/,
    );
  });

  it("lanza VALIDATION si no tiene preguntas (RF-27.2)", async () => {
    selectFormById.mockResolvedValue({ id: FORM_ID, state: "DRAFT" });
    countQuestionsByFormId.mockResolvedValue(0);

    await expect(publishFormService({ id: FORM_ID })).rejects.toThrow(
      /al menos una pregunta/,
    );
    expect(publishForm).not.toHaveBeenCalled();
  });
});

describe("deleteFormService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("elimina el formulario si existe", async () => {
    selectFormById.mockResolvedValue({ id: FORM_ID, state: "DRAFT" });
    deleteForm.mockResolvedValue({ id: FORM_ID });

    const result = await deleteFormService({ id: FORM_ID });

    expect(result.message).toMatch(/eliminado correctamente/);
  });

  it("lanza NOT_FOUND si el formulario no existe", async () => {
    selectFormById.mockResolvedValue(undefined);

    await expect(deleteFormService({ id: FORM_ID })).rejects.toThrow(
      /no encontrado/,
    );
    expect(deleteForm).not.toHaveBeenCalled();
  });
});
