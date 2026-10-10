/**
 * API factory: the shared plumbing every endpoint implementation is built on.
 */

import type { ContextBase, ContextSession } from "./context.js";
import { ZaloApiError } from "./errors.js";
import { decodeAES, encodeAES } from "./crypto.js";
import { makeURL as buildURL, request as httpRequest } from "./http.js";
import { logger } from "./logger.js";
import { isContextSession } from "./context.js";
import type { ZaloApi } from "../api/index.js";

export type ZaloResponse<T> = {
    data: T | null;
    error: {
        message: string;
        code?: number;
    } | null;
};

/**
 * Reads a Zalo API response, optionally decrypting its AES payload.
 */
export async function handleZaloResponse<T = unknown>(
    ctx: ContextSession,
    response: Response,
    isEncrypted = true,
): Promise<ZaloResponse<T>> {
    const result: ZaloResponse<T> = {
        data: null,
        error: null,
    };

    if (!response.ok) {
        result.error = {
            message: "Request failed with status code " + response.status,
        };
        return result;
    }

    try {
        const jsonData: {
            error_code: number;
            error_message: string;
            data: string;
        } = await response.json();

        if (jsonData.error_code != 0) {
            result.error = {
                message: jsonData.error_message,
                code: jsonData.error_code,
            };
            return result;
        }

        const decodedData: {
            error_code: number;
            error_message: string;
            data: T;
        } = isEncrypted ? JSON.parse(decodeAES(ctx.secretKey, jsonData.data)!) : jsonData;

        if (decodedData.error_code != 0) {
            result.error = {
                message: decodedData.error_message,
                code: decodedData.error_code,
            };
            return result;
        }

        result.data = decodedData.data;
    } catch (error) {
        logger(ctx).error("Failed to parse response data:", error);
        result.error = {
            message: "Failed to parse response data",
        };
    }

    return result;
}

/**
 * Resolves a response into plain data, throwing {@link ZaloApiError} on failure.
 */
export async function resolveResponse<T = unknown>(
    ctx: ContextSession,
    res: Response,
    cb?: (result: ZaloResponse<unknown>) => T,
    isEncrypted?: boolean,
) {
    const result = await handleZaloResponse<T>(ctx, res, isEncrypted);
    if (result.error) throw new ZaloApiError(result.error.message, result.error.code);
    if (cb) return cb(result);

    return result.data as T;
}

/**
 * Helpers handed to every endpoint implementation.
 */
export type FactoryUtils<T> = {
    makeURL: (
        baseURL: string,
        params?: Record<string, string | number>,
        apiVersion?: boolean,
    ) => ReturnType<typeof buildURL>;
    encodeAES: (data: string | Buffer) => ReturnType<typeof encodeAES>;
    request: (url: string, options?: RequestInit, raw?: boolean) => ReturnType<typeof httpRequest>;
    logger: ReturnType<typeof logger>;
    resolve: (
        res: Response,
        cb?: (result: ZaloResponse<unknown>) => T,
        isEncrypted?: boolean,
    ) => ReturnType<typeof resolveResponse<T>>;
};

/**
 * Creates an endpoint factory.
 *
 * @example
 * const myFactory = apiFactory<MyResponse>()((api, ctx, utils) => {
 *     return async function myEndpoint(param: string) {
 *         const res = await utils.request(utils.makeURL(api.zpwServiceMap.chat[0] + "/..."));
 *         return utils.resolve(res);
 *     };
 * });
 */
export function apiFactory<T>() {
    return <K extends (api: ZaloApi, ctx: ContextSession, utils: FactoryUtils<T>) => unknown>(callback: K) => {
        return (ctx: ContextBase, api: ZaloApi) => {
            if (!isContextSession(ctx)) throw new ZaloApiError("Invalid context " + JSON.stringify(ctx, null, 2));

            const utils: FactoryUtils<T> = {
                makeURL(baseURL, params, apiVersion) {
                    return buildURL(ctx, baseURL, params, apiVersion);
                },
                encodeAES(data) {
                    return encodeAES(ctx.secretKey, data);
                },
                request(url, options, raw) {
                    return httpRequest(ctx, url, options, raw);
                },
                logger: logger(ctx),
                resolve: (res, cb, isEncrypted) => resolveResponse<T>(ctx, res, cb, isEncrypted),
            };

            return callback(api, ctx, utils) as ReturnType<K>;
        };
    };
}
