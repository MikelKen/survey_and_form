import { logger } from "@tigo/logger";
import { errorCodes, setError } from "../utils/errorCodes.js";
import {
  insertForm,
  selectFormById,
  selectFormsByCreator,
  updateForm,
  publishForm,
  deleteForm,
} from "../repositories/form_repository.js";
import {
  countQuestionsByFormId,
  selectQuestionsByFormId,
} from "../repositories/question_repository.js";
import { getCall, setCall, deleteKey } from "@tigo/redis-connector";

const CACHE_TTL = 300;

/**
 * Crea un nuevo formulario en estado 'DRAFT'.
 */
export const createFormService = async (creatorId, data) => {
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
 * Obtiene un formulario específico por su ID.
 */
export const getFormByIdService = async (data) => {
  const { id } = data;
  const cacheKey = `form:${id}:schema`;

  // 1. Intentar obtener desde Redis
  try {
    const cachedForm = await getCall(cacheKey);
    if (cachedForm) {
      logger.info({ "[REDIS CACHE HIT]": cacheKey });
      return typeof cachedForm === "string"
        ? JSON.parse(cachedForm)
        : cachedForm;
    }
  } catch (err) {
    logger.error({ "[REDIS GET ERROR]": err.message });
  }

  // 2. Consultar en PostgreSQL si no está en caché
  logger.info({ getFormByIdService: { "[FORM_ID]": id } });
  const form = await selectFormById(id);
  if (!form) {
    throw setError(`Formulario ${id} no encontrado`, errorCodes.NOT_FOUND);
  }

  // 3. Obtener sus preguntas
  const questions = await selectQuestionsByFormId(id);
  const fullForm = { ...form, questions };

  // 4. Si el formulario está publicado, guardar en Redis
  if (form.state === "PUBLISHED") {
    try {
      await setCall(cacheKey, fullForm, CACHE_TTL);
    } catch (err) {
      logger.error({ "[REDIS SET ERROR]": err.message });
    }
  }

  return fullForm;
};

/**
 * Lista los formularios creados por un usuario específico.
 */
export const listFormsByCreatorService = async (creatorId, data) => {
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
 * Actualiza el título de un formulario.
 * Solo se permite la edición si el formulario sigue en estado 'DRAFT'.
 */
export const updateFormService = async (data) => {
  const { id, title } = data;
  logger.info({ updateFormService: { "[FORM_ID]": id } });

  const existingForm = await selectFormById(id);
  if (!existingForm) {
    throw setError(`Formulario ${id} no encontrado`, errorCodes.NOT_FOUND);
  }
  if (existingForm.state !== "DRAFT") {
    throw setError(
      "No se puede modificar un formulario que ya se encuentra publicado",
      errorCodes.CONFLICT,
    );
  }

  const updatedForm = await updateForm(id, { title: title.trim() });

  // Invalidar caché en Redis por seguridad
  try {
    await deleteKey(`form:${id}:schema`);
  } catch (err) {
    logger.error({ "[REDIS DELETE ERROR]": err.message });
  }
  return updatedForm;
};

/**
 * Publica un formulario (DRAFT -> PUBLISHED).
 */
export const publishFormService = async (data) => {
  const { id } = data;
  logger.info({ publishFormService: { "[FORM_ID]": id } });

  const existingForm = await selectFormById(id);
  if (!existingForm) {
    throw setError(`Formulario ${id} no encontrado`, errorCodes.NOT_FOUND);
  }

  if (existingForm.state === "PUBLISHED") {
    throw setError(
      "El formulario ya se encuentra publicado",
      errorCodes.CONFLICT,
    );
  }

  const totalQuestions = await countQuestionsByFormId(id);
  if (totalQuestions === 0) {
    throw setError(
      "El formulario requiere al menos una pregunta para poder ser publicado",
      errorCodes.VALIDATION,
    );
  }

  const publishedForm = await publishForm(id);

  // Limpiar cualquier residuo de caché
  try {
    await deleteKey(`form:${id}:schema`);
  } catch (err) {
    logger.error({ "[REDIS DELETE ERROR]": err.message });
  }
  return publishedForm;
};

/**
 * Elimina un formulario por su ID.
 */
export const deleteFormService = async (data) => {
  const { id } = data;

  logger.info({ deleteFormService: { "[FORM_ID]": id } });

  const existingForm = await selectFormById(id);
  if (!existingForm) {
    throw setError(`Formulario ${id} no encontrado`, errorCodes.NOT_FOUND);
  }

  const result = await deleteForm(id);

  // Limpiar caché
  try {
    await deleteKey(`form:${id}:schema`);
  } catch (err) {
    logger.error({ "[REDIS DELETE ERROR]": err.message });
  }

  return { id: result.id, message: "Formulario eliminado correctamente" };
};
