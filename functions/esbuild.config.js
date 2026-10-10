import { build } from "esbuild";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: ["dist/index.js"],
  bundle: true,
  outfile: "dist/bundle.js",
  platform: "node",
  target: "node22",
  format: "esm",
  sourcemap: true,
  external: [
    "firebase-admin",
    "firebase-admin/*",
    "firebase-functions",
    "firebase-functions/*",
  ],
  alias: {
    "@apppages/shared": path.resolve(__dirname, "../packages/shared/dist/index.js"),
  },
  banner: {
    js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
  },
});

console.log("Functions bundled → dist/bundle.js");
