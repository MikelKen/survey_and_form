import { headerSchema } from "./common.schema";
import { z } from "zod";

export const cerateFormSchema = z
  .object({
    title: z.string().min(1).max(200),
    state: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
    ...headerSchema,
  })
  .strict();

export const updateFormSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    state: z.enum(["DRAFT", "PUBLISHED"]).optional(),
    ...headerSchema,
  })
  .strict();
