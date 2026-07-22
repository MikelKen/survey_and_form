import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  perPage: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).optional(),
});
