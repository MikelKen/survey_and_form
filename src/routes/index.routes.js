// routes/index.js
import ultimateExpress from "ultimate-express";
import userRoutes from "./user.routes.js";
import formRoutes from "./form.route.js";
import questionRoutes from "./question.route.js";
import answerRoutes from "./answer.route.js";

const { Router } = ultimateExpress;

const router = Router();

router.use(userRoutes);
router.use(formRoutes);
router.use(questionRoutes);
router.use(answerRoutes);

export default router;
