import { describe, it, expect, vi } from "vitest";
import { ZaloClient } from "../src/client.ts";

describe("ZaloClient", () => {
    it("should instantiate with default options", () => {
        const client = new ZaloClient();
        expect(client).toBeInstanceOf(ZaloClient);
    });

    it("should instantiate with custom options", () => {
        const client = new ZaloClient({
            selfListen: true,
            logging: "verbose",
            apiType: 30,
            apiVersion: 685,
            retry: { limit: 3, delayMs: 250 },
        });
        expect(client).toBeInstanceOf(ZaloClient);
    });

    it("should have login and loginQR methods", () => {
        const client = new ZaloClient();
        expect(typeof client.login).toBe("function");
        expect(typeof client.loginQR).toBe("function");
    });
});

describe("Exports", () => {
    it("should export main classes and types", async () => {
        const mod = await import("../src/index.ts");

        expect(mod.ZaloClient).toBeDefined();
        expect(mod.ZaloApi).toBeDefined();
        expect(mod.ZaloError).toBeDefined();
        expect(mod.ZaloApiError).toBeDefined();
        expect(mod.Credentials).toBeDefined();
    });
});