import { z } from "zod";
import { type PluginInitContext } from "../../src/index.js";
export declare const QueryPluginsApi: import("../../src/index.js").PluginApiSchema<{
    provides?: string | string[] | undefined;
    ids?: string | string[] | undefined;
} | undefined, {
    id: string;
    name: string;
    description: string;
    dependencies: {
        onLoad: string[];
        available: string[];
    };
    apis: {
        onLoad: string[];
        present: string[];
        provides: string[];
    };
}[]>;
export declare const PluginByIdApi: import("../../src/index.js").PluginApiSchema<string, {
    id: string;
    name: string;
    description: string;
    dependencies: {
        onLoad: string[];
        available: string[];
    };
    apis: {
        onLoad: string[];
        present: string[];
        provides: string[];
    };
} | null>;
export declare const CoreReadyEventPayloadSchema: z.ZodObject<{
    pluginId: z.ZodString;
}, z.core.$strip>;
export declare const schemas: {
    QueryPlugins: import("../../src/index.js").PluginApiSchema<{
        provides?: string | string[] | undefined;
        ids?: string | string[] | undefined;
    } | undefined, {
        id: string;
        name: string;
        description: string;
        dependencies: {
            onLoad: string[];
            available: string[];
        };
        apis: {
            onLoad: string[];
            present: string[];
            provides: string[];
        };
    }[]>;
    PluginById: import("../../src/index.js").PluginApiSchema<string, {
        id: string;
        name: string;
        description: string;
        dependencies: {
            onLoad: string[];
            available: string[];
        };
        apis: {
            onLoad: string[];
            present: string[];
            provides: string[];
        };
    } | null>;
};
declare function init(initContext: PluginInitContext): Promise<void> | void;
declare const _default: {
    schemas: {
        QueryPlugins: import("../../src/index.js").PluginApiSchema<{
            provides?: string | string[] | undefined;
            ids?: string | string[] | undefined;
        } | undefined, {
            id: string;
            name: string;
            description: string;
            dependencies: {
                onLoad: string[];
                available: string[];
            };
            apis: {
                onLoad: string[];
                present: string[];
                provides: string[];
            };
        }[]>;
        PluginById: import("../../src/index.js").PluginApiSchema<string, {
            id: string;
            name: string;
            description: string;
            dependencies: {
                onLoad: string[];
                available: string[];
            };
            apis: {
                onLoad: string[];
                present: string[];
                provides: string[];
            };
        } | null>;
    };
    init: typeof init;
};
export default _default;
//# sourceMappingURL=index.d.ts.map