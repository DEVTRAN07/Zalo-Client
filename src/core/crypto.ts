/**
 * Cryptography helpers backed by Node's built-in `node:crypto`.
 *
 * These utilities implement the signing, parameter-encryption and response
 * decryption schemes used by the Zalo platform. AES is used in CBC mode with a
 * zero IV and PKCS7 padding, matching the reference implementation byte for
 * byte.
 */

import { createCipheriv, createDecipheriv, createHash, randomUUID } from "node:crypto";
import { ZaloApiError } from "./errors.js";

const ZERO_IV = Buffer.alloc(16, 0);

type AesCbcAlgorithm = `aes-${128 | 192 | 256}-cbc`;

function algorithmFor(key: Buffer): AesCbcAlgorithm {
    return `aes-${key.length * 8}-cbc` as AesCbcAlgorithm;
}

/**
 * MD5 of a string, lowercase hex.
 */
export function md5(data: string | Buffer): string {
    return createHash("md5").update(data).digest("hex");
}

/**
 * Get the signed key (`signkey`) required by Zalo API requests.
 *
 * @param type API type, e.g. `"getserverinfo"`
 * @param params Request params; keys are sorted before hashing
 * @returns MD5 hash of `"zsecure" + type + <param values in sorted key order>`
 */
export function getSignKey(type: string, params: Record<string, unknown>): string {
    const keys = Object.keys(params).sort();
    let source = "zsecure" + type;
    for (const key of keys) source += String(params[key]);
    return md5(source);
}

/**
 * Encrypts a UTF-8 payload with an AES-CBC key (zero IV, PKCS7 padding).
 *
 * @param secretKey Base64 encoded key
 * @param data Payload to encrypt
 * @returns Base64 ciphertext, or `null` when encryption fails
 */
export function encodeAES(secretKey: string, data: string | Buffer): string | null {
    try {
        const key = Buffer.from(secretKey, "base64");
        const cipher = createCipheriv(algorithmFor(key), key, ZERO_IV);
        return Buffer.concat([cipher.update(data), cipher.final()]).toString("base64");
    } catch {
        return null;
    }
}

/**
 * Decrypts a Base64 AES-CBC ciphertext (zero IV, PKCS7 padding).
 *
 * @param secretKey Base64 encoded key
 * @param data Base64 ciphertext
 * @returns Decrypted UTF-8 string, or `null` when decryption fails
 */
export function decodeAES(secretKey: string, data: string): string | null {
    try {
        const key = Buffer.from(secretKey, "base64");
        const decipher = createDecipheriv(algorithmFor(key), key, ZERO_IV);
        return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
    } catch {
        return null;
    }
}

/**
 * Decrypts and parses an encrypted login response.
 *
 * @param key Encryption key (UTF-8) returned by the login param encryptor
 * @param data Encrypted Base64 payload
 */
export function decryptResp(key: string, data: string): Record<string, unknown> | null | string {
    const decoded = decodeWithUtf8Key(key, data);
    try {
        return JSON.parse(decoded);
    } catch {
        return decoded;
    }
}

function decodeWithUtf8Key(key: string, data: string): string {
    try {
        const keyBuffer = Buffer.from(key, "utf8");
        const decipher = createDecipheriv(algorithmFor(keyBuffer), keyBuffer, ZERO_IV);
        return Buffer.concat([
            decipher.update(Buffer.from(decodeURIComponent(data), "base64")),
            decipher.final(),
        ]).toString("utf8");
    } catch {
        // Mirrors the reference implementation: an undecryptable payload
        // decodes to an empty string rather than throwing.
        return "";
    }
}

/**
 * Encrypts login params the way the Zalo web client does, deriving a device
 * identifier (`zcid`) and an encryption key from it.
 */
export class ParamsEncryptor {
    private zcid: string | null = null;
    private enc_ver = "v2";
    private zcid_ext: string;
    private encryptKey: string | null = null;

    constructor({ type, imei, firstLaunchTime }: { type: number; imei: string; firstLaunchTime: number }) {
        this.createZcid(type, imei, firstLaunchTime);
        this.zcid_ext = ParamsEncryptor.randomString();
        this.createEncryptKey();
    }

