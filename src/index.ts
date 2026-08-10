import { z } from "zod";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { createServer } from "http";
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";
import { Readable } from "stream";
import {
  defaultFlowDocument,
  flowDocumentSchema,
  type FlowDocument,
  type FlowStep,
  type SearchConfig,
} from "./flow-config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGINS_DIR = path.resolve(__dirname, "../plugins");
const PLUGINS_MANIFEST = path.join(PLUGINS_DIR, "manifest.json");
const DATA_DIR = path.resolve(process.cwd(), "data");
const FLOWS_FILE = path.join(DATA_DIR, "flows.json");

const manifestSchema = z.array(
  z.object({
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
  }),
);

export type PluginManifest = z.infer<typeof manifestSchema>;
export type PluginManifestEntry = PluginManifest[number];

export interface PluginEvent {
  providerId: string;
  type: string;
  payload: any;
}

export interface PluginManifestView {
  all(): readonly PluginManifestEntry[];
  get(id: string): PluginManifestEntry | undefined;
}

export interface PluginEventBus {
  emit(type: string, payload: any): Promise<void>;
  on(
    providerPluginId: string,
    handler: (event: PluginEvent) => Promise<void> | void,
  ): () => void;
}

export interface PluginApiHandlerContext {
  callerId: string;
  pluginId: string;
  logger: PluginInitContext["logger"];
  manifest: PluginManifestView;
  events: PluginEventBus;
}

type PluginApiHandler = (
  input: any,
  context: PluginApiHandlerContext,
) => Promise<any> | any;

export interface PluginApiSchema<TInput, TOutput> {
  name: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
}

export function definePluginApiSchema<TInput, TOutput>(
  name: string,
  inputSchema: z.ZodType<TInput>,
  outputSchema: z.ZodType<TOutput>,
): PluginApiSchema<TInput, TOutput> {
  return {
    name,
    inputSchema,
    outputSchema,
  };
}

export interface PluginApiRegistry {
  provide(name: string, handler: PluginApiHandler): void;
  call<TResponse = any>(
    providerPluginId: string,
    name: string,
    input: any,
  ): Promise<TResponse>;
  provideSchema<TInput, TOutput>(
    schema: PluginApiSchema<TInput, TOutput>,
    handler: (
      input: TInput,
      context: PluginApiHandlerContext,
    ) => Promise<TOutput> | TOutput,
  ): void;
  callSchema<TInput, TOutput>(
    providerPluginId: string,
    schema: PluginApiSchema<TInput, TOutput>,
    input: TInput,
  ): Promise<TOutput>;
  has(name: string): boolean;
  list(): string[];
}

export interface PluginModule {
  init(ctx: PluginInitContext): Promise<void> | void;
}

export interface PluginInitContext {
  pluginId: string;
  logger: {
    log: (message: string) => void;
    error: (message: string) => void;
    warn: (message: string) => void;
  };
  manifest: PluginManifestView;
  api: PluginApiRegistry;
  events: PluginEventBus;
}

interface LoadedPlugin {
  manifest: PluginManifestEntry;
  module: PluginModule;
}

const loadedPlugins: LoadedPlugin[] = [];

const manifestView: PluginManifestView = {
  all: () => [...manifest],
  get: (id) => manifest.find((plugin) => plugin.id === id),
};

const apiHandlers = new Map<string, Map<string, PluginApiHandler>>();
const eventHandlers = new Map<
  string,
  Set<{
    subscriberId: string;
    handler: (event: PluginEvent) => Promise<void> | void;
  }>
>();

function createLogger(pluginId: string): PluginInitContext["logger"] {
  return {
    log: (message) => console.log(`[${pluginId}] ${message}`),
    error: (message) => console.error(`[${pluginId}] ${message}`),
    warn: (message) => console.warn(`[${pluginId}] ${message}`),
  };
}

const logger = createLogger("waypoint-runtime");

