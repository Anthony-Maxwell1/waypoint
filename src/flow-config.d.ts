import { z } from "zod";
export declare const flowStepSchema: z.ZodType<unknown>;
export declare const searchConfigSchema: z.ZodObject<{
    baseCapabilities: z.ZodDefault<z.ZodArray<z.ZodString>>;
    filterCapabilities: z.ZodDefault<z.ZodArray<z.ZodString>>;
    movieCapabilities: z.ZodDefault<z.ZodArray<z.ZodString>>;
    showCapabilities: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const flowDocumentSchema: z.ZodObject<{
    stream: z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
    download: z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
    reserve: z.ZodArray<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
    search: z.ZodObject<{
        baseCapabilities: z.ZodDefault<z.ZodArray<z.ZodString>>;
        filterCapabilities: z.ZodDefault<z.ZodArray<z.ZodString>>;
        movieCapabilities: z.ZodDefault<z.ZodArray<z.ZodString>>;
        showCapabilities: z.ZodDefault<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type FlowDocument = z.infer<typeof flowDocumentSchema>;
export type FlowStep = z.infer<typeof flowStepSchema>;
export type SearchConfig = z.infer<typeof searchConfigSchema>;
export declare const defaultFlowDocument: FlowDocument;
//# sourceMappingURL=flow-config.d.ts.map