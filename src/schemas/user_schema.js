import { headerSchema } from "./common_schema.js";
import { paginationSchema } from "./pagination_schema.js";
import { z } from "zod";

export const ALLOWED_ROLES = ["creator"];

export const createUserSchema = z
  .object({
    name: z.string().min(1).max(150),
    email: z.string().email().min(1).max(150),
    password: z.string().min(8).max(75),
    role: z.enum(ALLOWED_ROLES),
    ...headerSchema,
  })
  .strict();

export const updateUserSchema = createUserSchema.partial();

export const listUsersFilterSchema = z
  .object({
    name: z.string().max(150).optional(),
    roles: z.string().optional(),
  })
  .merge(paginationSchema)
  .strict();

export const loginUserSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
    ...headerSchema,
  })
  .strict();

export const userIdParamSchema = z
  .object({
    id: z.string().uuid(),
    ...headerSchema,
  })
  .strict();
