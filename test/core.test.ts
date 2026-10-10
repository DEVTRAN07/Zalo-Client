import { describe, it, expect, vi, beforeEach } from "vitest";
import { decodeAES } from "../src/core/crypto.js";
import { decodeEventData } from "../src/core/utils.js";

describe("crypto", () => {
    describe("decodeAES", () => {
        it("should decode valid AES encrypted data", () => {
            const secretKey = "test-secret-key-1234567890123456";
            const encrypted = "U2FsdGVkX1+testencrypteddata==";

            const result = decodeAES(secretKey, encrypted);

            expect(typeof result).toBe("string");
        });

        it("should return null for invalid data", () => {
            const secretKey = "test-secret-key-1234567890123456";
            const encrypted = "invalid-data";

            const result = decodeAES(secretKey, encrypted);

            expect(result).toBeNull();
        });

        it("should return null for empty string", () => {
            const secretKey = "test-secret-key-1234567890123456";

            const result = decodeAES(secretKey, "");

            expect(result).toBeNull();
        });
    });
});

describe("utils", () => {
    describe("decodeEventData", () => {
        it("should decode valid websocket event data", async () => {
            const cipherKey = "test-cipher-key-1234567890123456";
            const eventData = {
                eventName: "test_event",
                data: "encrypted-data-here",
            };

            const result = await decodeEventData(eventData, cipherKey);

            expect(result).toBeDefined();
        });

        it("should return null for invalid event data", async () => {
            const cipherKey = "test-cipher-key-1234567890123456";
            const eventData = { invalid: "data" };

            const result = await decodeEventData(eventData, cipherKey);

            expect(result).toBeNull();
        });
    });
});