import { defineConfig } from "tsdown";

export default defineConfig({
    entry: "src/index.ts",
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    external: [
        "events",
        "form-data",
        "fs",
        "node:crypto",
        "node:fs",
        "node:fs/promises",
        "node:path",
        "pako",
        "sharp",
        "tough-cookie",
        "ws",
        "json-bigint",
    ],
    platform: "node",
    target: "node20",
});