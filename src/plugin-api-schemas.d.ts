import { z } from "zod";
export interface ApiSchema<TInput, TOutput> {
    name: string;
    inputSchema: z.ZodType<TInput>;
    outputSchema: z.ZodType<TOutput>;
}
export declare function definePluginApiSchema<TInput, TOutput>(name: string, inputSchema: z.ZodType<TInput>, outputSchema: z.ZodType<TOutput>): ApiSchema<TInput, TOutput>;
export declare const coreManifestEntrySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    dependencies: z.ZodObject<{
        onLoad: z.ZodArray<z.ZodString>;
        available: z.ZodArray<z.ZodString>;
    }, z.core.$strip>;
    apis: z.ZodObject<{
        onLoad: z.ZodArray<z.ZodString>;
        present: z.ZodArray<z.ZodString>;
        provides: z.ZodArray<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=plugin-api-schemas.d.ts.map