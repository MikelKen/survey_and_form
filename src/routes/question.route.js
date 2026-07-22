import ultimateExpress from "ultimate-express";
import {
  createQuestionController,
  getQuestionByIdController,
  getQuestionsByFormController,
  updateQuestionController,
  deleteQuestionController,
} from "../controllers/question_controller.js";
import { validateRequestMiddleware } from "../middleware/validate_middleware.js";

const { Router } = ultimateExpress;

const router = Router();

// Crear una nueva pregunta en un formulario
router.post(
  "/questions",
  validateRequestMiddleware.createQuestion(),
  createQuestionController,
);

// Obtener la lista de preguntas de un formulario especifico
router.get(
  "/forms/:form_id/questions",
  validateRequestMiddleware.listQuestionsByForm(),
  getQuestionsByFormController,
);

// Obtener una pregunta puntual por su ID
router.get(
  "/questions/:id",
  validateRequestMiddleware.getQuestion(),
  getQuestionByIdController,
);

// Actualizar una pregunta
router.put(
  "/questions/:id",
  validateRequestMiddleware.updateQuestion(),
  updateQuestionController,
);

// Eliminar una pregunta (
router.delete(
  "/questions/:id",
  validateRequestMiddleware.deleteQuestion(),
  deleteQuestionController,
);

export default router;
