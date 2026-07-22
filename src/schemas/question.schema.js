import { z } from "zod";
import { headersSchema } from "./common.schema.js";

export const createQuestionSchema = z
  .object({
    form_id: z.string().uuid(),
    question_text: z.string().min(1),
    type: z.enum(["TEXT", "NUMBER", "BOOLEAN"]),
    required: z.boolean().optional().default(false),
    order_index: z.number().int().min(1).optional().default(1),
    ...headersSchema,
  })
  .strict();

export const updateQuestionSchema = z
  .object({
    question_text: z.string().min(1).optional(),
    type: z.enum(["TEXT", "NUMBER", "BOOLEAN"]).optional(),
    required: z.boolean().optional(),
    order_index: z.number().int().min(1).optional(),
    ...headersSchema,
  })
  .strict();