function createEventBus(pluginId: string): PluginEventBus {
  return {
    async emit(type, payload) {
      const handlers = eventHandlers.get(pluginId);
      if (!handlers || handlers.size === 0) {
        return;
      }

      const event: PluginEvent = {
        providerId: pluginId,
        type,
        payload,
      };

      await Promise.all(
        [...handlers].map(async ({ handler }) => {
          await handler(event);
        }),
      );
    },
    on(providerPluginId, handler) {
      const provider = manifestView.get(providerPluginId);
      if (!provider) {
        throw new Error(
          `Cannot subscribe to any provider '${providerPluginId}'`,
        );
      }
      if (!provider.apis.provides.includes("EventProvider")) {
        throw new Error(
          `Plugin '${providerPluginId}' does not provide EventProvider`,
        );
      }

      let handlers = eventHandlers.get(providerPluginId);
      if (!handlers) {
        handlers = new Set();
        eventHandlers.set(providerPluginId, handlers);
      }
      const entry = { subscriberId: pluginId, handler };
      handlers.add(entry);
      return () => {
        const currentHandlers = eventHandlers.get(providerPluginId);
        currentHandlers?.delete(entry);
        if (currentHandlers && currentHandlers.size === 0) {
          eventHandlers.delete(providerPluginId);
        }
      };
    },
  };
}

function createApiRegistry(pluginId: string): PluginApiRegistry {
  const provide = (name: string, handler: PluginApiHandler) => {
    let providers = apiHandlers.get(name);
    if (!providers) {
      providers = new Map();
      apiHandlers.set(name, providers);
    }

    if (providers.has(pluginId)) {
      throw new Error(
        `API '${name}' is already provided by '${pluginId}' and cannot be redefined by the same provider`,
      );
    }

    providers.set(pluginId, handler);
  };

  const call = async <TResponse = any>(
    providerPluginId: string,
    name: string,
    input: any,
  ): Promise<TResponse> => {
    const providers = apiHandlers.get(name);
    if (!providers) {
      throw new Error(`API '${name}' is not available`);
    }

    const handler = providers.get(providerPluginId);
    if (!handler) {
      throw new Error(
        `API '${name}' is not provided by plugin '${providerPluginId}'`,
      );
    }

    return (await handler(input, {
      callerId: pluginId,
      pluginId: providerPluginId,
      logger: createLogger(providerPluginId),
      manifest: manifestView,
      events: createEventBus(providerPluginId),
    })) as TResponse;
  };

  const provideSchema = <TInput, TOutput>(
    schema: PluginApiSchema<TInput, TOutput>,
    handler: (
      input: TInput,
      context: PluginApiHandlerContext,
    ) => Promise<TOutput> | TOutput,
  ): void => {
    provide(schema.name, async (rawInput, context) => {
      const parsedInput = schema.inputSchema.parse(rawInput);
      const result = await handler(parsedInput, context);
      return schema.outputSchema.parse(result);
    });
  };

  const callSchema = async <TInput, TOutput>(
    providerPluginId: string,
    schema: PluginApiSchema<TInput, TOutput>,
    input: TInput,
  ): Promise<TOutput> => {
    const parsedInput = schema.inputSchema.parse(input);
    const result = await call(providerPluginId, schema.name, parsedInput);
    return schema.outputSchema.parse(result);
  };

  return {
    provide,
    call,
    provideSchema,
    callSchema,
    has(name) {
      return apiHandlers.has(name);
    },
    list() {
      return [...apiHandlers.keys()];
    },
  };
}

function createPluginContext(pluginId: string): PluginInitContext {
  return {
    pluginId,
    logger: createLogger(pluginId),
    manifest: manifestView,
    api: createApiRegistry(pluginId),
    events: createEventBus(pluginId),
  };
}

type FlowRuntimeValue = any;

type FlowRuntimeEnv = {
  api: PluginApiRegistry;
  manifest: PluginManifestView;
  logger: PluginInitContext["logger"];
  vars: Record<string, FlowRuntimeValue>;
};

