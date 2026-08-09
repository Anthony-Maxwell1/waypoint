import { z } from "zod";
declare const manifestSchema: z.ZodArray<z.ZodObject<{
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
}, z.core.$strip>>;
export type PluginManifest = z.infer<typeof manifestSchema>;
export type PluginManifestEntry = PluginManifest[number];
export interface PluginEvent {
    providerId: string;
    type: string;
    payload: any;
}
export interface PluginManifestView {
    all(): readonly PluginManifestEntry[];
    get(id: string): PluginManifestEntry | undefined;
}
export interface PluginEventBus {
    emit(type: string, payload: any): Promise<void>;
    on(providerPluginId: string, handler: (event: PluginEvent) => Promise<void> | void): () => void;
}
export interface PluginApiHandlerContext {
    callerId: string;
    pluginId: string;
    logger: PluginInitContext["logger"];
    manifest: PluginManifestView;
    events: PluginEventBus;
}
type PluginApiHandler = (input: any, context: PluginApiHandlerContext) => Promise<any> | any;
export interface PluginApiSchema<TInput, TOutput> {
    name: string;
    inputSchema: z.ZodType<TInput>;
    outputSchema: z.ZodType<TOutput>;
}
export declare function definePluginApiSchema<TInput, TOutput>(name: string, inputSchema: z.ZodType<TInput>, outputSchema: z.ZodType<TOutput>): PluginApiSchema<TInput, TOutput>;
export interface PluginApiRegistry {
    provide(name: string, handler: PluginApiHandler): void;
    call<TResponse = any>(providerPluginId: string, name: string, input: any): Promise<TResponse>;
    provideSchema<TInput, TOutput>(schema: PluginApiSchema<TInput, TOutput>, handler: (input: TInput, context: PluginApiHandlerContext) => Promise<TOutput> | TOutput): void;
    callSchema<TInput, TOutput>(providerPluginId: string, schema: PluginApiSchema<TInput, TOutput>, input: TInput): Promise<TOutput>;
    has(name: string): boolean;
    list(): string[];
}
export interface PluginModule {
    init(ctx: PluginInitContext): Promise<void> | void;
}
export interface PluginInitContext {
    pluginId: string;
    logger: {
        log: (message: string) => void;
        error: (message: string) => void;
        warn: (message: string) => void;
    };
    manifest: PluginManifestView;
    api: PluginApiRegistry;
    events: PluginEventBus;
}
export {};
//# sourceMappingURL=index.d.ts.map