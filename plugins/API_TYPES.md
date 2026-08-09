# Plugin Communication and API Types

Waypoint supports exactly two inter-plugin communication mechanisms:

1. Async APIs
2. Events

No other plugin-to-plugin transport is part of the contract.

## Async APIs

Async APIs are callable endpoints registered with `api.provideSchema(schema, handler)` and consumed with `await api.callSchema(providerPluginId, schema, input)`.

Typed/Zod-first registration and calls are the recommended path:

- `api.provideSchema(schema, handler)`
- `await api.callSchema(providerPluginId, schema, input)`

Each schema object contains:

- `name`
- `inputSchema` (Zod)
- `outputSchema` (Zod)

This gives:

- runtime validation for provider inputs and outputs
- runtime validation for caller inputs and outputs
- compile-time input/output inference at call sites

Capability names in plugin manifests are broad contract labels, not endpoint implementations by themselves.
The same API name may be provided by multiple plugins.
Plugins must discover compatible providers first, then call the API on that specific provider plugin id.

### Discovery contract

Capability type:

- `QueryPlugins`
- `PluginById`

Async APIs provided by this type:

- `QueryPlugins`
  - Input:
    - optional `{ provides?: string | string[], ids?: string | string[] }`
  - Output:
    - matching manifest plugin entries
- `PluginById`
  - Input:
    - plugin id string
  - Output:
    - manifest plugin entry or `null`

Usage flow:

1. Find a provider for `QueryPlugins` (for example from manifest capabilities).
2. `await api.callSchema(queryProviderId, QueryPluginsApi, { provides: ["SomeCapability"] })`
3. Choose a returned plugin id.
4. Call the API on that specific provider plugin id.

## Events

Events are pushed by an event provider plugin to its provider-scoped bus.
Consumers attach handlers to a specific provider bus.

Runtime bus contract:

- `await events.emit(eventType, payload)`
  - Emits on the current plugin bus (the emitter is the provider)
- `events.on(providerPluginId, handler)`
  - Subscribes to another plugin provider bus
  - Returns an unsubscribe function

Event shape passed to handlers:

- `providerId: string`
- `type: string`
- `payload: unknown`

### Event provider capability types

Capability type:

- `EventProvider`
  - Base capability indicating a plugin exposes an event bus

Capability type:

- `FileSystemEventProvider`
  - Convenience capability indicating filesystem-related events
  - Consumers should query this capability when they need filesystem update events

Usage flow:

1. `await api.callSchema(queryProviderId, QueryPluginsApi, { provides: ["FileSystemEventProvider"] })`
2. Subscribe with `events.on(providerId, handler)`
3. Provider emits with `await events.emit("event.type", payload)`

## Manifest semantics

In `plugins/manifest.json`:

- `apis.provides` lists broad capabilities and API contracts this plugin provides.
- `apis.onLoad` lists capabilities/APIs that must exist before plugin init runs.
- `apis.present` lists capabilities that must exist somewhere in the manifest.
