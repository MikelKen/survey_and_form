import { z } from "zod";
import { headerSchema } from "./common_schema.js";

/**
 * Validacion de ID por parametro de ruta
 */
export const formIdParamSchema = z
  .object({
    form_id: z
      .string()
      .uuid({ message: "El ID del formulario debe ser un UUID valido" }),
    ...headerSchema,
  })
  .strict();

/**
 * Esquema para un elemento individual dentro del arreglo de respuestas
 */
const answerItemSchema = z.object({
  questionId: z
    .string()
    .uuid({ message: "El questionId debe ser un UUID valido" }),
  value: z.union([z.string(), z.number(), z.boolean()], {
    required_error: "El valor de la respuesta es obligatorio",
  }),
});

/**
 * Esquema para enviar el paquete completo de respuestas
 */
export const submitAnswersSchema = z
  .object({
    form_id: z
      .string()
      .uuid({ message: "El ID del formulario debe ser un UUID valido" }),
    answers: z
      .array(answerItemSchema)
      .min(1, { message: "El paquete debe contener al menos una respuesta" }),
    ...headerSchema,
  })
  .strict();

/**
 * Esquema para listar envios o consultar resultados
 */
export const listSubmissionsQuerySchema = z
  .object({
    form_id: z
      .string()
      .uuid({ message: "El ID del formulario debe ser un UUID valido" }),
    page: z.coerce.number().int().positive().optional().default(1),
    perPage: z.coerce.number().int().positive().max(100).optional().default(15),
    ...headerSchema,
  })
  .strict();
