import { logger } from "@tigo/logger";
import { sendError } from "../utils/response.js";
import {
  createUserService,
  getUserService,
  loginUserService,
  listUsersService,
} from "../services/user_service.js";

export async function createUserController(req, res) {
  let responseBody = {};
  logger.startTimer("ExecutionTimeAll");
  try {
    responseBody = await createUserService(req.validated);
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

export async function getUserController(req, res) {
  let responseBody = {};
  logger.startTimer("ExecutionTimeAll");
  try {
    responseBody = await getUserService(req.validated);
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

export async function loginUserController(req, res) {
  let responseBody = {};
  logger.startTimer("ExecutionTimeAll");
  try {
    // CAMBIO: Se usa req.validated para incluir los headers xclientid/xtraceid
    responseBody = await loginUserService(req.validated);
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

export async function listUsersController(req, res) {
  let responseBody = {};
  logger.startTimer("ExecutionTimeAll");
  try {
    // CAMBIO: Se usa req.validated para incluir los headers y coerciones de paginación
    responseBody = await listUsersService(req.validated);
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
