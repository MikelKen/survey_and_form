import { z } from "zod";

export const headerSchema = {
  xtraceid: z.string().min(1).max(250).optional(),
  xclientid: z.string().min(1).max(250).optional(),
};

export const uuidParamSchema = z
  .object({
    id: z.string().uuid(),
    ...headerSchema,
  })
  .strict();
