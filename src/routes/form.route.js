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

const { Router } = ultimateExpress;

const router = Router();

// Crear un nuevo formulario
router.post(
  "/forms",
  validateRequestMiddleware.createForm(),
  createFormController,
);

// Listar formularios creados por el usuario autenticado
router.get(
  "/forms",
  validateRequestMiddleware.listForms(),
  listFormsByCreatorController,
);

// Obtener un formulario puntual por ID
router.get(
  "/forms/:id",
  validateRequestMiddleware.getForm(),
  getFormByIdController,
);

// Actualizar titulo de un formulario
router.put(
  "/forms/:id",
  validateRequestMiddleware.updateForm(),
  updateFormController,
);

// Publicar un formulario
router.post(
  "/forms/:id/publish",
  validateRequestMiddleware.publishForm(),
  publishFormController,
);

// Eliminar un formulario
router.delete(
  "/forms/:id",
  validateRequestMiddleware.deleteForm(),
  deleteFormController,
);

export default router;
