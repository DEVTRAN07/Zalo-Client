# Migration guide: `zca-js` (v2) → `zalo-client` (v3)

Version 3 rewrites the internals but keeps the wire protocol identical. Most v2 code keeps working after changing the import; this guide lists everything that actually changed.

## 1. Install the new package

```bash
npm uninstall zca-js
npm install zalo-client
```

```bash
# v2
bun add zca-js
# v3
bun add zalo-client
```

## 2. Update imports and class names

| v2 (`zca-js`)                   | v3 (`zalo-client`)                         | Notes                                           |
| ------------------------------- | ------------------------------------------ | ----------------------------------------------- |
| `import { Zalo } from "zca-js"` | `import { ZaloClient } from "zalo-client"` | `Zalo` still works (deprecated alias)           |
| `new Zalo()`                    | `new ZaloClient()`                         | same constructor options                        |
| `import { API } from "zca-js"`  | `import { ZaloApi } from "zalo-client"`    | `API` still works (deprecated alias)            |
| `ZaloApiError`                  | `ZaloApiError`                             | unchanged name; `.name` fixed to `ZaloApiError` |
| —                               | `ZaloError`                                | new base class for all library errors           |

Types (`Credentials`, `Cookie`, `Options`, `ContextSession`, all models and endpoint types) keep their names.

## 3. Option changes

```typescript
// v2
new Zalo({ selfListen: true, checkUpdate: true, logging: true });

// v3
new ZaloClient({ selfListen: true, logging: "info" });
```

-   **`checkUpdate` was removed** — the library no longer queries npm on login. Remove it from your options (passing it is a type error now, harmless at runtime).
-   **`logging` accepts levels**: `"silent" | "error" | "warn" | "info" | "verbose"` (booleans still work).
-   **New: `retry`** — `{ limit, delayMs, maxDelayMs, methods, timeoutMs }`. Defaults only retry `GET`/`HEAD`, so message sending behavior is unchanged unless you opt in:

```typescript
new ZaloClient({ retry: { limit: 5, timeoutMs: 30000, methods: ["GET", "HEAD", "POST"] } });
```

## 4. Removed dependencies

`crypto-js`, `spark-md5` and `semver` are no longer dependencies — everything runs on built-in `node:crypto`. If your code imported them only because of this library, you can drop them. Lockfiles regenerate automatically on install.

## 5. Deep imports

If you imported internals directly (this was never part of the public API, but it happened):

| v2 path                       | v3 path                            |
| ----------------------------- | ---------------------------------- |
| `zca-js/dist/utils.js`        | `zalo-client/dist/core/utils.js`   |
| `zca-js/dist/context.js`      | `zalo-client/dist/core/context.js` |
| `zca-js/dist/Errors/index.js` | `zalo-client/dist/core/errors.js`  |

Split of the old `utils.js`:

| Export                                                                                                                    | New module        |
| ------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `apiFactory`, `FactoryUtils`, `resolveResponse`                                                                           | `core/factory.js` |
| `logger`                                                                                                                  | `core/logger.js`  |
| `request`, `makeURL`, `getDefaultHeaders`                                                                                 | `core/http.js`    |
| `getSignKey`, `encodeAES`, `decodeAES`, `decryptResp`, `ParamsEncryptor`, `encryptPin`, `validatePin`, `generateZaloUUID` | `core/crypto.js`  |
| everything else (`hasOwn`, `getMd5LargeFileObject`, `formatTime`, `decodeEventData`, …)                                   | `core/utils.js`   |

## 6. Behavior notes

-   **`api.<endpoint>` is now created lazily** on first access. Reading a property before login-as-session works, using it requires a logged-in `ZaloApi` (same as before).
-   **Requests time out after 60s by default** instead of hanging forever. Configure with `retry.timeoutMs` (`0` disables).
-   **Failed idempotent requests are retried** (3 attempts, backoff 250ms→5s). Non-idempotent ones are not retried.
-   `getCookie()` still returns the live cookie jar; `cookie` handling in `Credentials` is unchanged.

## 7. Quick sanity check

```typescript
import { ZaloClient, ZaloApi, ZaloApiError } from "zalo-client";

const client = new ZaloClient({ logging: "info" });
const api = await client.login(JSON.parse(fs.readFileSync("./credentials.json", "utf-8")));
if (!(api instanceof ZaloApi)) throw new Error("unexpected api instance");
console.log("logged in as", api.getOwnId());
```
