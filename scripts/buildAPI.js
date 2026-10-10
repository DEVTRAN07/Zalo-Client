import fs from "fs";
import path from "path";

const apisDir = path.join(process.cwd(), "src", "api");
const outputFile = path.join(process.cwd(), "src", "api", "index.ts");

function getAllApiFiles(dir) {
    const ignoreFiles = ["listen.ts", "login.ts", "loginQR.ts", "custom.ts", "index.ts"];
    return fs
        .readdirSync(dir)
        .filter((file) => file.endsWith(".ts") && !ignoreFiles.includes(file))
        .map((file) => {
            const nonExtension = file.slice(0, -3); // Remove .ts extension

            return {
                name: nonExtension,
                factoryName: `${nonExtension}Factory`,
            };
        });
}

function generateAPIsFile() {
    const allApiFiles = getAllApiFiles(apisDir);

    const importLines = allApiFiles.map((file) => {
        return `import { ${file.factoryName} } from "./${file.name}.js";`;
    });

    const propertyLines = allApiFiles.map((file) => {
        return `    public ${file.name}!: ReturnType<typeof ${file.factoryName}>;`;
    });

    // Endpoints are bound lazily: the factory only runs the first time the
    // property is accessed, so logging in no longer builds ~150 closures.
    const lazyLines = allApiFiles.map((file) => {
        return `        lazy("${file.name}", ${file.factoryName});`;
    });

    const emptyNewLine = "\n";

    const content =
        "" +
        'import { Listener } from "./listen.js";\n' +
        emptyNewLine +
        importLines.join("\n") +
        emptyNewLine +
        'import { customFactory } from "./custom.js";\n' +
        'import type { ContextSession, ZPWServiceMap } from "../core/context.js";\n' +
        emptyNewLine +
        "type ApiFactory = (ctx: ContextSession, api: ZaloApi) => unknown;\n" +
        emptyNewLine +
        "export class ZaloApi {\n" +
        "    public zpwServiceMap: ZPWServiceMap;\n" +
        "    public listener: Listener;\n" +
        emptyNewLine +
        propertyLines.join("\n") +
        emptyNewLine +
        emptyNewLine +
        "    public custom: ReturnType<typeof customFactory>;\n" +
        emptyNewLine +
        "    constructor(ctx: ContextSession, zpwServiceMap: ZPWServiceMap, wsUrls: string[]) {\n" +
        "        this.zpwServiceMap = zpwServiceMap;\n" +
        "        this.listener = new Listener(ctx, wsUrls);\n" +
        emptyNewLine +
        "        const cache = Object.create(null) as Record<string, unknown>;\n" +
        "        const lazy = (name: string, factory: ApiFactory) => {\n" +
        "            Object.defineProperty(this, name, {\n" +
        "                get() {\n" +
        "                    if (!(name in cache)) cache[name] = factory(ctx, this);\n" +
        "                    return cache[name];\n" +
        "                },\n" +
        "                set(value: unknown) {\n" +
        "                    cache[name] = value;\n" +
        "                },\n" +
        "                enumerable: true,\n" +
        "                configurable: true,\n" +
        "            });\n" +
        "        };\n" +
        emptyNewLine +
        lazyLines.join("\n") +
        emptyNewLine +
        emptyNewLine +
        "        this.custom = customFactory(ctx, this);\n" +
        "    }\n" +
        "}\n" +
        emptyNewLine +
        "/**\n" +
        " * @deprecated Use {@link ZaloApi} instead. Kept as an alias for backwards compatibility.\n" +
        " */\n" +
        "export { ZaloApi as API };\n";

    fs.writeFileSync(outputFile, content, "utf-8");
    console.log(`\nAPIs file generated at ${outputFile}\n`);
}

generateAPIsFile();
