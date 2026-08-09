import { z } from "zod";
import { definePluginApiSchema, } from "../../src/index.js";
export const SearchFiltersSchema = z.object({
    type: z.enum(["movie", "show"]).optional(),
    genre: z.string().optional(),
    year: z.number().int().optional(),
    not: z.array(z.string()).optional(),
});
export const SearchResultSchema = z.object({
    id: z.string(),
    title: z.string(),
    providerId: z.string(),
    summary: z.string(),
    kind: z.string(),
    url: z.string().optional(),
    score: z.number().optional(),
});
export const SearchApi = definePluginApiSchema("Search", z.object({
    query: z.string(),
    filters: SearchFiltersSchema.optional(),
}), z.array(SearchResultSchema));
export const SearchWithFiltersApi = definePluginApiSchema("SearchWithFilters", z.object({
    query: z.string(),
    filters: SearchFiltersSchema,
}), z.array(SearchResultSchema));
export const SearchMoviesApi = definePluginApiSchema("SearchMovies", z.object({
    query: z.string(),
    filters: SearchFiltersSchema.optional(),
}), z.array(SearchResultSchema));
export const SearchShowsApi = definePluginApiSchema("SearchShows", z.object({
    query: z.string(),
    filters: SearchFiltersSchema.optional(),
}), z.array(SearchResultSchema));
export const schemas = {
    Search: SearchApi,
    SearchWithFilters: SearchWithFiltersApi,
    SearchMovies: SearchMoviesApi,
    SearchShows: SearchShowsApi,
};
const CATALOG = [
    {
        id: "neon-city",
        title: "Neon City",
        kind: "movie",
        genre: "sci-fi",
        year: 2024,
        summary: "A courier outruns a city-sized surveillance grid.",
    },
    {
        id: "quiet-river",
        title: "Quiet River",
        kind: "show",
        genre: "drama",
        year: 2023,
        summary: "A small town mystery unfolds along a fading river.",
    },
    {
        id: "orbital-run",
        title: "Orbital Run",
        kind: "movie",
        genre: "action",
        year: 2022,
        summary: "A fugitive must traverse a broken orbital ring.",
    },
    {
        id: "signal-house",
        title: "Signal House",
        kind: "show",
        genre: "thriller",
        year: 2025,
        summary: "Residents of an apartment block are linked by a hidden signal.",
    },
];
function matchesFilters(item, filters) {
    if (!filters) {
        return true;
    }
    if (filters.type && item.kind !== filters.type) {
        return false;
    }
    if (filters.genre && item.genre !== filters.genre) {
        return false;
    }
    if (filters.year && item.year !== filters.year) {
        return false;
    }
    if (filters.not?.length) {
        const haystack = `${item.title} ${item.summary} ${item.genre}`.toLowerCase();
        if (filters.not.some((term) => haystack.includes(term.toLowerCase()))) {
            return false;
        }
    }
    return true;
}
function scoreMatch(query, item) {
    const haystack = `${item.title} ${item.summary} ${item.genre}`.toLowerCase();
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    let score = 0;
    for (const term of terms) {
        if (haystack.includes(term)) {
            score += 1;
        }
    }
    return score;
}
function searchCatalog(query, filters, kind) {
    return CATALOG.filter((item) => {
        if (kind && item.kind !== kind) {
            return false;
        }
        if (!item.title.toLowerCase().includes(query.toLowerCase()) &&
            scoreMatch(query, item) === 0) {
            return false;
        }
        return matchesFilters(item, filters);
    })
        .map((item) => SearchResultSchema.parse({
        id: item.id,
        title: item.title,
        providerId: "builtin-search",
        summary: item.summary,
        kind: item.kind,
        url: `https://example.invalid/${item.id}`,
        score: scoreMatch(query, item),
    }))
        .sort((left, right) => (right.score ?? 0) - (left.score ?? 0));
}
export default {
    init(initContext) {
        const { api, logger, manifest } = initContext;
        api.provideSchema(SearchApi, async ({ query, filters }) => {
            return searchCatalog(query, filters);
        });
        api.provideSchema(SearchWithFiltersApi, async ({ query, filters }) => {
            return searchCatalog(query, filters);
        });
        api.provideSchema(SearchMoviesApi, async ({ query, filters }) => {
            return searchCatalog(query, filters, "movie");
        });
        api.provideSchema(SearchShowsApi, async ({ query, filters }) => {
            return searchCatalog(query, filters, "show");
        });
        void (async () => {
            const queryProvider = manifest
                .all()
                .find((plugin) => plugin.apis.provides.includes("QueryPlugins"));
            if (!queryProvider) {
                logger.warn("QueryPlugins provider not found during search plugin init.");
                return;
            }
            const providers = await api.callSchema(queryProvider.id, definePluginApiSchema("QueryPlugins", z
                .object({
                provides: z.union([z.string(), z.array(z.string())]).optional(),
                ids: z.union([z.string(), z.array(z.string())]).optional(),
            })
                .optional(), z.array(z.any())), {
                provides: ["Search"],
            });
            logger.log(`Search plugin ready with ${providers.length} compatible provider(s).`);
        })();
    },
    schemas,
};
//# sourceMappingURL=index.js.map