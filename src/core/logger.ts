/**
 * Lightweight leveled logger.
 *
 * The logger is intentionally dependency-free: log records are written to the
 * console only when logging is enabled through the client options.
 */

export type LogLevel = "silent" | "error" | "warn" | "info" | "verbose";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
    silent: 0,
    error: 1,
    warn: 2,
    info: 3,
    verbose: 4,
};

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const MAGENTA = "\x1b[35m";

export type Logger = {
    verbose: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    success: (...args: unknown[]) => void;
    timestamp: (...args: unknown[]) => void;
};

export type LoggableContext = {
    options: {
        logging?: boolean | LogLevel;
    };
};

function resolveLevel(logging: boolean | LogLevel | undefined): number {
    if (logging === undefined) return LEVEL_WEIGHT.info;
    if (typeof logging === "string") return LEVEL_WEIGHT[logging] ?? LEVEL_WEIGHT.info;
    return logging ? LEVEL_WEIGHT.info : LEVEL_WEIGHT.silent;
}

function write(level: Exclude<LogLevel, "silent">, threshold: number, color: string, label: string, args: unknown[]) {
    if (threshold === LEVEL_WEIGHT.silent) return;
    if (LEVEL_WEIGHT[level] > threshold) return;
    console.log(`${color}${label}${RESET}`, ...args);
}

/**
 * Creates a logger bound to a context (or any object exposing `options.logging`).
 */
export function logger(ctx: LoggableContext): Logger {
    const threshold = resolveLevel(ctx.options.logging);

    return {
        verbose: (...args) => write("verbose", threshold, MAGENTA, "VERBOSE", args),
        info: (...args) => write("info", threshold, BLUE, "INFO", args),
        warn: (...args) => write("warn", threshold, YELLOW, "WARN", args),
        error: (...args) => write("error", threshold, RED, "ERROR", args),
        success: (...args) => write("info", threshold, GREEN, "SUCCESS", args),
        timestamp: (...args) => {
            if (threshold === LEVEL_WEIGHT.silent) return;
            console.log(`${DIM}[${new Date().toISOString()}]${RESET}`, ...args);
        },
    };
}
