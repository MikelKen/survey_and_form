import { z } from "zod";
import { headerSchema } from "./common_schema.js";

/**
 * Esquema para validar el ID de la pregunta por parámetro de ruta
 */
export const questionIdParamSchema = z
  .object({
    id: z
      .string()
      .uuid({ message: "El ID de la pregunta debe ser un UUID valido" }),
    ...headerSchema,
  })
  .strict();

/**
 * Esquema para obtener todas las preguntas de un formulario por form_id
 */
export const listQuestionsParamSchema = z
  .object({
    form_id: z.string().uuid({ message: "El form_id debe ser un UUID valido" }),
    ...headerSchema,
  })
  .strict();

/**
 * Esquema para crear una pregunta
 */
export const createQuestionSchema = z
  .object({
    form_id: z.string().uuid({ message: "El form_id debe ser un UUID valido" }),
    question_text: z
      .string({ required_error: "El texto de la pregunta es obligatorio" })
      .trim()
      .min(1, { message: "El texto de la pregunta no puede estar vacio" }),
    type: z.enum(["TEXT", "NUMBER", "BOOLEAN"], {
      errorMap: () => ({ message: "El tipo debe ser TEXT, NUMBER o BOOLEAN" }),
    }),
    required: z.boolean().optional().default(false),
    order_index: z.number().int().min(1).optional().default(1),
    ...headerSchema,
  })
  .strict();

/**
 * Esquema para actualizar una pregunta
 */
export const updateQuestionSchema = z
  .object({
    id: z
      .string()
      .uuid({ message: "El ID de la pregunta debe ser un UUID valido" }),
    question_text: z.string().trim().min(1).optional(),
    type: z.enum(["TEXT", "NUMBER", "BOOLEAN"]).optional(),
    required: z.boolean().optional(),
    order_index: z.number().int().min(1).optional(),
    ...headerSchema,
  })
  .strict();
