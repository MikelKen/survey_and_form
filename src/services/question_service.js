import { logger } from "@tigo/logger";
import { errorCodes, setError } from "../utils/errorCodes.js";
import {
  createQuestionSchema,
  updateQuestionSchema,
  questionIdParamSchema,
  listQuestionsParamSchema,
} from "../schemas/question_schema.js";
import {
  insertQuestion,
  selectQuestionById,
  selectQuestionsByFormId,
  updateQuestion,
  deleteQuestion,
} from "../repositories/question_repository.js";
import { selectFormById } from "../repositories/form_repository.js";

/**
 * Parsea y valida un payload contra un esquema Zod
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
 * Agrega una nueva pregunta a un formulario
 * Regla: El formulario debe existir y estar en estado DRAFT
 */
export const createQuestionService = async (payload) => {
  const data = parseOrThrow(createQuestionSchema, payload);

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
    return newQuestion;
  } catch (err) {
    logger.error({ createQuestionService: { error: err.message } });
    throw setError("No se pudo crear la pregunta", errorCodes.UNKNOWN);
  }
};

/**
 * Obtiene una pregunta por su ID
 */
export const getQuestionByIdService = async (payload) => {
  const data = parseOrThrow(questionIdParamSchema, payload);

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
export const getQuestionsByFormService = async (payload) => {
  const data = parseOrThrow(listQuestionsParamSchema, payload);

  logger.info({ getQuestionsByFormService: { "[FORM_ID]": data.form_id } });

  // Verificar que el formulario exista
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
 * Regla: El formulario asociado debe seguir en estado DRAFT
 */
export const updateQuestionService = async (payload) => {
  const data = parseOrThrow(updateQuestionSchema, payload);

  logger.info({ updateQuestionService: { "[QUESTION_ID]": data.id } });

  // 1. Verificar existencia de la pregunta
  const existingQuestion = await selectQuestionById(data.id);
  if (!existingQuestion) {
    throw setError(`Pregunta ${data.id} no encontrada`, errorCodes.NOT_FOUND);
  }

  // 2. Verificar estado del formulario padre
  const form = await selectFormById(existingQuestion.form_id);
  if (form?.state !== "DRAFT") {
    throw setError(
      "No se puede editar una pregunta de un formulario publicado",
      errorCodes.CONFLICT,
    );
  }

  // 3. Preparar valores (mantener los previos si no se envian)
  const updatedData = {
    questionText: data.question_text
      ? data.question_text.trim()
      : existingQuestion.question_text,
    type: data.type ?? existingQuestion.type,
    required: data.required ?? existingQuestion.required,
    orderIndex: data.order_index ?? existingQuestion.order_index,
  };

  const updatedQuestion = await updateQuestion(data.id, updatedData);
  return updatedQuestion;
};

/**
 * Elimina una pregunta por su ID
 * Regla: El formulario asociado debe seguir en estado DRAFT
 */
export const deleteQuestionService = async (payload) => {
  const data = parseOrThrow(questionIdParamSchema, payload);

  logger.info({ deleteQuestionService: { "[QUESTION_ID]": data.id } });

  // 1. Verificar existencia de la pregunta
  const existingQuestion = await selectQuestionById(data.id);
  if (!existingQuestion) {
    throw setError(`Pregunta ${data.id} no encontrada`, errorCodes.NOT_FOUND);
  }

  // 2. Verificar estado del formulario padre
  const form = await selectFormById(existingQuestion.form_id);
  if (form?.state !== "DRAFT") {
    throw setError(
      "No se puede eliminar una pregunta de un formulario publicado",
      errorCodes.CONFLICT,
    );
  }

  const result = await deleteQuestion(data.id);
  return { id: result.id, message: "Pregunta eliminada correctamente" };
};
