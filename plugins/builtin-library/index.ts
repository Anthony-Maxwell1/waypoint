import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { Readable } from "stream";
import { z } from "zod";
import {
  definePluginApiSchema,
  type PluginInitContext,
} from "../../src/types.js";

const LocalAssetRefSchema = z.object({
  title: z.string(),
  slug: z.string(),
  sourceUrl: z.string().optional(),
});

export const HasLocalCopyApi = definePluginApiSchema(
  "HasLocalCopy",
  z.object({
    title: z.string(),
  }),
  z.boolean(),
);

export const StreamLocalCopyApi = definePluginApiSchema(
  "StreamLocalCopy",
  z.object({
    title: z.string(),
  }),
  z.object({
    type: z.literal("stream"),
    stream: z.custom<ReadableStream<unknown> | null>(
      (value) => value === null || typeof value === "object",
      "Expected a ReadableStream or null",
    ),
    localRef: LocalAssetRefSchema,
  }),
);

export const DownloadLocalCopyApi = definePluginApiSchema(
  "DownloadLocalCopy",
  z.object({
    title: z.string(),
    sourceUrl: z.string(),
  }),
  z.object({
    ok: z.literal(true),
    localRef: LocalAssetRefSchema,
  }),
);

export const schemas = {
  HasLocalCopy: HasLocalCopyApi,
  StreamLocalCopy: StreamLocalCopyApi,
  DownloadLocalCopy: DownloadLocalCopyApi,
};

const DATA_DIR = path.resolve(process.cwd(), "data");
const CACHE_FILE = path.join(DATA_DIR, "library-cache.json");

type CacheEntry = {
  title: string;
  slug: string;
  sourceUrl: string;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function loadCache(): Record<string, CacheEntry> {
  try {
    if (!existsSync(CACHE_FILE)) {
      return {};
    }
    const raw = readFileSync(CACHE_FILE, "utf-8");
    return JSON.parse(raw) as Record<string, CacheEntry>;
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, CacheEntry>): void {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(CACHE_FILE, `${JSON.stringify(cache, null, 2)}\n`, "utf-8");
}

function createTextStream(title: string, sourceUrl: string) {
  return Readable.toWeb(
    Readable.from([
      Buffer.from(`cached stream for ${title}\nsource: ${sourceUrl}\n`),
    ]),
  );
}

export default {
  init(initContext: PluginInitContext): void {
    const { api, manifest, events, logger, pluginId } = initContext;
    const cache = loadCache();

    api.provideSchema(HasLocalCopyApi, async ({ title }) => {
      return Boolean(cache[slugify(title)]);
    });

    api.provideSchema(StreamLocalCopyApi, async ({ title }) => {
      const entry = cache[slugify(title)];
      if (!entry) {
        throw new Error(`No cached copy exists for '${title}'`);
      }

      const queryProvider = manifest
        .all()
        .find((plugin) => plugin.apis.provides.includes("QueryPlugins"));
      if (!queryProvider) {
        throw new Error("No plugin provides QueryPlugins");
      }

      const sourceProviders = await api.call(queryProvider.id, "QueryPlugins", {
        provides: ["SourceFetch"],
      });
      const sourceProvider = sourceProviders[0];
      if (!sourceProvider) {
        throw new Error("No plugin provides SourceFetch");
      }

      const sourceFetch = await api.call(sourceProvider.id, "SourceFetch", {
        sourceId: "youtube",
        sourceOptions: {
          url: entry.sourceUrl,
          videoId: entry.slug,
        },
      });

      if (sourceFetch.type !== "stream") {
        throw new Error("Expected a stream result from SourceFetch");
      }

      return {
        type: "stream" as const,
        stream:
          sourceFetch.stream ?? createTextStream(entry.title, entry.sourceUrl),
        localRef: entry,
      };
    });

    api.provideSchema(DownloadLocalCopyApi, async ({ title, sourceUrl }) => {
      const entry: CacheEntry = {
        title,
        slug: slugify(title),
        sourceUrl,
      };
      cache[entry.slug] = entry;
      saveCache(cache);
      void events.emit("library.downloaded", {
        title,
        sourceUrl,
        slug: entry.slug,
      });
      return {
        ok: true as const,
        localRef: entry,
      };
    });

    logger.log(
      `Library cache ready with ${Object.keys(cache).length} item(s).`,
    );
    void events.emit("library.ready", { pluginId });
  },
};
