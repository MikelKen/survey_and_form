import { logger } from "@tigo/logger";
import { errorCodes, setError } from "../utils/errorCodes.js";
import {
  submitAnswersSchema,
  formIdParamSchema,
  listSubmissionsQuerySchema,
} from "../schemas/answer_schema.js";
import {
  insertSubmission,
  selectSubmissionById,
  selectSubmissionsByForm,
} from "../repositories/answer_repository.js";
import {
  insertAnswerDetailsBulk,
  selectDetailsBySubmission,
  selectRawAggregationByForm,
  buildResultsReport,
} from "../repositories/answer_details_repository.js";
import { selectFormStateById } from "../repositories/form_repository.js";
import { selectQuestionsByFormId } from "../repositories/question_repository.js";

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
 * Valida que todas las preguntas requeridas tengan respuesta
 */
const validateRequiredQuestions = (questions, submittedAnswersMap) => {
  for (const question of questions) {
    if (!question.required) continue;

    const submittedValue = submittedAnswersMap.get(question.id);
    const isEmpty =
      submittedValue === undefined ||
      submittedValue === null ||
      String(submittedValue).trim() === "";

    if (isEmpty) {
      throw setError(
        `La pregunta "${question.question_text}" es requerida y debe ser respondida`,
        errorCodes.VALIDATION,
      );
    }
  }
};

/**
 * Valida el formato de un valor numérico
 */
const validateNumberAnswer = (question, valStr) => {
  if (Number.isNaN(Number(valStr)) || valStr === "") {
    throw setError(
      `Se esperaba un valor numerico para la pregunta "${question.question_text}"`,
      errorCodes.VALIDATION,
    );
  }
};

/**
 * Valida el formato de un valor booleano
 */
const validateBooleanAnswer = (question, valStr) => {
  const lower = valStr.toLowerCase();
  if (!["true", "false", "1", "0"].includes(lower)) {
    throw setError(
      `Se esperaba un valor booleano (true/false) para la pregunta "${question.question_text}"`,
      errorCodes.VALIDATION,
    );
  }
};

/**
 * Valida que cada respuesta pertenezca al formulario y tenga el tipo de dato correcto
 */
const validateAnswerTypes = (questionsMap, answers) => {
  for (const answer of answers) {
    const question = questionsMap.get(answer.questionId);

    if (!question) {
      throw setError(
        `La pregunta ${answer.questionId} no pertenece al formulario`,
        errorCodes.VALIDATION,
      );
    }

    const valStr = String(answer.value).trim();

    if (question.type === "NUMBER") {
      validateNumberAnswer(question, valStr);
    } else if (question.type === "BOOLEAN") {
      validateBooleanAnswer(question, valStr);
    }
  }
};

/**
 * Validación dinámica de preguntas requeridas y tipos de datos
 */
const validateAnswersLogic = (questions, answers) => {
  const questionsMap = new Map(questions.map((q) => [q.id, q]));
  const submittedAnswersMap = new Map(
    answers.map((a) => [a.questionId, a.value]),
  );

  validateRequiredQuestions(questions, submittedAnswersMap);
  validateAnswerTypes(questionsMap, answers);
};
/**
 * Función para Recepción, Validación Estricta y Persistencia de Respuestas
 */
export const submitAnswersService = async (payload) => {
  const data = parseOrThrow(submitAnswersSchema, payload);

  logger.info({ submitAnswersService: { "[FORM_ID]": data.form_id } });

  const form = await selectFormStateById(data.form_id);
  if (!form) {
    throw setError(
      `Formulario ${data.form_id} no encontrado`,
      errorCodes.NOT_FOUND,
    );
  }

  if (form.state !== "PUBLISHED") {
    throw setError(
      "Un formulario en borrador no puede recibir respuestas",
      errorCodes.CONFLICT,
    );
  }

  const questions = await selectQuestionsByFormId(data.form_id);

  // Ejecutar validaciones aisladas
  validateAnswersLogic(questions, data.answers);

  try {
    const submission = await insertSubmission(data.form_id);
    const details = await insertAnswerDetailsBulk(submission.id, data.answers);

    return {
      submissionId: submission.id,
      formId: submission.form_id,
      sentAt: submission.sent_at,
      totalAnswered: details.length,
      message: "Respuesta registrada exitosamente",
    };
  } catch (err) {
    logger.error({ submitAnswersService: { error: err.message } });
    throw setError("No se pudo registrar la respuesta", errorCodes.UNKNOWN);
  }
};

export const getFormResultsService = async (payload) => {
  const data = parseOrThrow(formIdParamSchema, payload);

  logger.info({ getFormResultsService: { "[FORM_ID]": data.form_id } });

  const form = await selectFormStateById(data.form_id);
  if (!form) {
    throw setError(
      `Formulario ${data.form_id} no encontrado`,
      errorCodes.NOT_FOUND,
    );
  }

  const rawRows = await selectRawAggregationByForm(data.form_id);
  const report = buildResultsReport(rawRows);

  return {
    formId: data.form_id,
    questions: report,
  };
};

export const listSubmissionsByFormService = async (payload) => {
  const data = parseOrThrow(listSubmissionsQuerySchema, payload);

  logger.info({ listSubmissionsByFormService: { "[FORM_ID]": data.form_id } });

  const form = await selectFormStateById(data.form_id);
  if (!form) {
    throw setError(
      `Formulario ${data.form_id} no encontrado`,
      errorCodes.NOT_FOUND,
    );
  }

  return await selectSubmissionsByForm(data.form_id, {
    page: data.page,
    perPage: data.perPage,
  });
};

export const getSubmissionDetailService = async (payload) => {
  const data = parseOrThrow(formIdParamSchema, payload);

  logger.info({
    getSubmissionDetailService: { "[SUBMISSION_ID]": data.form_id },
  });

  const submission = await selectSubmissionById(data.form_id);
  if (!submission) {
    throw setError(`Envio ${data.form_id} no encontrado`, errorCodes.NOT_FOUND);
  }

  const details = await selectDetailsBySubmission(submission.id);

  return {
    submission,
    answers: details,
  };
};
