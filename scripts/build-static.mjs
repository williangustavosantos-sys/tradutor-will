// Build step for the PWA: copies the static frontend files into dist/.
// The backend (server.js) is deployed as a Node process; this folder is the
// client-only bundle for hosting that serves static assets separately.
// There is no compilation — the site is plain HTML/JS/CSS served as-is.
import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const OUT = resolve(ROOT, "dist");

// Only files actually referenced by the app. No config.js (a chave de API
// não existe mais no cliente), no server.js (o backend roda separado) e
// nenhum backup solto.
const FILES = [
  "index.html",
  "tts.js",
  "mic-worklet.js",
  "sw.js",
  "manifest.json",
  "logo.png",
  "icon-192.png",
  "icon-512.png",
];

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

for (const file of FILES) {
  const src = resolve(ROOT, file);
  const dest = resolve(OUT, file);
  await mkdir(dirname(dest), { recursive: true });
  await cp(src, dest);
  console.log(`  dist/${file}`);
}

console.log(`Built ${FILES.length} files into dist/`);
