import { z } from "zod";
import { headersSchema } from "./common.schema.js";

const answerDetailSchema = z.object({
  question_id: z.string().uuid(),
  value: z.string().min(1),
});

export const createAnswerSchema = z
  .object({
    form_id: z.string().uuid(),
    answers: z.array(answerDetailSchema).min(1),
    ...headersSchema,
  })
  .strict();
