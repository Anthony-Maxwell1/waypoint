import { z } from "zod";
import {
  definePluginApiSchema,
  type PluginInitContext,
} from "../../src/index.js";

const manifestEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  dependencies: z.object({
    onLoad: z.array(z.string()),
    available: z.array(z.string()),
  }),
  apis: z.object({
    onLoad: z.array(z.string()),
    present: z.array(z.string()),
    provides: z.array(z.string()),
  }),
});

const queryPluginsInputSchema = z
  .object({
    provides: z.union([z.string(), z.array(z.string())]).optional(),
    ids: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .optional();

export const QueryPluginsApi = definePluginApiSchema(
  "QueryPlugins",
  queryPluginsInputSchema,
  z.array(manifestEntrySchema),
);

export const PluginByIdApi = definePluginApiSchema(
  "PluginById",
  z.string(),
  manifestEntrySchema.nullable(),
);

export const CoreReadyEventPayloadSchema = z.object({
  pluginId: z.string(),
});

export const schemas = {
  QueryPlugins: QueryPluginsApi,
  PluginById: PluginByIdApi,
};

function init(initContext: PluginInitContext): Promise<void> | void {
  const { api, logger, manifest, events, pluginId } = initContext;

  api.provideSchema(QueryPluginsApi, async (filters) => {
    const provides = Array.isArray(filters?.provides)
      ? filters.provides
      : typeof filters?.provides === "string"
        ? [filters.provides]
        : [];

    const ids = Array.isArray(filters?.ids)
      ? filters.ids
      : typeof filters?.ids === "string"
        ? [filters.ids]
        : [];

    return manifest.all().filter((plugin) => {
      const idMatches = ids.length === 0 || ids.includes(plugin.id);
      const providesMatches =
        provides.length === 0 ||
        provides.every((apiName) => plugin.apis.provides.includes(apiName));
      return idMatches && providesMatches;
    });
  });

  api.provideSchema(PluginByIdApi, async (pluginIdInput) => {
    return manifest.get(pluginIdInput) ?? null;
  });

  void events.emit(
    "core.ready",
    CoreReadyEventPayloadSchema.parse({ pluginId }),
  );

  logger.log(`Hello from ${pluginId}.`);
}

export default {
  schemas,
  init,
};
