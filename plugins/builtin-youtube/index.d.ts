import { type PluginInitContext } from "../../src/index.js";
export declare const YouTubeResolveApi: import("../../src/index.js").PluginApiSchema<{
    title: string;
    filters?: {
        type?: "movie" | "show" | undefined;
        genre?: string | undefined;
        year?: number | undefined;
        not?: string[] | undefined;
    } | undefined;
}, {
    videoId: string;
    title: string;
    url: string;
    summary: string;
}>;
export declare const schemas: {
    YouTubeResolve: import("../../src/index.js").PluginApiSchema<{
        title: string;
        filters?: {
            type?: "movie" | "show" | undefined;
            genre?: string | undefined;
            year?: number | undefined;
            not?: string[] | undefined;
        } | undefined;
    }, {
        videoId: string;
        title: string;
        url: string;
        summary: string;
    }>;
};
declare function init(initContext: PluginInitContext): Promise<void> | void;
declare const _default: {
    schemas: {
        YouTubeResolve: import("../../src/index.js").PluginApiSchema<{
            title: string;
            filters?: {
                type?: "movie" | "show" | undefined;
                genre?: string | undefined;
                year?: number | undefined;
                not?: string[] | undefined;
            } | undefined;
        }, {
            videoId: string;
            title: string;
            url: string;
            summary: string;
        }>;
    };
    init: typeof init;
};
export default _default;
//# sourceMappingURL=index.d.ts.map