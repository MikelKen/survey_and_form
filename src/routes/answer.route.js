import ultimateExpress from "ultimate-express";
import {
  submitAnswersController,
  getFormResultsController,
  listSubmissionsByFormController,
  getSubmissionDetailController,
} from "../controllers/answer_controller.js";
import { validateRequestMiddleware } from "../middleware/validate_middleware.js";

const { Router } = ultimateExpress;

const router = Router();

// Registrar envío de respuestas (Ruta pública para el encuestado)
router.post(
  "/forms/:form_id/responses",
  validateRequestMiddleware.submitAnswers(),
  submitAnswersController,
);

// Consultar resultados estadísticos agregados por pregunta
router.get(
  "/forms/:form_id/results",
  validateRequestMiddleware.getFormResults(),
  getFormResultsController,
);

// Listar envíos generales de un formulario
router.get(
  "/forms/:form_id/submissions",
  validateRequestMiddleware.listSubmissions(),
  listSubmissionsByFormController,
);

// Consultar el detalle de respuestas de un envío específico por su ID
router.get(
  "/submissions/:form_id",
  validateRequestMiddleware.getSubmissionDetail(),
  getSubmissionDetailController,
);

export default router;
