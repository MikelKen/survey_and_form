import { headerSchema } from "./common.schema";
import { z } from "zod";

export const createUserSchema = z
  .object({
    name: z.string().min(1).max(150),
    email: z.string().email().min(1).max(150),
    password: z.string().min(8).max(75),
    ...headerSchema,
  })
  .strict();

export const loginUserSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
    ...headerSchema,
  })
  .strict();
