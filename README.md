# Zalo Client

> [!NOTE]
> Unofficial Zalo API for personal accounts. It works by simulating a browser session against Zalo Web, so no official API key or partnership is required.

> [!WARNING]
> Using this API could get your account limited or banned. Use it at your own risk.

[![npm version](https://img.shields.io/npm/v/zalo-client)](https://www.npmjs.com/package/zalo-client)
[![license](https://img.shields.io/npm/l/zalo-client)](./LICENSE)

**Zalo Client** is a modern, dependency-light Zalo client for Node.js, Bun and Deno. Version 3 is a ground-up rewrite of the internals: the same 150+ endpoints and the same wire protocol, running on a modular core with built-in `node:crypto`, streaming file hashing, lazy endpoint binding, an HTTP retry/timeout policy and leveled logging.

---

## Table of Contents

-   [Installation](#installation)
-   [Quick start](#quick-start)
-   [Login](#login)
    -   [Cookie login](#cookie-login)
    -   [QR login](#qr-login)
-   [Listening to events](#listening-to-events)
-   [Sending messages](#sending-messages)
-   [Sending files](#sending-files)
-   [Configuration](#configuration)
    -   [Logging](#logging)
    -   [Retry & timeout](#retry--timeout)
    -   [Proxy](#proxy)
    -   [Image metadata](#image-metadata)
-   [Error handling](#error-handling)
-   [Custom endpoints](#custom-endpoints)
-   [Project structure](#project-structure)
-   [Migrating from v2](#migrating-from-v2)
-   [Contributing](#contributing)
-   [License](#license)

---

## Installation

```bash
bun add zalo-client # or npm install zalo-client / pnpm add zalo-client
```

Runtime dependencies (that's all of them): `form-data`, `json-bigint`, `pako`, `tough-cookie`, `ws`.
Requires Node.js >= 20 (Bun and Deno also work).

## Quick start

```typescript
import { ZaloClient, ThreadType } from "zalo-client";

const client = new ZaloClient();

// first run: scan the QR code that is printed/saved to ./qr.png
const api = await client.loginQR({ qrPath: "./qr.png" });

// the credentials event lets you persist the session for next time
// (see "QR login" below)

api.listener.on("message", (message) => {
    if (message.isSelf || typeof message.data.content !== "string") return;
    void api.sendMessage({ msg: `echo: ${message.data.content}`, quote: message.data }, message.threadId, message.type);
});

api.listener.start();
console.log("uid:", api.getOwnId());
```

## Login

### Cookie login

Reuse an existing session (IMEI + cookie + userAgent must come from the same browser profile):

```typescript
import { ZaloClient, type Credentials } from "zalo-client";
import fs from "node:fs";

const credentials: Credentials = JSON.parse(fs.readFileSync("./credentials.json", "utf-8"));

const client = new ZaloClient();
const api = await client.login(credentials); // throws ZaloApiError("Missing required params") on bad input
```

### QR login

```typescript
import { ZaloClient, LoginQRCallbackEventType, type Credentials } from "zalo-client";
import fs from "node:fs";

const client = new ZaloClient();

let saved: Credentials | null = null;

const api = await client.loginQR({ qrPath: "./qr.png" }, (event) => {
    switch (event.type) {
        case LoginQRCallbackEventType.QRCodeGenerated:
            console.log("Scan the QR code at ./qr.png (or read event.data.image)");
            break;
        case LoginQRCallbackEventType.QRCodeExpired:
            event.actions.retry();
            break;
        case LoginQRCallbackEventType.GotLoginInfo:
            // persist these three fields to skip QR next time
            saved = {
                imei: event.data.imei,
                cookie: event.data.cookie,
                userAgent: event.data.userAgent,
            };
            fs.writeFileSync("./credentials.json", JSON.stringify(saved, null, 2));
            break;
    }
});
```

Next run, load `credentials.json` and call `client.login(credentials)` instead — no QR needed.

## Listening to events

```typescript
api.listener.on("message", (message) => {
    switch (message.type) {
        case ThreadType.User:
            console.log("DM:", message.data.content);
            break;
        case ThreadType.Group:
            console.log("Group message:", message.data.content);
            break;
    }
});

api.listener.on("reaction", (reaction) => console.log("reaction", reaction));
api.listener.on("group_event", (event) => console.log("group event", event));
api.listener.on("friend_event", (event) => console.log("friend event", event));
api.listener.on("undo", (data) => console.log("undo", data));
api.listener.on("typing", (typing) => console.log("typing", typing));
api.listener.on("connected", () => console.log("socket connected"));
api.listener.on("closed", (code, reason) => console.log("socket closed", code, reason));
api.listener.on("error", (error) => console.error(error));

api.listener.start();
```

> [!IMPORTANT]
> Only one web listener can run per account at a time. If you open Zalo in a browser while the listener is active, the listener is stopped automatically.

## Sending messages

```typescript
// plain text
await api.sendMessage("hello", "<threadId>", ThreadType.User);

// styled + reply
await api.sendMessage(
    {
        msg: "hello **world**",
        quote: originalMessage.data, // reply to a received message
        styles: [{ start: 0, len: 5, st: "b" }], // b/i/u/s, colors: c_db342e, sizes: f_18
        urgency: "urgent",
        ttl: 0,
    },
    "<threadId>",
    ThreadType.Group,
);

// sticker / card / link / voice / video
const stickerIds = await api.getStickers("hello");
const sticker = await api.getStickersDetail(stickerIds[0]);
await api.sendSticker(sticker, "<threadId>", ThreadType.User);
```

## Sending files

```typescript
// local file path (needs imageMetadataGetter, see Configuration)
await api.sendMessage({ msg: "", attachments: ["./cat.png"] }, "<threadId>", ThreadType.User);

// or upload first and reuse the returned attachment
const attachment = await api.uploadAttachment("./cat.png", ThreadType.User);
await api.sendMessage({ msg: "", attachments: [attachment] }, "<threadId>", ThreadType.User);
```

File checksums are computed by **streaming** the file in 2MB chunks, so uploading a 2GB video no longer buffers it into memory.

## Configuration

```typescript
const client = new ZaloClient({
    selfListen: false, // also receive events triggered by your own account
    logging: "info", // "silent" | "error" | "warn" | "info" | "verbose"
    apiType: 30,
    apiVersion: 685,
    agent: undefined, // http.Agent for proxies / keep-alive
    retry: { limit: 3, delayMs: 250, maxDelayMs: 5000, methods: ["GET", "HEAD"], timeoutMs: 60000 },
    polyfill: fetch, // custom fetch implementation (e.g. node-fetch)
    imageMetadataGetter: undefined, // required to send local images/gifs
});
```

### Logging

`logging` accepts a boolean or a level. Every level prints timestamped records; use `"silent"` in production:

```typescript
new ZaloClient({ logging: "verbose" }); // debug everything
new ZaloClient({ logging: "error" }); // errors only
new ZaloClient({ logging: false }); // off
```

### Retry & timeout

All HTTP requests run through a retry policy:

-   **Exponential backoff with jitter** (`delayMs * 2^attempt`, halved randomly), capped by `maxDelayMs`.
-   **`Retry-After` respected** on `429`/`503` responses.
-   Retried statuses: `408`, `425`, `429`, `500`, `502`, `503`, `504` and network failures.
-   **Idempotent only by default**: just `GET`/`HEAD` are retried, so a flaky network can never double-send a message. Add `"POST"` to `methods` if you accept that trade-off.
-   **Per-request timeout** (`timeoutMs`, default 60s, `0` disables) via `AbortController`.

```typescript
const client = new ZaloClient({
    retry: { limit: 5, delayMs: 500, methods: ["GET", "HEAD", "POST"], timeoutMs: 30000 },
});
```

### Proxy

```typescript
import { HttpsProxyAgent } from "https-proxy-agent"; // or hpagent / undici ProxyAgent

const client = new ZaloClient({ agent: new HttpsProxyAgent("http://user:pass@host:port") });
```

When proxying, pair it with a `node-fetch` polyfill (undici ignores `agent`).

### Image metadata

Sending images/gifs **by file path** requires width/height/size. Provide your own getter (sharp is no longer bundled):

```bash
bun add sharp # or npm install sharp
```

```typescript
import sharp from "sharp";
import fs from "node:fs";

const client = new ZaloClient({
    imageMetadataGetter: async (filePath) => {
        const data = await fs.promises.readFile(filePath);
        const meta = await sharp(data).metadata();
        return { height: meta.height!, width: meta.width!, size: data.length };
    },
});
```

## Error handling

All errors inherit from `ZaloError`:

```typescript
import { ZaloError, ZaloApiError } from "zalo-client";

try {
    await api.sendMessage("hi", threadId, ThreadType.User);
} catch (error) {
    if (error instanceof ZaloApiError) {
        console.error(`API error ${error.code}: ${error.message}`);
    } else if (error instanceof ZaloError) {
        console.error("Library error:", error.message);
    } else {
        throw error;
    }
}
```

Hierarchy: `ZaloError` → `ZaloApiError` → `ZaloApiMissingImageMetadataGetter`, `ZaloApiLoginQRAborted`, `ZaloApiLoginQRDeclined`.

## Custom endpoints

Need an endpoint that isn't implemented yet? `api.custom()` binds your own function with full access to the session context and helpers:

```typescript
import type { CustomAPICallback } from "zalo-client";

const myEndpoint: CustomAPICallback<{ ok: boolean }, { userId: string }> = async ({ ctx, utils, props }) => {
    const url = utils.makeURL(`${api.zpwServiceMap.friend[0]}/api/friend/block`, {
        iz: props.userId,
        client_version: ctx.API_VERSION,
        imei: ctx.imei,
        jsv: "2",
    });
    const params = { iz: props.userId };
    const encrypted = utils.encodeAES(JSON.stringify(params));

    const response = await utils.request(url, {
        method: "POST",
        body: new URLSearchParams({ params: encrypted! }).toString(),
    });

    return utils.resolve<{ ok: boolean }>(response);
};

api.custom("blockFriendCustom", myEndpoint);
const result = await api.blockFriendCustom({ userId: "123456789" });
```

Available helpers: `utils.makeURL`, `utils.encodeAES`, `utils.request`, `utils.logger`, `utils.resolve`.

## Project structure

```
src/
├── client.ts            # ZaloClient: login(), loginQR()
├── index.ts             # public exports
├── core/                # framework-agnostic internals
│   ├── context.ts       #   session context, options, retry policy
│   ├── crypto.ts        #   node:crypto AES/MD5/signkey/param encryption
│   ├── http.ts          #   cookie-aware fetch + retry/backoff/timeout
│   ├── factory.ts       #   apiFactory + response resolution
│   ├── logger.ts        #   leveled logger
│   ├── errors.ts        #   ZaloError hierarchy
│   └── utils.ts         #   file/format/event helpers
├── api/                 # one file per endpoint (~155), bound lazily
│   └── index.ts         #   ZaloApi aggregate (generated)
└── models/              # typed payloads & events
```

`src/api/index.ts` is generated — run `node scripts/buildAPI.js` (or just `npm run build`) after adding an endpoint file.

## Migrating from v2

Coming from `zca-js`? See [MIGRATION.md](./MIGRATION.md) — the upgrade is mostly a rename, plus a few new options. Summary of what changed in v3: [CHANGELOG.md](./CHANGELOG.md).

## Contributing

PRs are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) and our [Code of Conduct](./CODE_OF_CONDUCT.md) first.

## Development

```bash
# Install dependencies
npm install

# Run all checks (lint, typecheck, test, build)
npm run build

# Run tests with coverage
npm run test:coverage

# Lint and fix
npm run lint:fix

# Type check only
npm run typecheck

# Format code
npm run prettier
```

## License

[MIT](./LICENSE) © zalo-client contributors
