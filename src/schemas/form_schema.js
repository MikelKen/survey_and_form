import { headerSchema } from "./common_schema.js";
import { z } from "zod";

/**
 * Esquema para publicar o cambiar el estado de un formulario
 */
export const publishFormSchema = z
  .object({
    id: z
      .string()
      .uuid({ message: "El ID del formulario debe ser un UUID valido" }),
    ...headerSchema,
  })
  .strict();

export const createFormSchema = z
  .object({
    title: z
      .string({ required_error: "El titulo es obligatorio" })
      .trim()
      .min(1, { message: "El titulo no puede estar vacio" })
      .max(200, { message: "El titulo no puede exceder 200 caracteres" }),
    ...headerSchema,
  })
  .strict();

export const updateFormSchema = z
  .object({
    id: z
      .string()
      .uuid({ message: "El ID del formulario debe ser un UUID valido" }),
    title: z
      .string({ required_error: "El titulo es obligatorio" })
      .trim()
      .min(1, { message: "El titulo no puede estar vacio" })
      .max(200, { message: "El titulo no puede exceder 200 caracteres" }),
    ...headerSchema,
  })
  .strict();

export const listFormsFilterSchema = z
  .object({
    title: z.string().trim().optional(),
    state: z.enum(["DRAFT", "PUBLISHED"]).optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    perPage: z.coerce.number().int().positive().max(100).optional().default(15),
    sort: z.string().optional().default("created_at"),
    order: z.enum(["asc", "desc"]).optional().default("desc"),
    ...headerSchema,
  })
  .strict();
