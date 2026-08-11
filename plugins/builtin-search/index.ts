import { z } from "zod";
import {
  definePluginApiSchema,
  SearchResultSchema,
  SearchFiltersSchema,
  SearchApi,
  SearchWithFiltersApi,
  SearchMoviesApi,
  SearchShowsApi,
  type PluginInitContext,
} from "../../src/types.js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

export const schemas = {
  Search: SearchApi,
  SearchWithFilters: SearchWithFiltersApi,
  SearchMovies: SearchMoviesApi,
  SearchShows: SearchShowsApi,
};

async function searchCatalog(
  query: string,
  filters?: z.infer<typeof SearchFiltersSchema>,
  type?: "movie" | "show" | "audio",
) {
  if (filters?.type) type = filters.type;
  const results: z.infer<typeof SearchResultSchema>[] = [];
  if (type) {
    switch (type) {
      case "movie":
        const res = await fetch(
          `https://api.themoviedb.org/3/search/movie?include_adult=false&language=en-US&page=1&query=${encodeURIComponent(query)}${filters?.year ? `&year=${filters.year}` : ""}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.TMDB_TOKEN}`,
            },
          },
        );
        const data: { results: any[] } = (await res.json()) as {
          results: any[];
        };
        if (data && data.results) {
          for (const item of data.results) {
            results.push({
              id: item.id.toString(),
              title: item.title,
              providerId: "builtin-search",
              providerData: {
                source: "tmdb",
                originalData: item,
              },
              summary: item.overview,
              kind: "movie",
              url: `https://www.themoviedb.org/movie/${item.id}`,
            });
          }
        }
        break;
      case "show":
        const res2 = await fetch(
          `https://api.themoviedb.org/3/search/tv?include_adult=false&language=en-US&page=1&query=${encodeURIComponent(query)}${filters?.year ? `&first_air_date_year=${filters.year}` : ""}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.TMDB_TOKEN}`,
            },
          },
        );
        const data2: { results: any[] } = (await res2.json()) as {
          results: any[];
        };
        if (data2 && data2.results) {
          for (const item of data2.results) {
            results.push({
              id: item.id.toString(),
              title: item.name,
              providerId: "builtin-search",
              providerData: {
                source: "tmdb",
                originalData: item,
              },
              summary: item.overview,
              kind: "show",
              url: `https://www.themoviedb.org/tv/${item.id}`,
            });
          }
        }
        break;
      case "audio":
        break;
    }
  } else {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/multi?include_adult=false&language=en-US&page=1&query=${encodeURIComponent(query)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.TMDB_TOKEN}`,
        },
      },
    );
    const data: { results: any[] } = (await res.json()) as {
      results: any[];
    };
    if (data && data.results) {
      for (const item of data.results) {
        results.push({
          id: item.id.toString(),
          title: item.name || item.title,
          providerId: "builtin-search",
          providerData: {
            source: "tmdb",
            originalData: item,
          },
          summary: item.overview,
          kind: item.media_type,
          url: `https://www.themoviedb.org/${item.media_type}/${item.id}`,
        });
      }
    }
  }
  return results;
}

export default {
  init(initContext: PluginInitContext): void {
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
        logger.warn(
          "QueryPlugins provider not found during search plugin init.",
        );
        return;
      }
      const providers = await api.callSchema(
        queryProvider.id,
        definePluginApiSchema(
          "QueryPlugins",
          z
            .object({
              provides: z.union([z.string(), z.array(z.string())]).optional(),
              ids: z.union([z.string(), z.array(z.string())]).optional(),
            })
            .optional(),
          z.array(z.any()),
        ),
        {
          provides: ["Search"],
        },
      );
      logger.log(
        `Search plugin ready with ${providers.length} compatible provider(s).`,
      );
    })();
  },
  schemas,
};
