import { logger } from "@tigo/logger";
import { sendError } from "../utils/response.js";
import {
  submitAnswersService,
  getFormResultsService,
  listSubmissionsByFormService,
  getSubmissionDetailService,
} from "../services/answer_service.js";

/**
 * Registrar envío de respuestas a un formulario
 */
export async function submitAnswersController(req, res) {
  let responseBody = {};
  logger.startTimer("ExecutionTimeAll");
  try {
    responseBody = await submitAnswersService(req.validated);
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
 * Consultar resultados agregados por pregunta
 */
export async function getFormResultsController(req, res) {
  let responseBody = {};
  logger.startTimer("ExecutionTimeAll");
  try {
    responseBody = await getFormResultsService(req.validated);
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
 * Listar todos los envíos realizados a un formulario
 */
export async function listSubmissionsByFormController(req, res) {
  let responseBody = {};
  logger.startTimer("ExecutionTimeAll");
  try {
    responseBody = await listSubmissionsByFormService(req.validated);
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
 * Obtener el detalle de un envío puntual por ID
 */
export async function getSubmissionDetailController(req, res) {
  let responseBody = {};
  logger.startTimer("ExecutionTimeAll");
  try {
    responseBody = await getSubmissionDetailService(req.validated);
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