    getEncryptKey(): string {
        if (!this.encryptKey) throw new ZaloApiError("getEncryptKey: didn't create encryptKey yet");
        return this.encryptKey;
    }

    private createZcid(type: number, imei: string, firstLaunchTime: number) {
        if (!type || !imei || !firstLaunchTime) throw new ZaloApiError("createZcid: missing params");
        const msg = `${type},${imei},${firstLaunchTime}`;
        this.zcid = ParamsEncryptor.encodeAES("3FC4F0D2AB50057BCE0D90D9187A22B1", msg, "hex", true);
    }

    private createEncryptKey(attempt = 0): boolean {
        const derive = (evenSource: string, oddSource: string): boolean => {
            const { even } = ParamsEncryptor.processStr(evenSource);
            const { even: evenOdd, odd } = ParamsEncryptor.processStr(oddSource);
            if (!even || !evenOdd || !odd) return false;
            const key = even.slice(0, 8).join("") + evenOdd.slice(0, 12).join("") + odd.reverse().slice(0, 12).join("");
            this.encryptKey = key;
            return true;
        };

        if (!this.zcid || !this.zcid_ext) throw new ZaloApiError("createEncryptKey: zcid or zcid_ext is null");
        try {
            const hashed = md5(this.zcid_ext).toUpperCase();
            if (derive(hashed, this.zcid) || attempt >= 3) return false;
            return this.createEncryptKey(attempt + 1);
        } catch {
            if (attempt < 3) return this.createEncryptKey(attempt + 1);
            return false;
        }
    }

    getParams() {
        return this.zcid
            ? {
                  zcid: this.zcid,
                  zcid_ext: this.zcid_ext,
                  enc_ver: this.enc_ver,
              }
            : null;
    }

    private static processStr(value: string): { even: string[] | null; odd: string[] | null } {
        if (!value || typeof value !== "string") return { even: null, odd: null };
        const even: string[] = [];
        const odd: string[] = [];
        [...value].forEach((char, index) => (index % 2 === 0 ? even : odd).push(char));
        return { even, odd };
    }

    private static randomString(min = 6, max?: number): string {
        const upper = max && min && max > min ? max : 12;
        const length = Math.floor(Math.random() * (upper - min + 1)) + min;
        if (length > 12) {
            let result = "";
            let remaining = length;
            while (remaining > 0) {
                result += Math.random()
                    .toString(16)
                    .slice(2, 2 + (remaining > 12 ? 12 : remaining));
                remaining -= 12;
            }
            return result;
        }
        return Math.random()
            .toString(16)
            .slice(2, 2 + length);
    }

    /**
     * Encrypts a payload with a raw (UTF-8) AES key.
     *
     * @param key UTF-8 key material
     * @param message Payload to encrypt
     * @param encoding Output encoding
     * @param uppercase Uppercase the output when `true`
     */
    static encodeAES(
        key: string,
        message: string,
        encoding: "hex" | "base64" = "base64",
        uppercase = false,
    ): string | null {
        if (!message) return null;
        try {
            const keyBuffer = Buffer.from(key, "utf8");
            const cipher = createCipheriv(algorithmFor(keyBuffer), keyBuffer, ZERO_IV);
            const output = Buffer.concat([cipher.update(message, "utf8"), cipher.final()]).toString(encoding);
            return uppercase ? output.toUpperCase() : output;
        } catch {
            return null;
        }
    }
}

/**
 * Generates a device identifier (`imei`) bound to the given user agent.
 */
export function generateZaloUUID(userAgent: string): string {
    return `${randomUUID()}-${md5(userAgent)}`;
}

/**
 * Hashes a 4-digit PIN into the 32-character hex digest used by Zalo.
 */
export function encryptPin(pin: string): string {
    return md5(pin);
}

/**
 * Verifies a PIN against its stored hash (the hash is one-way).
 */
export function validatePin(encryptedPin: string, pin: string): boolean {
    return md5(pin) === encryptedPin;
}
