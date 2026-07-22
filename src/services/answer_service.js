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
 * Funcion para Recepcion, Validacion Estricta y Persistencia de Respuestas
 */
export const submitAnswersService = async (payload) => {
  const data = parseOrThrow(submitAnswersSchema, payload);

  logger.info({ submitAnswersService: { "[FORM_ID]": data.form_id } });

  // 1. Verificar existencia y estado del formulario
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

  // 2. Obtener el esquema de preguntas del formulario para la validacion dinamica
  const questions = await selectQuestionsByFormId(data.form_id);
  const questionsMap = new Map(questions.map((q) => [q.id, q]));
  const submittedAnswersMap = new Map(
    data.answers.map((a) => [a.questionId, a.value]),
  );

  // 3. Validacion A: Comprobar preguntas REQUERIDAS
  for (const question of questions) {
    if (question.required) {
      const submittedValue = submittedAnswersMap.get(question.id);
      if (
        submittedValue === undefined ||
        submittedValue === null ||
        String(submittedValue).trim() === ""
      ) {
        throw setError(
          `La pregunta "${question.question_text}" es requerida y debe ser respondida`,
          errorCodes.VALIDATION,
        );
      }
    }
  }

  // 4. Validacion B: Comprobar TIPOS DE DATOS
  for (const answer of data.answers) {
    const question = questionsMap.get(answer.questionId);

    if (!question) {
      throw setError(
        `La pregunta ${answer.questionId} no pertenece al formulario ${data.form_id}`,
        errorCodes.VALIDATION,
      );
    }

    const valStr = String(answer.value).trim();

    if (question.type === "NUMBER") {
      if (isNaN(Number(valStr)) || valStr === "") {
        throw setError(
          `Se esperaba un valor numerico para la pregunta "${question.question_text}"`,
          errorCodes.VALIDATION,
        );
      }
    } else if (question.type === "BOOLEAN") {
      const lower = valStr.toLowerCase();
      if (
        lower !== "true" &&
        lower !== "false" &&
        lower !== "1" &&
        lower !== "0"
      ) {
        throw setError(
          `Se esperaba un valor booleano (true/false) para la pregunta "${question.question_text}"`,
          errorCodes.VALIDATION,
        );
      }
    }
  }

  // 5. Persistencia: Crear la cabecera del envio (answers) y los detalles en lote (answer_details)
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

/**
 * Funcion para consultar resultados agregados por pregunta
 */
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

  // Obtiene los datos crudos y aplica el helper para construir el reporte
  const rawRows = await selectRawAggregationByForm(data.form_id);
  const report = buildResultsReport(rawRows);

  return {
    formId: data.form_id,
    questions: report,
  };
};

/**
 * Funcion para listar envios paginados de un formulario (Solo para el creador)
 */
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

  const rawPagination = {
    page: data.page,
    perPage: data.perPage,
  };

  return await selectSubmissionsByForm(data.form_id, rawPagination);
};

/**
 * Consultar el detalle individual de un envio por su ID
 */
export const getSubmissionDetailService = async (payload) => {
  const data = parseOrThrow(formIdParamSchema, payload); // Reutiliza la validacion del UUID

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
