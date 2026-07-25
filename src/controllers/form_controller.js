import { logger } from "@tigo/logger";
import { sendError } from "../utils/response.js";
import {
  createFormService,
  getFormByIdService,
  listFormsByCreatorService,
  updateFormService,
  publishFormService,
  deleteFormService,
} from "../services/form_service.js";

/**
 * Controlador para crear un nuevo formulario
 */
export async function createFormController(req, res) {
  let responseBody = {};
  logger.startTimer("ExecutionTimeAll");
  try {
    const creatorId = req.user.id;
    responseBody = await createFormService(creatorId, req.validated);
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
 * Controlador para consultar un formulario por ID
 */
export async function getFormByIdController(req, res) {
  let responseBody = {};
  logger.startTimer("ExecutionTimeAll");
  try {
    responseBody = await getFormByIdService(req.validated);
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
 * Controlador para listar formularios de un creador
 */
export async function listFormsByCreatorController(req, res) {
  let responseBody = {};
  logger.startTimer("ExecutionTimeAll");
  try {
    const creatorId = req.user?.id || req.validated?.xclientid;
    responseBody = await listFormsByCreatorService(
      creatorId,
      req.validated || req.query,
    );
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
 * Controlador para actualizar título de un formulario
 */
export async function updateFormController(req, res) {
  let responseBody = {};
  logger.startTimer("ExecutionTimeAll");
  try {
    responseBody = await updateFormService(req.validated);
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
 * Controlador para publicar un formulario
 */
export async function publishFormController(req, res) {
  let responseBody = {};
  logger.startTimer("ExecutionTimeAll");
  try {
    responseBody = await publishFormService(req.validated);
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
 * Controlador para eliminar un formulario
 */
export async function deleteFormController(req, res) {
  let responseBody = {};
  logger.startTimer("ExecutionTimeAll");
  try {
    responseBody = await deleteFormService(req.validated);
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
