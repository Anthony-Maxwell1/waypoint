import { z } from "zod";

export interface ApiSchema<TInput, TOutput> {
  name: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
}

export function definePluginApiSchema<TInput, TOutput>(
  name: string,
  inputSchema: z.ZodType<TInput>,
  outputSchema: z.ZodType<TOutput>,
): ApiSchema<TInput, TOutput> {
  return {
    name,
    inputSchema,
    outputSchema,
  };
}

export const coreManifestEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  dependencies: z.object({
    onLoad: z.array(z.string()),
    available: z.array(z.string()),
  }),
  apis: z.object({
    onLoad: z.array(z.string()),
    present: z.array(z.string()),
    provides: z.array(z.string()),
  }),
});
