import { z } from "zod";
import {
  definePluginApiSchema,
  type PluginInitContext,
} from "../../src/types.js";

const SearchFiltersSchema = z.object({
  type: z.enum(["movie", "show"]).optional(),
  genre: z.string().optional(),
  year: z.number().int().optional(),
  not: z.array(z.string()).optional(),
});

export const YouTubeResolveApi = definePluginApiSchema(
  "YouTubeResolve",
  z.object({
    title: z.string(),
    filters: SearchFiltersSchema.optional(),
  }),
  z.object({
    videoId: z.string(),
    title: z.string(),
    url: z.string(),
    summary: z.string(),
  }),
);

export const schemas = {
  YouTubeResolve: YouTubeResolveApi,
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function init(initContext: PluginInitContext): Promise<void> | void {
  const { api, logger, pluginId } = initContext;

  api.provideSchema(YouTubeResolveApi, async ({ title, filters }) => {
    const videoId =
      slugify(`${title}-${filters?.type ?? "video"}`) || "sample-video";
    return {
      videoId,
      title,
      url: `youtube://${videoId}`,
      summary: `YouTube source for ${title}`,
    };
  });

  logger.log(`YouTube resolver ready for ${pluginId}.`);
}

export default {
  schemas,
  init,
};
