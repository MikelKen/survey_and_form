import { logger } from "@tigo/logger";
import {
  createUserSchema,
  loginUserSchema,
  listUsersFilterSchema,
  userIdParamSchema,
} from "../schemas/user_schema.js";
import {
  createFormSchema,
  updateFormSchema,
  publishFormSchema,
  listFormsFilterSchema,
} from "../schemas/form_schema.js";
import {
  createQuestionSchema,
  updateQuestionSchema,
  questionIdParamSchema,
  listQuestionsParamSchema,
} from "../schemas/question_schema.js";
import {
  submitAnswersSchema,
  formIdParamSchema,
  listSubmissionsQuerySchema,
} from "../schemas/answer_schema.js";
import constants from "../utils/constants.js";
import { sendError } from "../utils/response.js";

const validate = (schema) => (req, res, next) => {
  try {
    logger.info({ "[REQUEST HEADERS]": req.headers });
    logger.info({ "[REQUEST PARAMS]": req.params });
    logger.info({ "[REQUEST QUERY]": req.query });
    logger.info({ "[REQUEST BODY]": req.body });

    const xtraceid = req.headers["x-traceid"];
    const xclientid = req.headers["x-clientid"];

    const rawData = {
      ...req.body,
      ...req.params,
      ...req.query,
      ...(xtraceid && { xtraceid }),
      ...(xclientid && { xclientid }),
    };

    const data = Object.fromEntries(
      Object.entries(rawData).filter(([_, value]) => value !== undefined),
    );
    const result = schema.safeParse(data);
    if (!result.success) {
      logger.info(`Validation failed ${JSON.stringify(result?.error?.issues)}`);
      throw new Error("Invalid request data");
    }

    // Reemplaza el dato crudo por el ya validado/coercionado (ej. page: "2" -> 2)
    req.validated = result.data;
    next();
  } catch (error) {
    const { statusHttp, response } = sendError(constants.errors.BAD_REQUEST);
    res.status(statusHttp).json(response);
  }
};

export const validateRequestMiddleware = {
  createUser: () => validate(createUserSchema),
  getUser: () => validate(userIdParamSchema),
  loginUser: () => validate(loginUserSchema),
  listUsers: () => validate(listUsersFilterSchema),

  createForm: () => validate(createFormSchema),
  getForm: () => validate(publishFormSchema),
  updateForm: () => validate(updateFormSchema),
  publishForm: () => validate(publishFormSchema),
  deleteForm: () => validate(publishFormSchema),
  listForms: () => validate(listFormsFilterSchema),

  createQuestion: () => validate(createQuestionSchema),
  getQuestion: () => validate(questionIdParamSchema),
  updateQuestion: () => validate(updateQuestionSchema),
  deleteQuestion: () => validate(questionIdParamSchema),
  listQuestionsByForm: () => validate(listQuestionsParamSchema),

  submitAnswers: () => validate(submitAnswersSchema),
  getFormResults: () => validate(formIdParamSchema),
  listSubmissions: () => validate(listSubmissionsQuerySchema),
  getSubmissionDetail: () => validate(formIdParamSchema),
};
