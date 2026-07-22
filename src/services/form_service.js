import { logger } from "@tigo/logger";
import { errorCodes, setError } from "../utils/errorCodes.js";
import {
  createFormSchema,
  updateFormSchema,
  publishFormSchema,
  listFormsFilterSchema,
} from "../schemas/form_schema.js";
import {
  insertForm,
  selectFormById,
  selectFormsByCreator,
  updateForm,
  publishForm,
  deleteForm,
} from "../repositories/form_repository.js";
import { countQuestionsByFormId } from "../repositories/question_repository.js";

/**
 * Parsea y valida un payload contra un schema de Zod.
 * Lanza un error estructurado si la validacion falla.
 */
const parseOrThrow = (schema, payload) => {
  const result = schema.safeParse(payload);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(" | ");
    throw setError(`Payload invalido: ${details}`, errorCodes.VALIDATION);
  }

  return result.data;
};

/**
 * Crea un nuevo formulario en estado 'DRAFT'.
 */
export const createFormService = async (creatorId, payload) => {
  const data = parseOrThrow(createFormSchema, payload);

  logger.info({
    createFormService: { "[CREATOR_ID]": creatorId, "[TITLE]": data.title },
  });

  try {
    const newForm = await insertForm({
      creatorId,
      title: data.title.trim(),
    });
    return newForm;
  } catch (err) {
    logger.error({ createFormService: { error: err.message } });
    throw setError("No se pudo crear el formulario", errorCodes.UNKNOWN);
  }
};

/**
 * Obtiene un formulario especifico por su ID.
 */
export const getFormById = async (payload) => {
  const data = parseOrThrow(publishFormSchema, payload);

  logger.info({ getFormByIdService: { "[FORM_ID]": data.id } });

  const form = await selectFormById(data.id);
  if (!form) {
    throw setError(`Formulario ${data.id} no encontrado`, errorCodes.NOT_FOUND);
  }

  return form;
};

/**
 * Lista los formularios creados por un usuario especifico con filtros y paginacion.
 */
export const listFormsByCreatorService = async (creatorId, rawQuery) => {
  const data = parseOrThrow(listFormsFilterSchema, rawQuery);

  logger.info({
    listFormsByCreatorService: {
      "[CREATOR_ID]": creatorId,
      "[FILTERS]": { title: data.title, state: data.state },
    },
  });

  const filters = { title: data.title, state: data.state };
  const rawPagination = {
    page: data.page,
    perPage: data.perPage,
    sort: data.sort,
    order: data.order,
  };

  return await selectFormsByCreator(creatorId, filters, rawPagination);
};

/**
 * Actualiza el titulo de un formulario.
 * Solo se permite la edicion si el formulario sigue en estado 'DRAFT'.
 */
export const updateFormService = async (payload) => {
  const data = parseOrThrow(updateFormSchema, payload);

  logger.info({ updateFormService: { "[FORM_ID]": data.id } });

  // 1. Verificar existencia del formulario
  const existingForm = await selectFormById(data.id);
  if (!existingForm) {
    throw setError(`Formulario ${data.id} no encontrado`, errorCodes.NOT_FOUND);
  }

  // 2. Regla de negocio: Un formulario publicado no se puede modificar
  if (existingForm.state !== "DRAFT") {
    throw setError(
      "No se puede modificar un formulario que ya se encuentra publicado",
      errorCodes.CONFLICT,
    );
  }

  const updatedForm = await updateForm(data.id, { title: data.title.trim() });
  return updatedForm;
};

/**
 * Publica un formulario (Transicion DRAFT -> PUBLISHED).
 */
export const publishFormService = async (payload) => {
  const data = parseOrThrow(publishFormSchema, payload);

  logger.info({ publishFormService: { "[FORM_ID]": data.id } });

  // 1. Verificar existencia
  const existingForm = await selectFormById(data.id);
  if (!existingForm) {
    throw setError(`Formulario ${data.id} no encontrado`, errorCodes.NOT_FOUND);
  }

  // 2. Validar que no este publicado previamente
  if (existingForm.state === "PUBLISHED") {
    throw setError(
      "El formulario ya se encuentra publicado",
      errorCodes.CONFLICT,
    );
  }

  // 3. Regla de negocio RF-27.2: Debe tener al menos una pregunta para publicarse
  const totalQuestions = await countQuestionsByFormId(data.id);
  if (totalQuestions === 0) {
    throw setError(
      "El formulario requiere al menos una pregunta para poder ser publicado",
      errorCodes.VALIDATION,
    );
  }

  // 4. Cambiar estado a PUBLISHED
  const publishedForm = await publishForm(data.id);
  return publishedForm;
};

/**
 * Elimina un formulario por su ID.
 */
export const deleteFormService = async (payload) => {
  const data = parseOrThrow(publishFormSchema, payload);

  logger.info({ deleteFormService: { "[FORM_ID]": data.id } });

  const existingForm = await selectFormById(data.id);
  if (!existingForm) {
    throw setError(`Formulario ${data.id} no encontrado`, errorCodes.NOT_FOUND);
  }

  const result = await deleteForm(data.id);
  return { id: result.id, message: "Formulario eliminado correctamente" };
};
