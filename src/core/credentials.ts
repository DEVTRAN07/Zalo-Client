/**
 * Browser credential extraction helpers for Zalo Web.
 *
 * These utilities are intended to run in a browser context (e.g. injected
 * scripts, DevTools, or browser automation) and extract the minimal set of
 * credentials required by {@link ZaloClient}: cookies, IMEI, and user agent.
 */

import type { ExtractedCredentials, ZaloCookie, ZaloCredentials } from './context.js';
import { extractIMEIFromStorage, ZALO_IMEI_STORAGE_KEYS } from './crypto.js';

type BrowserDocumentLike = {
    cookie?: string;
};

type BrowserNavigatorLike = {
    userAgent?: string;
};

type BrowserStorageLike = { getItem(key: string): string | null };

type BrowserWindowLike = {
    document?: BrowserDocumentLike | null;
    navigator?: BrowserNavigatorLike | null;
    localStorage?: BrowserStorageLike | null;
};

/**
 * Parses a `document.cookie` string into a JSON-friendly cookie array.
 *
 * Note: `document.cookie` does not expose cookie attributes (domain, path,
 * expiry, flags). The returned entries contain `name` and `value` only, which
 * is sufficient for rehydrating sessions when the target domain is known.
 *
 * @param document Browser document (or document-like object)
 * @param domain Optional domain to attach to each parsed cookie
 * @returns Array of cookies; empty when unavailable
 */
export function extractCookiesFromDocument(
    document: BrowserDocumentLike | null | undefined,
    domain?: string,
): ZaloCookie[] {
    const cookieString = document?.cookie;
    if (typeof cookieString !== 'string' || cookieString.trim().length === 0) return [];

    const cookies: ZaloCookie[] = [];
    for (const part of cookieString.split(';')) {
        const index = part.indexOf('=');
        if (index <= 0) continue;
        const name = part.slice(0, index).trim();
        const rawValue = part.slice(index + 1);
        if (!name) continue;
        let value = rawValue;
        try {
            value = decodeURIComponent(rawValue);
        } catch {
            // Keep raw value if decoding fails.
        }
        const cookie: ZaloCookie = { name, value };
        if (domain) cookie.domain = domain;
        cookies.push(cookie);
    }
    return cookies;
}

/**
 * Extracts the Zalo IMEI from a browser window's localStorage.
 *
 * @param window Browser window (or window-like object)
 * @returns IMEI value and its source key, or `null` when not found
 */
export function extractIMEIFromWindow(
    window: BrowserWindowLike | null | undefined,
): { imei: string; source: 'z_uuid' | 'sh_z_uuid' } | null {
    const storage = window?.localStorage ?? null;
    const imei = extractIMEIFromStorage(storage);
    if (!imei) return null;
    let source: 'z_uuid' | 'sh_z_uuid' = 'z_uuid';
    for (const key of ZALO_IMEI_STORAGE_KEYS) {
        try {
            if (storage?.getItem(key) === imei) {
                source = key;
                break;
            }
        } catch {
            // Ignore access errors.
        }
    }
    return { imei, source };
}

/**
 * Extracts the user agent from a browser window.
 *
 * @param window Browser window (or window-like object)
 * @returns User agent string, or `null` when unavailable
 */
export function extractUserAgentFromWindow(window: BrowserWindowLike | null | undefined): string | null {
    const userAgent = window?.navigator?.userAgent;
    return typeof userAgent === 'string' && userAgent.length > 0 ? userAgent : null;
}

/**
 * Extracts all Zalo credentials from a browser environment.
 *
 * Guards every browser API access with null checks so it is safe to call in
 * non-browser contexts (it will throw a descriptive error instead of crashing).
 *
 * @param window Browser window (defaults to `globalThis` when available)
 * @param options Optional extraction options
 * @returns Extracted credentials
 * @throws {Error} When required browser data (IMEI or user agent) is missing
 */
export function extractAllCredentials(
    window?: BrowserWindowLike | null,
    options: { domain?: string; language?: string } = {},
): ExtractedCredentials {
    const win = window ?? ((globalThis as unknown) as BrowserWindowLike | null);
    const imeiResult = extractIMEIFromWindow(win);
    if (!imeiResult) {
        throw new Error(
            'Unable to extract IMEI: localStorage keys "z_uuid"/"sh_z_uuid" were not found. Ensure you are logged in to Zalo Web.',
        );
    }
    const userAgent = extractUserAgentFromWindow(win);
    if (!userAgent) {
        throw new Error('Unable to extract user agent: navigator.userAgent is not available.');
    }
    const cookies = extractCookiesFromDocument(win?.document ?? null, options.domain);
    const credentials: ExtractedCredentials = {
        imei: imeiResult.imei,
        cookie: cookies,
        userAgent,
        source: {
            imei: imeiResult.source,
            cookieCount: cookies.length,
        },
    };
    if (options.language) credentials.language = options.language;
    return credentials;
}

/**
 * Normalizes extracted credentials into the shape expected by {@link ZaloClient}.
 *
 * @param credentials Extracted or raw credentials
 * @returns Credentials suitable for `ZaloClient.login()`
 */
export function serializeCredentialsForZaloClient(credentials: ZaloCredentials): ZaloCredentials {
    return {
        imei: credentials.imei,
        cookie: Array.isArray(credentials.cookie) ? credentials.cookie.map((c) => ({ ...c })) : [],
        userAgent: credentials.userAgent,
        ...(credentials.language ? { language: credentials.language } : {}),
    };
}

/**
 * Serializes credentials to a JSON string (cookie array format).
 *
 * @param credentials Credentials to serialize
 * @param space JSON indentation (default: 2)
 * @returns JSON string
 */
export function credentialsToJSON(credentials: ZaloCredentials, space: number | string = 2): string {
    return JSON.stringify(serializeCredentialsForZaloClient(credentials), null, space);
}

/**
 * Parses credentials from a JSON string.
 *
 * Accepts either a full credentials object or a raw cookie array.
 *
 * @param json JSON string
 * @returns Parsed credentials or cookie array
 * @throws {Error} When JSON is invalid or shape is unsupported
 */
export function parseCredentialsFromJSON(json: string): ZaloCredentials | ZaloCookie[] {
    let parsed: unknown;
    try {
        parsed = JSON.parse(json);
    } catch (error) {
        throw new Error(`Invalid credentials JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (Array.isArray(parsed)) {
        return parsed as ZaloCookie[];
    }
    if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        if (typeof obj['imei'] === 'string' && typeof obj['userAgent'] === 'string' && Array.isArray(obj['cookie'])) {
            const credentials: ZaloCredentials = {
                imei: obj['imei'] as string,
                cookie: obj['cookie'] as ZaloCookie[],
                userAgent: obj['userAgent'] as string,
            };
            if (typeof obj['language'] === 'string') credentials.language = obj['language'] as string;
            return credentials;
        }
    }
    throw new Error('Unsupported credentials JSON shape: expected a credential object or a cookie array.');
}
