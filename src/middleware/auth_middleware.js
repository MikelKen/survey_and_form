import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/jws_token.js";
import { logger } from "@tigo/logger";
import { sendError } from "../utils/response.js";
import constants from "../utils/constants.js";

export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.info("[AUTH] Token no proporcionado o formato incorrecto");
      const { statusHttp, response } = sendError(
        constants.errors.UNAUTHORIZED || "401",
      );
      return res.status(statusHttp || 401).json(response);
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;
    next();
  } catch (error) {
    logger.error({ "[AUTH ERROR]": error.message });
    const { statusHttp, response } = sendError(
      constants.errors.UNAUTHORIZED || "401",
    );
    return res.status(statusHttp || 401).json(response);
  }
};
