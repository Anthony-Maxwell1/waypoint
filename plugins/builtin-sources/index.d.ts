import { z } from "zod";
import { type PluginInitContext } from "../../src/index.js";
export declare const AvailableSourcesApi: import("../../src/index.js").PluginApiSchema<undefined, {
    from: string;
    id: string;
    name: string;
    description: string;
    type: string;
    needs?: string[] | undefined;
}[]>;
export declare const SourceFetchApi: import("../../src/index.js").PluginApiSchema<{
    sourceId: "direct-url";
    sourceOptions: {
        url: string;
    };
} | {
    sourceId: "direct-url-download";
    sourceOptions: {
        url: string;
    };
} | {
    sourceId: "youtube";
    sourceOptions: {
        url: string;
        videoId: string;
    };
}, {
    type: "stream";
    stream: ReadableStream<unknown> | null;
} | {
    type: "download";
    download: (destinationPath: string) => Promise<void>;
}>;
export declare const schemas: {
    AvailableSources: import("../../src/index.js").PluginApiSchema<undefined, {
        from: string;
        id: string;
        name: string;
        description: string;
        type: string;
        needs?: string[] | undefined;
    }[]>;
    SourceFetch: import("../../src/index.js").PluginApiSchema<{
        sourceId: "direct-url";
        sourceOptions: {
            url: string;
        };
    } | {
        sourceId: "direct-url-download";
        sourceOptions: {
            url: string;
        };
    } | {
        sourceId: "youtube";
        sourceOptions: {
            url: string;
            videoId: string;
        };
    }, {
        type: "stream";
        stream: ReadableStream<unknown> | null;
    } | {
        type: "download";
        download: (destinationPath: string) => Promise<void>;
    }>;
};
export declare const SourcesReadyEventPayloadSchema: z.ZodObject<{
    pluginId: z.ZodString;
}, z.core.$strip>;
declare function init(initContext: PluginInitContext): Promise<void> | void;
declare const _default: {
    schemas: {
        AvailableSources: import("../../src/index.js").PluginApiSchema<undefined, {
            from: string;
            id: string;
            name: string;
            description: string;
            type: string;
            needs?: string[] | undefined;
        }[]>;
        SourceFetch: import("../../src/index.js").PluginApiSchema<{
            sourceId: "direct-url";
            sourceOptions: {
                url: string;
            };
        } | {
            sourceId: "direct-url-download";
            sourceOptions: {
                url: string;
            };
        } | {
            sourceId: "youtube";
            sourceOptions: {
                url: string;
                videoId: string;
            };
        }, {
            type: "stream";
            stream: ReadableStream<unknown> | null;
        } | {
            type: "download";
            download: (destinationPath: string) => Promise<void>;
        }>;
    };
    init: typeof init;
};
export default _default;
//# sourceMappingURL=index.d.ts.map