import { getValue, setValue } from "@tigo/redis-connector";
import { logger } from "@tigo/logger";

/**
 * Middleware para controlar la tasa de peticiones (Rate Limit) por x-clientid
 * Límite: 10 respuestas de encuestas por minuto por cliente
 */
export const answerRateLimiterMiddleware = async (req, res, next) => {
  const clientId = req.headers["x-clientid"] || req.ip;
  const redisKey = `rate_limit:answers:${clientId}`;

  try {
    const currentRequests = await getValue(redisKey);
    const count = currentRequests ? Number.parseInt(currentRequests, 10) : 0;

    if (count >= 10) {
      logger.info({ "[RATE LIMIT EXCEEDED]": clientId });

      return res.status(429).json({
        error: {
          code: "TOO_MANY_REQUESTS",
          message: "Has superado el límite de envíos de respuestas por minuto.",
        },
      });
    }

    // Incrementar contador con TTL de 60 segundos
    await setValue(redisKey, String(count + 1), 60);
    next();
  } catch (error) {
    logger.error({ "[RATE LIMIT ERROR]": error.message });
    // En caso de fallo en Redis, se permite continuar
    next();
  }
};
