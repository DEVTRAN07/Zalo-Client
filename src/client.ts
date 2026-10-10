import toughCookie from "tough-cookie";

import { loginQR, LoginQRCallbackEventType, type LoginQRCallback } from "./api/loginQR.js";
import { getServerInfo, login } from "./api/login.js";
import { createContext, isContextSession, type ContextBase, type Options } from "./core/context.js";
import { generateZaloUUID } from "./core/crypto.js";
import { ZaloApiError } from "./core/errors.js";
import { logger } from "./core/logger.js";
import { ZaloApi } from "./api/index.js";

export type Cookie = {
    domain: string;
    expirationDate: number;
    hostOnly: boolean;
    httpOnly: boolean;
    name: string;
    path: string;
    sameSite: string;
    secure: boolean;
    session: boolean;
    storeId: string;
    value: string;
};

export type Credentials = {
    imei: string;
    cookie: Cookie[] | toughCookie.SerializedCookie[] | { url: string; cookies: Cookie[] };
    userAgent: string;
    language?: string;
};

export type LoginQROptions = {
    userAgent?: string;
    language?: string;
    qrPath?: string;
};

const DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0";

/**
 * Entry point of the library: authenticates and returns a ready-to-use API
 * instance.
 *
 * @example
 * const client = new ZaloClient({ logging: "info" });
 * const api = await client.login({ imei, cookie, userAgent });
 * await api.sendMessage("Hello", "123456789");
 */
export class ZaloClient {
    private enableEncryptParam = true;

    constructor(private options: Partial<Options> = {}) {}

    private parseCookies(cookie: Credentials["cookie"]): toughCookie.CookieJar {
        const cookieArr: (Cookie | toughCookie.SerializedCookie)[] = Array.isArray(cookie)
            ? [...cookie]
            : cookie.cookies;

        // Zalo sometimes returns leading-dot domains; tough-cookie wants them stripped.
        for (const [index, entry] of cookieArr.entries()) {
            const domain = (entry as Cookie).domain;
            if (typeof domain === "string" && domain.startsWith(".")) {
                (cookieArr[index] as Cookie).domain = domain.slice(1);
            }
        }

        const jar = new toughCookie.CookieJar();
        for (const entry of cookieArr) {
            try {
                const cookieObj = toughCookie.Cookie.fromJSON({
                    ...entry,
                    key: (entry as toughCookie.SerializedCookie).key || (entry as Cookie).name,
                });
                if (cookieObj) {
                    const domain = cookieObj.domain || "chat.zalo.me";
                    const url = `https://${domain.startsWith(".") ? domain.slice(1) : domain}`;
                    jar.setCookieSync(cookieObj, url);
                }
            } catch (error: unknown) {
                logger({ options: this.options }).error("Failed to set cookie:", error);
            }
        }
        return jar;
    }

    private validateParams(credentials: Credentials) {
        if (!credentials.imei || !credentials.cookie || !credentials.userAgent) {
            throw new ZaloApiError("Missing required params");
        }
    }

    /**
     * Logs in with an existing cookie + imei + userAgent triple.
     */
    public async login(credentials: Credentials): Promise<ZaloApi> {
        const ctx = createContext(this.options.apiType, this.options.apiVersion);
        Object.assign(ctx.options, this.options);

        return this.loginCookie(ctx, credentials);
    }

    private async loginCookie(ctx: ContextBase, credentials: Credentials): Promise<ZaloApi> {
        this.validateParams(credentials);

        ctx.imei = credentials.imei;
        ctx.cookie = this.parseCookies(credentials.cookie);
        ctx.userAgent = credentials.userAgent;
        ctx.language = credentials.language || "vi";

        const loginData = await login(ctx, this.enableEncryptParam);
        const serverInfo = await getServerInfo(ctx, this.enableEncryptParam);

        const loginInfo = loginData?.data as typeof ctx.loginInfo;

        if (!loginData || !loginInfo || !serverInfo) throw new ZaloApiError("Đăng nhập thất bại");

        ctx.secretKey = loginInfo.zpw_enk;
        ctx.uid = loginInfo.uid;

        // Zalo currently responds with setttings instead of settings
        // they might fix this in the future, so we should have a fallback just in case
        ctx.settings = serverInfo.setttings || serverInfo.settings;

        ctx.extraVer = serverInfo.extra_ver;
        ctx.loginInfo = loginInfo;

        if (!isContextSession(ctx)) throw new ZaloApiError("Khởi tạo ngữ cảnh thất bại.");

        logger(ctx).info("Logged in as", loginInfo.uid);

        return new ZaloApi(ctx, loginInfo.zpw_service_map_v3, loginInfo.zpw_ws);
    }

    /**
     * Logs in by scanning a QR code.
     *
     * @param options Login options (user agent, language, QR image path)
     * @param callback Optional progress callback; also receives the resulting
     * credentials on the `GotLoginInfo` event so they can be persisted.
     */
    public async loginQR(options?: LoginQROptions, callback?: LoginQRCallback): Promise<ZaloApi> {
        const resolvedOptions: LoginQROptions = {
            userAgent: options?.userAgent || DEFAULT_USER_AGENT,
            language: options?.language || "vi",
            qrPath: options?.qrPath,
        };

        const ctx = createContext(this.options.apiType, this.options.apiVersion);
        Object.assign(ctx.options, this.options);

        const loginQRResult = await loginQR(
            ctx,
            resolvedOptions as { userAgent: string; language: string; qrPath?: string },
            callback,
        );
        if (!loginQRResult) throw new ZaloApiError("Unable to login with QRCode");

        const imei = generateZaloUUID(resolvedOptions.userAgent!);

        if (callback) {
            // Thanks to @YanCastle for this great suggestion!
            callback({
                type: LoginQRCallbackEventType.GotLoginInfo,
                data: {
                    cookie: loginQRResult.cookies,
                    imei,
                    userAgent: resolvedOptions.userAgent!,
                },
                actions: null,
            });
        }

        return this.loginCookie(ctx, {
            cookie: loginQRResult.cookies,
            imei,
            userAgent: resolvedOptions.userAgent!,
            language: resolvedOptions.language,
        });
    }
}

/**
 * @deprecated Use {@link ZaloClient} instead. Kept as an alias for backwards compatibility.
 */
export { ZaloClient as Zalo };