function isPlainObject(value: any): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getValueByPath(value: any, pathExpression: string): any {
  return pathExpression.split(".").reduce<any>((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, any>)[key];
    }
    return undefined;
  }, value);
}

function resolveTemplate(
  value: any,
  vars: Record<string, FlowRuntimeValue>,
): any {
  if (Array.isArray(value)) {
    return value.map((item) => resolveTemplate(item, vars));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  if (typeof value.$var === "string") {
    return getValueByPath(vars, value.$var);
  }

  const resolved: Record<string, any> = {};
  for (const [key, entry] of Object.entries(value)) {
    resolved[key] = resolveTemplate(entry, vars);
  }
  return resolved;
}

function resolveProviderSelector(
  selector: any,
  vars: Record<string, FlowRuntimeValue>,
): string {
  if (typeof selector === "string") {
    return selector;
  }
  if (!isPlainObject(selector)) {
    throw new Error("Invalid provider selector");
  }
  if (typeof selector.from !== "string") {
    throw new Error("Provider selector requires a 'from' field");
  }

  const source = vars[selector.from];
  if (Array.isArray(source)) {
    const index = typeof selector.index === "number" ? selector.index : 0;
    const selected = source[index];
    if (typeof selected === "string") {
      return selected;
    }
    if (isPlainObject(selected) && typeof selected.id === "string") {
      return selected.id;
    }
  }
  if (typeof source === "string") {
    return source;
  }
  if (isPlainObject(source) && typeof source.id === "string") {
    return source.id;
  }
  throw new Error(`Unable to resolve provider selector '${selector.from}'`);
}

function serializeResult(result: any): any {
  if (result instanceof Readable) {
    return { type: "stream", stream: result };
  }
  if (isPlainObject(result) && "stream" in result) {
    return result;
  }
  return result;
}

async function findQueryProviderId(api: PluginApiRegistry): Promise<string> {
  const queryProvider = manifestView
    .all()
    .find((plugin) => plugin.apis.provides.includes("QueryPlugins"));
  if (!queryProvider) {
    throw new Error("No plugin provides QueryPlugins");
  }
  return queryProvider.id;
}

async function queryProvidersByCapabilities(
  api: PluginApiRegistry,
  requirements: {
    allOf?: string[];
    anyOf?: string[];
    noneOf?: string[];
  },
): Promise<PluginManifestEntry[]> {
  const queryProviderId = await findQueryProviderId(api);
  const candidates = await api.call(queryProviderId, "QueryPlugins", {
    provides: requirements.allOf ?? [],
  });

  return candidates.filter((candidate: any) => {
    const provided = new Set(candidate.apis.provides);
    const anyOf = requirements.anyOf ?? [];
    const noneOf = requirements.noneOf ?? [];
    const anyOk =
      anyOf.length === 0 ||
      anyOf.some((capability) => provided.has(capability));
    const noneOk =
      noneOf.length === 0 ||
      noneOf.every((capability) => !provided.has(capability));
    return anyOk && noneOk;
  });
}

async function runSteps(steps: FlowStep[], env: FlowRuntimeEnv): Promise<any> {
  for (const step of steps as Array<Record<string, any>>) {
    switch (step.type) {
      case "query": {
        const matches = await queryProvidersByCapabilities(env.api, {
          allOf: Array.isArray(step.allOf) ? (step.allOf as string[]) : [],
          anyOf: Array.isArray(step.anyOf) ? (step.anyOf as string[]) : [],
          noneOf: Array.isArray(step.noneOf) ? (step.noneOf as string[]) : [],
        });
        env.vars[step.assign as string] = matches.map((plugin) => plugin.id);
        break;
      }
      case "set": {
        env.vars[step.assign as string] = resolveTemplate(step.value, env.vars);
        break;
      }
      case "call": {
        const providerId = resolveProviderSelector(step.provider, env.vars);
        const input = resolveTemplate(step.input, env.vars);
        const result = await env.api.call(providerId, String(step.api), input);
        if (typeof step.assign === "string") {
          env.vars[step.assign] = result;
        }
        break;
      }
      case "if": {
        const condition = step.condition as Record<string, any>;
        const providerId = resolveProviderSelector(
          condition.provider,
          env.vars,
        );
        const input = resolveTemplate(condition.input, env.vars);
        const outcome = await env.api.call(
          providerId,
          String(condition.api),
          input,
        );
        const branch = Boolean(outcome)
          ? (step.then as FlowStep[])
          : ((step.else as FlowStep[]) ?? []);
        const branchResult = await runSteps(branch, env);
        if (typeof branchResult !== "undefined") {
          return branchResult;
        }
        break;
      }
      case "background": {
        void runSteps(step.steps as FlowStep[], {
          api: env.api,
          manifest: env.manifest,
          logger: env.logger,
          vars: { ...env.vars },
        });
        break;
      }
      case "return": {
        return resolveTemplate(step.value, env.vars);
      }
      default:
        throw new Error(`any flow step '${String(step.type)}'`);
    }
  }
  return undefined;
}

function ensureDataDirectory(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadFlowDocument(): FlowDocument {
  ensureDataDirectory();
  if (!existsSync(FLOWS_FILE)) {
    saveFlowDocument(defaultFlowDocument);
    return defaultFlowDocument;
  }

  const raw = readFileSync(FLOWS_FILE, "utf-8");
  const parsed = flowDocumentSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    saveFlowDocument(defaultFlowDocument);
    return defaultFlowDocument;
  }

  return parsed.data;
}

function saveFlowDocument(document: FlowDocument): void {
  ensureDataDirectory();
  writeFileSync(FLOWS_FILE, `${JSON.stringify(document, null, 2)}\n`, "utf-8");
}

async function runStreamLikeEndpoint(
  endpoint: "stream" | "download",
  input: { title: string; filters?: any },
  flowDocument: FlowDocument,
): Promise<any> {
  const result = await runSteps(flowDocument[endpoint], {
    api: createApiRegistry("waypoint-runtime"),
    manifest: manifestView,
    logger: createLogger("waypoint-runtime"),
    vars: {
      title: input.title,
      filters: input.filters ?? {},
    },
  });
  return serializeResult(result);
}

async function runReserveEndpoint(
  input: { title: string; filters?: any },
  flowDocument: FlowDocument,
): Promise<any> {
  const result = await runSteps(flowDocument.reserve, {
    api: createApiRegistry("waypoint-runtime"),
    manifest: manifestView,
    logger: createLogger("waypoint-runtime"),
    vars: {
      title: input.title,
      filters: input.filters ?? {},
    },
  });
  return result;
}

async function runSearchEndpoint(
  input: { query: string; filters?: Record<string, any> },
  flowDocument: FlowDocument,
): Promise<any> {
  const searchConfig: SearchConfig = flowDocument.search;
  const candidates = new Map<string, any[]>();

  async function queryAndSearch(
    capabilities: string[],
    apiName: string,
  ): Promise<any[]> {
    const providers = await queryProvidersByCapabilities(
      createApiRegistry("waypoint-runtime"),
      {
        allOf: capabilities,
      },
    );
    for (const provider of providers) {
      const results = await createApiRegistry("waypoint-runtime").call(
        provider.id,
        apiName,
        {
          query: input.query,
          filters: input.filters ?? {},
        },
      );
      candidates.set(provider.id, Array.isArray(results) ? results : [results]);
    }
    return [...candidates.values()].flat();
  }

  await queryAndSearch(searchConfig.baseCapabilities, "Search");
  if (input.filters && Object.keys(input.filters).length > 0) {
    await queryAndSearch(searchConfig.filterCapabilities, "SearchWithFilters");
    if (typeof input.filters.type === "string") {
      if (input.filters.type === "movie") {
        await queryAndSearch(searchConfig.movieCapabilities, "SearchMovies");
      } else if (input.filters.type === "show") {
        await queryAndSearch(searchConfig.showCapabilities, "SearchShows");
      }
    }
  }

  const flattened: any[] = [];
  for (const results of candidates.values()) {
    flattened.push(...results);
  }
  return flattened;
}

function cleanupPluginState(pluginId: string): void {
  for (const [apiName, providers] of apiHandlers.entries()) {
    providers.delete(pluginId);
    if (providers.size === 0) {
      apiHandlers.delete(apiName);
    }
  }
  eventHandlers.delete(pluginId);
  for (const handlers of eventHandlers.values()) {
    for (const entry of [...handlers]) {
      if (entry.subscriberId === pluginId) {
        handlers.delete(entry);
      }
    }
  }
}

function checkManifest(manifest: PluginManifest): boolean {
  if (!manifestSchema.safeParse(manifest).success) {
    return false;
  }
  const deps: Array<string> = [];
  const apisNeeded: Array<string> = [];
  const available: Array<string> = [];
  const availableApis: Array<string> = [];
  manifest.forEach((plugin: PluginManifestEntry) => {
    deps.push(...plugin.dependencies.onLoad);
    deps.push(...plugin.dependencies.available);
    apisNeeded.push(...plugin.apis.present);
    apisNeeded.push(...plugin.apis.onLoad);
    availableApis.push(...plugin.apis.provides);
    available.push(plugin.id);
  });
  if (!deps.every((dep) => available.includes(dep))) {
    return false;
  }
  if (!apisNeeded.every((api) => availableApis.includes(api))) {
    return false;
  }
  return true;
}

async function loadPlugin(plugin: PluginManifestEntry): Promise<boolean> {
  try {
    const pluginEntry = path.join(PLUGINS_DIR, plugin.id, "index.ts");
    const imported = await import(pathToFileURL(pluginEntry).href);
    const mod = (imported.default ?? imported) as Partial<PluginModule>;

    if (typeof mod.init !== "function") {
      logger.error(`Plugin '${plugin.id}' does not export a valid init()`);
      return false;
    }

    const context = createPluginContext(plugin.id);

    await mod.init(context);

    loadedPlugins.push({ manifest: plugin, module: mod as PluginModule });
    return true;
  } catch (e) {
    cleanupPluginState(plugin.id);
    logger.error(`Failed to load plugin ${plugin.id}: ${(e as Error).stack ?? String(e)}`);
    return false;
  }
}

async function loadAllPlugins(manifest: PluginManifest): Promise<void> {
  logger.log(`Loading ${manifest.length} plugins...`);
  const loadedIds = new Set<string>();
  const providedApis = new Set<string>();
  let remaining = [...manifest];

  while (remaining.length > 0) {
    const stillWaiting: PluginManifestEntry[] = [];
    const readyThisPass: PluginManifestEntry[] = [];

    for (const plugin of remaining) {
      const depsOk = plugin.dependencies.onLoad.every((d) => loadedIds.has(d));
      const apisOk = plugin.apis.onLoad.every((a) => providedApis.has(a));

      if (depsOk && apisOk) {
        readyThisPass.push(plugin);
      } else {
        stillWaiting.push(plugin);
      }
    }

    if (readyThisPass.length === 0) {
      logger.error("Plugin loading stalled — unresolved dependencies:");
      for (const plugin of stillWaiting) {
        const missingDeps = plugin.dependencies.onLoad.filter(
          (d) => !loadedIds.has(d),
        );
        const missingApis = plugin.apis.onLoad.filter(
          (a) => !providedApis.has(a),
        );
        logger.error(
          `  '${plugin.id}' waiting on: deps=[${missingDeps}] apis=[${missingApis}]`,
        );
      }
      process.exit(1);
    }

    for (const plugin of readyThisPass) {
      const ok = await loadPlugin(plugin);
      if (ok) {
        loadedIds.add(plugin.id);
        plugin.apis.provides.forEach((a) => providedApis.add(a));
      }
      // if !ok: plugin silently drops out. If something else depended on it
      // via onLoad, that dependent will show up in a future stall with a clear message.
    }

    remaining = stillWaiting;
  }
}

const manifestData = readFileSync(PLUGINS_MANIFEST, "utf-8");
const manifest: PluginManifest = JSON.parse(manifestData);

if (!checkManifest(manifest)) {
  logger.error("Invalid plugin manifest");
  logger.warn(`The plugin manifest must satisfy the following conditions:

    - All dependencies of each plugin must be present in the manifest.
    - All APIs required by each plugin must be provided by some plugin in the manifest.
    - Each entry in the manifest must conform to the following shape, where all fields are required:

    {
      id: string,
      name: string,
      description: string,
      dependencies: {
        onLoad: string[],
        available: string[]
      },
      apis: {
        onLoad: string[],
        present: string[],
        provides: string[]
      }
    }
    `);
  process.exit(1);
}

await loadAllPlugins(manifest);

let activeFlowDocument = loadFlowDocument();

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderUi(flowDocument: FlowDocument): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Waypoint</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #0b1020;
        --panel: rgba(18, 24, 44, 0.86);
        --panel-border: rgba(131, 151, 179, 0.18);
        --text: #e6edf7;
        --muted: #8fa3bf;
        --accent: #75a7ff;
        --accent-2: #7af2c3;
        --danger: #ff7b7b;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(117, 167, 255, 0.18), transparent 28%),
          radial-gradient(circle at right, rgba(122, 242, 195, 0.12), transparent 24%),
          var(--bg);
      }
      .shell {
        width: min(1400px, calc(100vw - 32px));
        margin: 16px auto;
        display: grid;
        grid-template-columns: 1.3fr 0.9fr;
        gap: 16px;
      }
      .card {
        background: var(--panel);
        border: 1px solid var(--panel-border);
        border-radius: 18px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
        backdrop-filter: blur(16px);
      }
      .header {
        padding: 24px 24px 16px;
      }
      .title {
        margin: 0;
        font-size: 32px;
        letter-spacing: -0.03em;
      }
      .subtitle {
        margin: 8px 0 0;
        color: var(--muted);
      }
      .content { padding: 24px; }
      .grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      label {
        display: grid;
        gap: 8px;
        font-size: 14px;
        color: var(--muted);
      }
      input, textarea, select, button {
        font: inherit;
      }
      input, textarea, select {
        width: 100%;
        border-radius: 12px;
        border: 1px solid rgba(143, 163, 191, 0.24);
        background: rgba(5, 10, 24, 0.72);
        color: var(--text);
        padding: 12px 14px;
      }
      textarea {
        min-height: 520px;
        resize: vertical;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        line-height: 1.45;
      }
      .toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin: 16px 0;
      }
      button {
        border: 0;
        border-radius: 999px;
        padding: 11px 16px;
        cursor: pointer;
        background: rgba(117, 167, 255, 0.18);
        color: var(--text);
      }
      button.primary { background: linear-gradient(135deg, var(--accent), var(--accent-2)); color: #04111e; font-weight: 700; }
      button.danger { background: rgba(255, 123, 123, 0.18); color: #ffd3d3; }
      pre {
        white-space: pre-wrap;
        word-break: break-word;
        margin: 0;
        padding: 18px;
        min-height: 240px;
        border-radius: 14px;
        background: rgba(5, 10, 24, 0.72);
        border: 1px solid rgba(143, 163, 191, 0.18);
      }
      .muted { color: var(--muted); }
      .stack { display: grid; gap: 14px; }
      .small { font-size: 13px; }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(117, 167, 255, 0.16);
        color: #cfe0ff;
        font-size: 12px;
      }
      @media (max-width: 1100px) {
        .shell { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="card">
        <div class="header">
          <div class="badge">Waypoint basic UI</div>
          <h1 class="title">Flows, testing, and provider-scoped plugin APIs</h1>
          <p class="subtitle">Edit the flow document, save it, and test the four endpoints without leaving the browser.</p>
        </div>
        <div class="content stack">
          <div class="grid">
            <label>Title<input id="title" value="Neon City" /></label>
            <label>Query<input id="query" value="Neon City" /></label>
            <label>Filters JSON<textarea id="filters" style="min-height: 120px;">{}</textarea></label>
            <label>Endpoint<select id="endpoint">
              <option value="stream">stream</option>
              <option value="download">download</option>
              <option value="reserve">reserve</option>
              <option value="search">search</option>
            </select></label>
          </div>
          <div class="toolbar">
            <button class="primary" id="run">Run endpoint</button>
            <button id="load">Reload config</button>
            <button id="save">Save config</button>
            <button class="danger" id="reset">Reset defaults</button>
          </div>
          <label>Flow JSON<textarea id="flow">${escapeHtml(JSON.stringify(flowDocument, null, 2))}</textarea></label>
        </div>
      </section>
      <section class="card">
        <div class="header">
          <h2 class="title" style="font-size: 24px;">Output</h2>
          <p class="subtitle">Responses from the runtime show up here.</p>
        </div>
        <div class="content">
          <pre id="output">Ready.</pre>
        </div>
      </section>
    </main>
    <script>
      const $ = (id) => document.getElementById(id);
      const output = $('output');
      const flow = $('flow');
      const title = $('title');
      const query = $('query');
      const filters = $('filters');
      const endpoint = $('endpoint');

      async function refreshConfig() {
        const res = await fetch('/api/flows');
        const data = await res.json();
        flow.value = JSON.stringify(data, null, 2);
        output.textContent = 'Config loaded.';
      }

      async function saveConfig() {
        const parsed = JSON.parse(flow.value);
        const res = await fetch('/api/flows', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(parsed),
        });
        const data = await res.json();
        output.textContent = JSON.stringify(data, null, 2);
      }

      async function runEndpoint() {
        const body = endpoint.value === 'search'
          ? { query: query.value, filters: JSON.parse(filters.value || '{}') }
          : { title: title.value, filters: JSON.parse(filters.value || '{}') };
        const res = await fetch('/api/' + endpoint.value, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
        const text = await res.text();
        output.textContent = text;
      }

      $('run').addEventListener('click', () => runEndpoint().catch((error) => output.textContent = error.stack || String(error)));
      $('save').addEventListener('click', () => saveConfig().catch((error) => output.textContent = error.stack || String(error)));
      $('load').addEventListener('click', () => refreshConfig().catch((error) => output.textContent = error.stack || String(error)));
      $('reset').addEventListener('click', async () => {
        flow.value = JSON.stringify(await (await fetch('/api/flows/default')).json(), null, 2);
        output.textContent = 'Default config loaded into editor.';
      });
    </script>
  </body>
</html>`;
}

async function readJsonBody(
  request: import("http").IncomingMessage,
): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf-8");
  return raw ? JSON.parse(raw) : {};
}

function sendJson(
  response: import("http").ServerResponse,
  statusCode: number,
  value: any,
): void {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(value, null, 2));
}

function sendStream(response: import("http").ServerResponse, value: any): void {
  const streamValue =
    isPlainObject(value) && "stream" in value
      ? (value as { stream?: any }).stream
      : undefined;
  if (!streamValue) {
    sendJson(response, 200, value);
    return;
  }

  response.statusCode = 200;
  response.setHeader("content-type", "application/octet-stream");

  if (typeof (streamValue as ReadableStream).getReader === "function") {
    Readable.fromWeb(streamValue as ReadableStream).pipe(response);
    return;
  }

  if (streamValue instanceof Readable) {
    streamValue.pipe(response);
    return;
  }

  response.end(String(streamValue));
}

async function executeEndpoint(
  endpoint: "stream" | "download" | "reserve" | "search",
  body: any,
): Promise<any> {
  const flowDocument = activeFlowDocument;
  if (endpoint === "search") {
    const input = isPlainObject(body)
      ? (body as { query?: any; filters?: any })
      : {};
    const query = typeof input.query === "string" ? input.query : "";
    const filters = isPlainObject(input.filters)
      ? (input.filters as Record<string, any>)
      : {};
    const runtimeApi = createApiRegistry("waypoint-runtime");
    const searchProviders = new Set<PluginManifestEntry>();

    async function collect(
      capabilities: string[],
      apiName: string,
    ): Promise<any[]> {
      if (capabilities.length === 0) {
        return [];
      }
      const providers = await queryProvidersByCapabilities(runtimeApi, {
        allOf: capabilities,
      });
      for (const provider of providers) {
        searchProviders.add(provider);
      }
      const results: any[] = [];
      for (const provider of providers) {
        const data = await runtimeApi.call(provider.id, apiName, {
          query,
          filters,
        });
        if (Array.isArray(data)) {
          results.push(...data);
        }
      }
      return results;
    }

    const results: any[] = [];
    await collect(flowDocument.search.baseCapabilities, "Search");
    if (Object.keys(filters).length > 0) {
      await collect(
        flowDocument.search.filterCapabilities,
        "SearchWithFilters",
      );
      if (filters.type === "movie") {
        await collect(flowDocument.search.movieCapabilities, "SearchMovies");
      } else if (filters.type === "show") {
        await collect(flowDocument.search.showCapabilities, "SearchShows");
      }
    }
    for (const provider of searchProviders) {
      for (const apiName of flowDocument.search.baseCapabilities) {
        const data = await runtimeApi.call(provider.id, apiName, {
          query,
          filters,
        });
        if (Array.isArray(data)) {
          results.push(...data);
        }
      }
    }
    return results;
  }

  const vars = {
    title:
      isPlainObject(body) && typeof body.title === "string"
        ? body.title
        : "Untitled",
    filters:
      isPlainObject(body) && isPlainObject(body.filters) ? body.filters : {},
  };

  const result = await runSteps(flowDocument[endpoint], {
    api: createApiRegistry("waypoint-runtime"),
    manifest: manifestView,
    logger: createLogger("waypoint-runtime"),
    vars,
  });
  return serializeResult(result);
}

const server = createServer(async (request, response) => {
  const url = request.url ?? "/";
  try {
    if (request.method === "GET" && url === "/") {
      response.statusCode = 200;
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(renderUi(activeFlowDocument));
      return;
    }

    if (request.method === "GET" && url === "/api/flows") {
      sendJson(response, 200, activeFlowDocument);
      return;
    }

    if (request.method === "GET" && url === "/api/flows/default") {
      sendJson(response, 200, defaultFlowDocument);
      return;
    }

    if (request.method === "PUT" && url === "/api/flows") {
      const parsed = flowDocumentSchema.parse(await readJsonBody(request));
      activeFlowDocument = parsed;
      saveFlowDocument(parsed);
      sendJson(response, 200, { ok: true, saved: true });
      return;
    }

    if (
      request.method === "POST" &&
      ["/api/stream", "/api/download", "/api/reserve", "/api/search"].includes(
        url,
      )
    ) {
      const endpoint = url.slice("/api/".length) as
        | "stream"
        | "download"
        | "reserve"
        | "search";
      const body = await readJsonBody(request);
      const result = await executeEndpoint(endpoint, body);
      if (endpoint === "stream" || endpoint === "download") {
        sendStream(response, result);
        return;
      }
      sendJson(response, 200, result);
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(3000, () => {
  logger.log(`Loaded ${loadedPlugins.length} plugin(s).`);
  logger.log("Waypoint UI available at http://localhost:3000");
});
