import ultimateExpress from "ultimate-express";
import {
  createUserController,
  getUserController,
  loginUserController,
  listUsersController,
} from "../controllers/user_controller.js";
import { validateRequestMiddleware } from "../middleware/validate_middleware.js";
const { Router } = ultimateExpress;

const router = Router();

router.post(
  "/users",
  validateRequestMiddleware.createUser(),
  createUserController,
);

router.get(
  "/users/:id",
  validateRequestMiddleware.getUser(),
  getUserController,
);

router.post(
  "/users/login",
  validateRequestMiddleware.loginUser(),
  loginUserController,
);

router.get(
  "/users",
  validateRequestMiddleware.listUsers(),
  listUsersController,
);

export default router;
