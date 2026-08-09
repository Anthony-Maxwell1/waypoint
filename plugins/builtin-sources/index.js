import { Readable } from "stream";
import { z } from "zod";
import { definePluginApiSchema, } from "../../src/index.js";
const SourceDescriptorSchema = z.object({
    from: z.string(),
    id: z.string(),
    name: z.string(),
    description: z.string(),
    type: z.string(),
    needs: z.array(z.string()).optional(),
});
const SourceFetchInputSchema = z.discriminatedUnion("sourceId", [
    z.object({
        sourceId: z.literal("direct-url"),
        sourceOptions: z.object({
            url: z.string().url(),
        }),
    }),
    z.object({
        sourceId: z.literal("direct-url-download"),
        sourceOptions: z.object({
            url: z.string().url(),
        }),
    }),
    z.object({
        sourceId: z.literal("youtube"),
        sourceOptions: z.object({
            url: z.string(),
            videoId: z.string(),
        }),
    }),
]);
const SourceFetchOutputSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("stream"),
        stream: z.custom((value) => value === null || typeof value === "object", "Expected a ReadableStream or null"),
    }),
    z.object({
        type: z.literal("download"),
        download: z.custom((value) => typeof value === "function", "Expected a download function"),
    }),
]);
export const AvailableSourcesApi = definePluginApiSchema("AvailableSources", z.undefined(), z.array(SourceDescriptorSchema));
export const SourceFetchApi = definePluginApiSchema("SourceFetch", SourceFetchInputSchema, SourceFetchOutputSchema);
export const schemas = {
    AvailableSources: AvailableSourcesApi,
    SourceFetch: SourceFetchApi,
};
export const SourcesReadyEventPayloadSchema = z.object({
    pluginId: z.string(),
});
function init(initContext) {
    const { api, logger, manifest, events, pluginId } = initContext;
    api.provideSchema(AvailableSourcesApi, async () => {
        return [
            {
                from: "builtin-sources",
                id: "direct-url",
                name: "Direct from URL",
                description: "A source that allows you to provide a direct URL to a file on a server.",
                type: "stream",
                needs: ["direct-url"],
            },
            {
                from: "builtin-sources",
                id: "direct-url-download",
                name: "Direct from URL (download)",
                description: "A source that allows you to provide a direct URL to a file on a server.",
                type: "download",
                needs: ["direct-url"],
            },
        ];
    });
    api.provideSchema(SourceFetchApi, async (input) => {
        const { sourceId, sourceOptions } = input;
        if (sourceId === "direct-url") {
            const { url } = sourceOptions;
            return {
                type: "stream",
                stream: await fetch(url).then((res) => res.body),
            };
        }
        else if (sourceId === "direct-url-download") {
            const { url } = sourceOptions;
            return {
                type: "download",
                download: async (destinationPath) => {
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`Failed to download file from ${url}: ${response.status} ${response.statusText}`);
                    }
                    const fileStream = require("fs").createWriteStream(destinationPath);
                    return new Promise((resolve, reject) => {
                        const nodeReadable = Readable.fromWeb(response.body);
                        nodeReadable.pipe(fileStream);
                        nodeReadable.on("error", (err) => {
                            reject(err);
                        });
                        fileStream.on("finish", () => {
                            resolve();
                        });
                    });
                },
            };
        }
        else if (sourceId === "youtube") {
            const { url, videoId } = sourceOptions;
            return {
                type: "stream",
                stream: Readable.toWeb(Readable.from([
                    Buffer.from(`youtube stream for ${videoId}\nsource: ${url}\n`),
                ])),
            };
        }
        else {
            throw new Error(`Unknown sourceId: ${sourceId}`);
        }
    });
    void (async () => {
        const queryProvider = manifest
            .all()
            .find((plugin) => plugin.apis.provides.includes("QueryPlugins"));
        if (!queryProvider) {
            throw new Error("No plugin provides QueryPlugins");
        }
        const [fileSystemEventProvider] = await api.call(queryProvider.id, "QueryPlugins", {
            provides: ["FileSystemEventProvider"],
        });
        if (!fileSystemEventProvider) {
            throw new Error("No plugin provides FileSystemEventProvider");
        }
        events.on(fileSystemEventProvider.id, async (event) => {
            logger.log(`received provider event ${event.type} from ${event.providerId}: ${JSON.stringify(event.payload)}`);
        });
        await events.emit("sources.ready", SourcesReadyEventPayloadSchema.parse({ pluginId }));
        logger.log("Hello from the builtin-sources plugin!");
    })();
}
export default {
    schemas,
    init,
};
//# sourceMappingURL=index.js.map