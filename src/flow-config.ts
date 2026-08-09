import { z } from "zod";

const jsonRefSchema = z.object({
  $var: z.string(),
});

const providerSelectorSchema = z.union([
  z.string(),
  z.object({
    from: z.string(),
    index: z.number().int().nonnegative().optional(),
  }),
]);

const jsonTemplateSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    jsonRefSchema,
    z.array(jsonTemplateSchema),
    z.record(z.string(), jsonTemplateSchema),
  ]),
);

const queryStepSchema = z.object({
  type: z.literal("query"),
  assign: z.string(),
  allOf: z.array(z.string()).default([]),
  anyOf: z.array(z.string()).default([]),
  noneOf: z.array(z.string()).default([]),
});

const callStepSchema: z.ZodType<unknown> = z.object({
  type: z.literal("call"),
  provider: providerSelectorSchema,
  api: z.string(),
  input: jsonTemplateSchema.optional(),
  assign: z.string().optional(),
});

const setStepSchema = z.object({
  type: z.literal("set"),
  assign: z.string(),
  value: jsonTemplateSchema,
});

const returnStepSchema = z.object({
  type: z.literal("return"),
  value: jsonTemplateSchema,
});

const backgroundStepSchema: z.ZodType<unknown> = z.object({
  type: z.literal("background"),
  steps: z.array(z.lazy(() => flowStepSchema)),
});

const ifStepSchema: z.ZodType<unknown> = z.object({
  type: z.literal("if"),
  condition: callStepSchema,
  then: z.array(z.lazy(() => flowStepSchema)),
  else: z.array(z.lazy(() => flowStepSchema)).optional(),
});

export const flowStepSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    queryStepSchema,
    callStepSchema,
    setStepSchema,
    returnStepSchema,
    backgroundStepSchema,
    ifStepSchema,
  ]),
);

export const searchConfigSchema = z.object({
  baseCapabilities: z.array(z.string()).default(["Search"]),
  filterCapabilities: z.array(z.string()).default(["SearchWithFilters"]),
  movieCapabilities: z.array(z.string()).default(["SearchMovies"]),
  showCapabilities: z.array(z.string()).default(["SearchShows"]),
});

export const flowDocumentSchema = z.object({
  stream: z.array(flowStepSchema),
  download: z.array(flowStepSchema),
  reserve: z.array(flowStepSchema),
  search: searchConfigSchema,
});

export type FlowDocument = z.infer<typeof flowDocumentSchema>;
export type FlowStep = z.infer<typeof flowStepSchema>;
export type SearchConfig = z.infer<typeof searchConfigSchema>;

