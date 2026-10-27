// Type-checks demo-runtime/ against the frontend source it is bundled with.
//
// The demo runtime imports straight from the frontend ("frontend/src/...").
// The site's own `pnpm check` cannot see those files, so this script checks
// them with the TypeScript settings of the frontend itself. When the
// frontend changes an API the demos use, this is where it shows up: as a
// type error here, instead of a broken demo on the site.
//
// Only errors in demo-runtime/ count. The frontend checks its own code.
//
// Usage:
//   pnpm check:demos                        # against ../frontend
//   pnpm check:demos --from /path/frontend  # another checkout
//
// scripts/build-components.ts runs the same check on the commit it
// bundles, before it bundles anything.

import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import ts from "typescript";

const DEMO_RUNTIME = fileURLToPath(new URL("../demo-runtime/", import.meta.url));

// Returns the formatted errors in demo-runtime/, or an empty string.
export function checkDemoRuntime(frontend: string) {
  const { config, error } = ts.readConfigFile(path.join(frontend, "tsconfig.json"), ts.sys.readFile);
  if (error) {
    throw new Error(ts.flattenDiagnosticMessageText(error.messageText, "\n"));
  }

  const { options } = ts.parseJsonConfigFileContent(config, ts.sys, frontend);

  // "frontend/..." is the alias the bundle uses for the frontend source.
  // Lit comes from the frontend too, like it does in the bundle.
  const compilerOptions = {
    ...options,
    noEmit: true,
    incremental: false,
    tsBuildInfoFile: undefined,
    plugins: [],
    paths: {
      ...options.paths,
      "frontend/*": [`${frontend}/*`],
      lit: [`${frontend}/node_modules/lit`],
      "lit/*": [`${frontend}/node_modules/lit/*`],
    },
  };

  const files = readdirSync(DEMO_RUNTIME)
    .filter((file) => file.endsWith(".ts"))
    .map((file) => path.join(DEMO_RUNTIME, file));

  const program = ts.createProgram(files, compilerOptions);
  const ours = ts
    .getPreEmitDiagnostics(program)
    .filter((diagnostic) => !diagnostic.file || diagnostic.file.fileName.startsWith(DEMO_RUNTIME));

  return ts.formatDiagnostics(ours, {
    getCanonicalFileName: (file) => file,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => "\n",
  });
}

// Run as a script, not imported by build-components.ts.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({
    options: { from: { type: "string", default: "../frontend" } },
  });

  const errors = checkDemoRuntime(path.resolve(values.from));
  if (errors) {
    console.error(errors);
    process.exit(1);
  }

  console.log("demo-runtime/ has no type errors.");
}
