import { type PluginInitContext } from "../../src/index.js";
export declare const HasLocalCopyApi: import("../../src/index.js").PluginApiSchema<{
    title: string;
}, boolean>;
export declare const StreamLocalCopyApi: import("../../src/index.js").PluginApiSchema<{
    title: string;
}, {
    type: "stream";
    stream: ReadableStream<unknown> | null;
    localRef: {
        title: string;
        slug: string;
        sourceUrl?: string | undefined;
    };
}>;
export declare const DownloadLocalCopyApi: import("../../src/index.js").PluginApiSchema<{
    title: string;
    sourceUrl: string;
}, {
    ok: true;
    localRef: {
        title: string;
        slug: string;
        sourceUrl?: string | undefined;
    };
}>;
export declare const schemas: {
    HasLocalCopy: import("../../src/index.js").PluginApiSchema<{
        title: string;
    }, boolean>;
    StreamLocalCopy: import("../../src/index.js").PluginApiSchema<{
        title: string;
    }, {
        type: "stream";
        stream: ReadableStream<unknown> | null;
        localRef: {
            title: string;
            slug: string;
            sourceUrl?: string | undefined;
        };
    }>;
    DownloadLocalCopy: import("../../src/index.js").PluginApiSchema<{
        title: string;
        sourceUrl: string;
    }, {
        ok: true;
        localRef: {
            title: string;
            slug: string;
            sourceUrl?: string | undefined;
        };
    }>;
};
declare const _default: {
    init(initContext: PluginInitContext): void;
};
export default _default;
//# sourceMappingURL=index.d.ts.map