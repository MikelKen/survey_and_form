import { logger } from "@tigo/logger";
import { sendError } from "../utils/response.js";
import {
  createQuestionService,
  getQuestionByIdService,
  getQuestionsByFormService,
  updateQuestionService,
  deleteQuestionService,
} from "../services/question_service.js";

/**
 * Controlador para crear una pregunta asociada a un formulario
 */
export async function createQuestionController(req, res) {
  let responseBody = {};
  logger.startTimer("ExecutionTimeAll");
  try {
    responseBody = await createQuestionService(req.validated);
    return res.status(201).json(responseBody);
  } catch (error) {
    logger.error({ "[ERROR]": error.message, stack: error.stack });
    const { statusHttp, response } = sendError(error?.errorCode);
    responseBody = response;
    return res.status(statusHttp).json(responseBody);
  } finally {
    logger.info({ "[RESPONSE BODY]": responseBody });
    logger.endTimer("ExecutionTimeAll");
  }
}

/**
 * Controlador para obtener una pregunta por su ID
 */
export async function getQuestionByIdController(req, res) {
  let responseBody = {};
  logger.startTimer("ExecutionTimeAll");
  try {
    responseBody = await getQuestionByIdService(req.validated);
    return res.status(200).json(responseBody);
  } catch (error) {
    logger.error({ "[ERROR]": error.message, stack: error.stack });
    const { statusHttp, response } = sendError(error?.errorCode);
    responseBody = response;
    return res.status(statusHttp).json(responseBody);
  } finally {
    logger.info({ "[RESPONSE BODY]": responseBody });
    logger.endTimer("ExecutionTimeAll");
  }
}

/**
 * Controlador para obtener todas las preguntas de un formulario
 */
export async function getQuestionsByFormController(req, res) {
  let responseBody = {};
  logger.startTimer("ExecutionTimeAll");
  try {
    responseBody = await getQuestionsByFormService(req.validated);
    return res.status(200).json(responseBody);
  } catch (error) {
    logger.error({ "[ERROR]": error.message, stack: error.stack });
    const { statusHttp, response } = sendError(error?.errorCode);
    responseBody = response;
    return res.status(statusHttp).json(responseBody);
  } finally {
    logger.info({ "[RESPONSE BODY]": responseBody });
    logger.endTimer("ExecutionTimeAll");
  }
}

/**
 * Controlador para actualizar una preg
 */
export async function updateQuestionController(req, res) {
  let responseBody = {};
  logger.startTimer("ExecutionTimeAll");
  try {
    responseBody = await updateQuestionService(req.validated);
    return res.status(200).json(responseBody);
  } catch (error) {
    logger.error({ "[ERROR]": error.message, stack: error.stack });
    const { statusHttp, response } = sendError(error?.errorCode);
    responseBody = response;
    return res.status(statusHttp).json(responseBody);
  } finally {
    logger.info({ "[RESPONSE BODY]": responseBody });
    logger.endTimer("ExecutionTimeAll");
  }
}

/**
 * Controlador para eliminar una pregunta
 */
export async function deleteQuestionController(req, res) {
  let responseBody = {};
  logger.startTimer("ExecutionTimeAll");
  try {
    responseBody = await deleteQuestionService(req.validated);
    return res.status(200).json(responseBody);
  } catch (error) {
    logger.error({ "[ERROR]": error.message, stack: error.stack });
    const { statusHttp, response } = sendError(error?.errorCode);
    responseBody = response;
    return res.status(statusHttp).json(responseBody);
  } finally {
    logger.info({ "[RESPONSE BODY]": responseBody });
    logger.endTimer("ExecutionTimeAll");
  }
}