export const defaultFlowDocument: FlowDocument = {
  stream: [
    {
      type: "query",
      assign: "localProviders",
      allOf: ["HasLocalCopy", "StreamLocalCopy", "DownloadLocalCopy"],
      anyOf: [],
      noneOf: [],
    },
    {
      type: "if",
      condition: {
        type: "call",
        provider: { from: "localProviders", index: 0 },
        api: "HasLocalCopy",
        input: { title: { $var: "title" } },
      },
      then: [
        {
          type: "call",
          provider: { from: "localProviders", index: 0 },
          api: "StreamLocalCopy",
          input: { title: { $var: "title" } },
          assign: "streamResult",
        },
        {
          type: "return",
          value: { $var: "streamResult" },
        },
      ],
      else: [
        {
          type: "query",
          assign: "youtubeProviders",
          allOf: ["YouTubeResolve"],
          anyOf: [],
          noneOf: [],
        },
        {
          type: "call",
          provider: { from: "youtubeProviders", index: 0 },
          api: "YouTubeResolve",
          input: { title: { $var: "title" }, filters: { $var: "filters" } },
          assign: "resolved",
        },
        {
          type: "query",
          assign: "sourceProviders",
          allOf: ["SourceFetch"],
          anyOf: [],
          noneOf: [],
        },
        {
          type: "call",
          provider: { from: "sourceProviders", index: 0 },
          api: "SourceFetch",
          input: {
            sourceId: "youtube",
            sourceOptions: {
              url: { $var: "resolved.url" },
              videoId: { $var: "resolved.videoId" },
            },
          },
          assign: "streamResult",
        },
        {
          type: "background",
          steps: [
            {
              type: "call",
              provider: { from: "localProviders", index: 0 },
              api: "DownloadLocalCopy",
              input: {
                title: { $var: "title" },
                sourceUrl: { $var: "resolved.url" },
              },
              assign: "downloadResult",
            },
          ],
        },
        {
          type: "return",
          value: { $var: "streamResult" },
        },
      ],
    },
  ],
  download: [
    {
      type: "query",
      assign: "localProviders",
      allOf: ["HasLocalCopy", "StreamLocalCopy", "DownloadLocalCopy"],
      anyOf: [],
      noneOf: [],
    },
    {
      type: "if",
      condition: {
        type: "call",
        provider: { from: "localProviders", index: 0 },
        api: "HasLocalCopy",
        input: { title: { $var: "title" } },
      },
      then: [
        {
          type: "call",
          provider: { from: "localProviders", index: 0 },
          api: "StreamLocalCopy",
          input: { title: { $var: "title" } },
          assign: "streamResult",
        },
        {
          type: "return",
          value: { $var: "streamResult" },
        },
      ],
      else: [
        {
          type: "query",
          assign: "youtubeProviders",
          allOf: ["YouTubeResolve"],
          anyOf: [],
          noneOf: [],
        },
        {
          type: "call",
          provider: { from: "youtubeProviders", index: 0 },
          api: "YouTubeResolve",
          input: { title: { $var: "title" }, filters: { $var: "filters" } },
          assign: "resolved",
        },
        {
          type: "background",
          steps: [
            {
              type: "call",
              provider: { from: "localProviders", index: 0 },
              api: "DownloadLocalCopy",
              input: {
                title: { $var: "title" },
                sourceUrl: { $var: "resolved.url" },
              },
              assign: "downloadResult",
            },
          ],
        },
        {
          type: "query",
          assign: "sourceProviders",
          allOf: ["SourceFetch"],
          anyOf: [],
          noneOf: [],
        },
        {
          type: "call",
          provider: { from: "sourceProviders", index: 0 },
          api: "SourceFetch",
          input: {
            sourceId: "youtube",
            sourceOptions: {
              url: { $var: "resolved.url" },
              videoId: { $var: "resolved.videoId" },
            },
          },
          assign: "streamResult",
        },
        {
          type: "return",
          value: { $var: "streamResult" },
        },
      ],
    },
  ],
  reserve: [
    {
      type: "query",
      assign: "localProviders",
      allOf: ["HasLocalCopy", "DownloadLocalCopy"],
      anyOf: [],
      noneOf: [],
    },
    {
      type: "if",
      condition: {
        type: "call",
        provider: { from: "localProviders", index: 0 },
        api: "HasLocalCopy",
        input: { title: { $var: "title" } },
      },
      then: [
        {
          type: "set",
          assign: "reserveResult",
          value: { reserved: true, cached: true, title: { $var: "title" } },
        },
        {
          type: "return",
          value: { $var: "reserveResult" },
        },
      ],
      else: [
        {
          type: "query",
          assign: "youtubeProviders",
          allOf: ["YouTubeResolve"],
          anyOf: [],
          noneOf: [],
        },
        {
          type: "call",
          provider: { from: "youtubeProviders", index: 0 },
          api: "YouTubeResolve",
          input: { title: { $var: "title" }, filters: { $var: "filters" } },
          assign: "resolved",
        },
        {
          type: "call",
          provider: { from: "localProviders", index: 0 },
          api: "DownloadLocalCopy",
          input: {
            title: { $var: "title" },
            sourceUrl: { $var: "resolved.url" },
          },
          assign: "downloadResult",
        },
        {
          type: "set",
          assign: "reserveResult",
          value: { reserved: true, cached: false, title: { $var: "title" } },
        },
        {
          type: "return",
          value: { $var: "reserveResult" },
        },
      ],
    },
  ],
  search: {
    baseCapabilities: ["Search"],
    filterCapabilities: ["SearchWithFilters"],
    movieCapabilities: ["SearchMovies"],
    showCapabilities: ["SearchShows"],
  },
};
