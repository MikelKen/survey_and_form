import ultimateExpress from "ultimate-express";
import {
  createFormController,
  getFormByIdController,
  listFormsByCreatorController,
  updateFormController,
  publishFormController,
  deleteFormController,
} from "../controllers/form_controller.js";
import { validateRequestMiddleware } from "../middleware/validate_middleware.js";
import { authMiddleware } from "../middleware/auth_middleware.js";

const { Router } = ultimateExpress;
const router = Router();

// Crear un nuevo formulario
router.post(
  "/forms",
  authMiddleware,
  validateRequestMiddleware.createForm(),
  createFormController,
);

// Listar formularios creados por el usuario autenticado
router.get(
  "/forms",
  authMiddleware,
  validateRequestMiddleware.listForms(),
  listFormsByCreatorController,
);

// Obtener un formulario puntual por ID
router.get(
  "/forms/:id",
  validateRequestMiddleware.getForm(),
  getFormByIdController,
);

// Actualizar un formulario
router.put(
  "/forms/:id",
  authMiddleware,
  validateRequestMiddleware.updateForm(),
  updateFormController,
);

// Publicar un formulario
router.post(
  "/forms/:id/publish",
  authMiddleware,
  validateRequestMiddleware.publishForm(),
  publishFormController,
);

// Eliminar un formulario
router.delete(
  "/forms/:id",
  authMiddleware,
  validateRequestMiddleware.deleteForm(),
  deleteFormController,
);

export default router;
