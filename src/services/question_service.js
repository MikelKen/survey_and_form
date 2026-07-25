import { logger } from "@tigo/logger";
import { errorCodes, setError } from "../utils/errorCodes.js";
import {
  insertQuestion,
  selectQuestionById,
  selectQuestionsByFormId,
  updateQuestion,
  deleteQuestion,
} from "../repositories/question_repository.js";
import { selectFormById } from "../repositories/form_repository.js";
import { deleteKey } from "@tigo/redis-connector";

/**
 * Agrega una nueva pregunta a un formulario
 */
export const createQuestionService = async (data) => {
  logger.info({
    createQuestionService: { "[FORM_ID]": data.form_id, "[TYPE]": data.type },
  });

  // 1. Verificar existencia del formulario
  const form = await selectFormById(data.form_id);
  if (!form) {
    throw setError(
      `El formulario ${data.form_id} no existe`,
      errorCodes.NOT_FOUND,
    );
  }

  if (form.state !== "DRAFT") {
    throw setError(
      "No se pueden agregar preguntas a un formulario que ya esta publicado",
      errorCodes.CONFLICT,
    );
  }

  try {
    const newQuestion = await insertQuestion({
      formId: data.form_id,
      questionText: data.question_text.trim(),
      type: data.type,
      required: data.required,
      orderIndex: data.order_index,
    });

    // Invalidar cache en Redis
    try {
      await deleteKey(`form:${data.form_id}:schema`);
    } catch (err) {
      logger.error({ "[REDIS DELETE ERROR]": err.message });
    }

    return newQuestion;
  } catch (err) {
    logger.error({ createQuestionService: { error: err.message } });
    throw setError("No se pudo crear la pregunta", errorCodes.UNKNOWN);
  }
};

/**
 * Obtiene una pregunta por su ID
 */
export const getQuestionByIdService = async (data) => {
  logger.info({ getQuestionByIdService: { "[QUESTION_ID]": data.id } });

  const question = await selectQuestionById(data.id);
  if (!question) {
    throw setError(`Pregunta ${data.id} no encontrada`, errorCodes.NOT_FOUND);
  }

  return question;
};

/**
 * Lista todas las preguntas asociadas a un formulario
 */
export const getQuestionsByFormService = async (data) => {
  logger.info({ getQuestionsByFormService: { "[FORM_ID]": data.form_id } });

  const form = await selectFormById(data.form_id);
  if (!form) {
    throw setError(
      `El formulario ${data.form_id} no existe`,
      errorCodes.NOT_FOUND,
    );
  }

  return await selectQuestionsByFormId(data.form_id);
};

/**
 * Actualiza una pregunta existente
 */
export const updateQuestionService = async (data) => {
  logger.info({ updateQuestionService: { "[QUESTION_ID]": data.id } });

  const existingQuestion = await selectQuestionById(data.id);
  if (!existingQuestion) {
    throw setError(`Pregunta ${data.id} no encontrada`, errorCodes.NOT_FOUND);
  }

  const form = await selectFormById(existingQuestion.form_id);
  if (form?.state !== "DRAFT") {
    throw setError(
      "No se puede editar una pregunta de un formulario publicado",
      errorCodes.CONFLICT,
    );
  }

  const updatedData = {
    questionText: data.question_text
      ? data.question_text.trim()
      : existingQuestion.question_text,
    type: data.type ?? existingQuestion.type,
    required: data.required ?? existingQuestion.required,
    orderIndex: data.order_index ?? existingQuestion.order_index,
  };

  const updatedQuestion = await updateQuestion(data.id, updatedData);

  try {
    await deleteKey(`form:${existingQuestion.form_id}:schema`);
  } catch (err) {
    logger.error({ "[REDIS DELETE ERROR]": err.message });
  }

  return updatedQuestion;
};

/**
 * Elimina una pregunta por su ID
 */
export const deleteQuestionService = async (data) => {
  logger.info({ deleteQuestionService: { "[QUESTION_ID]": data.id } });

  const existingQuestion = await selectQuestionById(data.id);
  if (!existingQuestion) {
    throw setError(`Pregunta ${data.id} no encontrada`, errorCodes.NOT_FOUND);
  }

  const form = await selectFormById(existingQuestion.form_id);
  if (form?.state !== "DRAFT") {
    throw setError(
      "No se puede eliminar una pregunta de un formulario publicado",
      errorCodes.CONFLICT,
    );
  }

  const result = await deleteQuestion(data.id);

  try {
    await deleteKey(`form:${existingQuestion.form_id}:schema`);
  } catch (err) {
    logger.error({ "[REDIS DELETE ERROR]": err.message });
  }

  return { id: result.id, message: "Pregunta eliminada correctamente" };
};
