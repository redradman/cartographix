import { buildSync } from "esbuild";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const outDir = resolve(__dirname, "dist");
  mkdirSync(outDir, { recursive: true });

  // Bundle JSX → plain JS
  const bundled = resolve(outDir, "_poster-ready.mjs");
  buildSync({
    entryPoints: [resolve(__dirname, "poster-ready.jsx")],
    bundle: true,
    format: "esm",
    jsx: "automatic",
    outfile: bundled,
    platform: "node",
    external: [],
  });

  // Import the bundled module and render
  const { default: PosterReady } = await import(pathToFileURL(bundled).href);
  const { render } = await import("@react-email/render");

  const html = await render(
    PosterReady({ city: "{{city}}", theme: "{{theme}}" })
  );

  writeFileSync(resolve(outDir, "poster-ready.html"), html, "utf-8");
  console.log("Built emails/dist/poster-ready.html");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
