import { z } from "zod";
export function definePluginApiSchema(name, inputSchema, outputSchema) {
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
//# sourceMappingURL=plugin-api-schemas.js.map