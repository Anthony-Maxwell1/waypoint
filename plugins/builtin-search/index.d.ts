import { z } from "zod";
import { type PluginInitContext } from "../../src/index.js";
export declare const SearchFiltersSchema: z.ZodObject<{
    type: z.ZodOptional<z.ZodEnum<{
        movie: "movie";
        show: "show";
    }>>;
    genre: z.ZodOptional<z.ZodString>;
    year: z.ZodOptional<z.ZodNumber>;
    not: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const SearchResultSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    providerId: z.ZodString;
    summary: z.ZodString;
    kind: z.ZodString;
    url: z.ZodOptional<z.ZodString>;
    score: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const SearchApi: import("../../src/index.js").PluginApiSchema<{
    query: string;
    filters?: {
        type?: "movie" | "show" | undefined;
        genre?: string | undefined;
        year?: number | undefined;
        not?: string[] | undefined;
    } | undefined;
}, {
    id: string;
    title: string;
    providerId: string;
    summary: string;
    kind: string;
    url?: string | undefined;
    score?: number | undefined;
}[]>;
export declare const SearchWithFiltersApi: import("../../src/index.js").PluginApiSchema<{
    query: string;
    filters: {
        type?: "movie" | "show" | undefined;
        genre?: string | undefined;
        year?: number | undefined;
        not?: string[] | undefined;
    };
}, {
    id: string;
    title: string;
    providerId: string;
    summary: string;
    kind: string;
    url?: string | undefined;
    score?: number | undefined;
}[]>;
export declare const SearchMoviesApi: import("../../src/index.js").PluginApiSchema<{
    query: string;
    filters?: {
        type?: "movie" | "show" | undefined;
        genre?: string | undefined;
        year?: number | undefined;
        not?: string[] | undefined;
    } | undefined;
}, {
    id: string;
    title: string;
    providerId: string;
    summary: string;
    kind: string;
    url?: string | undefined;
    score?: number | undefined;
}[]>;
export declare const SearchShowsApi: import("../../src/index.js").PluginApiSchema<{
    query: string;
    filters?: {
        type?: "movie" | "show" | undefined;
        genre?: string | undefined;
        year?: number | undefined;
        not?: string[] | undefined;
    } | undefined;
}, {
    id: string;
    title: string;
    providerId: string;
    summary: string;
    kind: string;
    url?: string | undefined;
    score?: number | undefined;
}[]>;
export declare const schemas: {
    Search: import("../../src/index.js").PluginApiSchema<{
        query: string;
        filters?: {
            type?: "movie" | "show" | undefined;
            genre?: string | undefined;
            year?: number | undefined;
            not?: string[] | undefined;
        } | undefined;
    }, {
        id: string;
        title: string;
        providerId: string;
        summary: string;
        kind: string;
        url?: string | undefined;
        score?: number | undefined;
    }[]>;
    SearchWithFilters: import("../../src/index.js").PluginApiSchema<{
        query: string;
        filters: {
            type?: "movie" | "show" | undefined;
            genre?: string | undefined;
            year?: number | undefined;
            not?: string[] | undefined;
        };
    }, {
        id: string;
        title: string;
        providerId: string;
        summary: string;
        kind: string;
        url?: string | undefined;
        score?: number | undefined;
    }[]>;
    SearchMovies: import("../../src/index.js").PluginApiSchema<{
        query: string;
        filters?: {
            type?: "movie" | "show" | undefined;
            genre?: string | undefined;
            year?: number | undefined;
            not?: string[] | undefined;
        } | undefined;
    }, {
        id: string;
        title: string;
        providerId: string;
        summary: string;
        kind: string;
        url?: string | undefined;
        score?: number | undefined;
    }[]>;
    SearchShows: import("../../src/index.js").PluginApiSchema<{
        query: string;
        filters?: {
            type?: "movie" | "show" | undefined;
            genre?: string | undefined;
            year?: number | undefined;
            not?: string[] | undefined;
        } | undefined;
    }, {
        id: string;
        title: string;
        providerId: string;
        summary: string;
        kind: string;
        url?: string | undefined;
        score?: number | undefined;
    }[]>;
};
declare const _default: {
    init(initContext: PluginInitContext): void;
    schemas: {
        Search: import("../../src/index.js").PluginApiSchema<{
            query: string;
            filters?: {
                type?: "movie" | "show" | undefined;
                genre?: string | undefined;
                year?: number | undefined;
                not?: string[] | undefined;
            } | undefined;
        }, {
            id: string;
            title: string;
            providerId: string;
            summary: string;
            kind: string;
            url?: string | undefined;
            score?: number | undefined;
        }[]>;
        SearchWithFilters: import("../../src/index.js").PluginApiSchema<{
            query: string;
            filters: {
                type?: "movie" | "show" | undefined;
                genre?: string | undefined;
                year?: number | undefined;
                not?: string[] | undefined;
            };
        }, {
            id: string;
            title: string;
            providerId: string;
            summary: string;
            kind: string;
            url?: string | undefined;
            score?: number | undefined;
        }[]>;
        SearchMovies: import("../../src/index.js").PluginApiSchema<{
            query: string;
            filters?: {
                type?: "movie" | "show" | undefined;
                genre?: string | undefined;
                year?: number | undefined;
                not?: string[] | undefined;
            } | undefined;
        }, {
            id: string;
            title: string;
            providerId: string;
            summary: string;
            kind: string;
            url?: string | undefined;
            score?: number | undefined;
        }[]>;
        SearchShows: import("../../src/index.js").PluginApiSchema<{
            query: string;
            filters?: {
                type?: "movie" | "show" | undefined;
                genre?: string | undefined;
                year?: number | undefined;
                not?: string[] | undefined;
            } | undefined;
        }, {
            id: string;
            title: string;
            providerId: string;
            summary: string;
            kind: string;
            url?: string | undefined;
            score?: number | undefined;
        }[]>;
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map