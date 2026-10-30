// Serves dist/ for a local look, under the same path as GitHub Pages.
//
//   npm run build && npm run serve
//   open http://localhost:4173/buku-indonesia/

import {createReadStream, existsSync, statSync} from "node:fs";
import {createServer} from "node:http";
import {extname, join, normalize} from "node:path";

import {ROOT} from "./book-file.ts";

const DIST = join(ROOT, "dist");
const BASE = "/buku-indonesia/";
const PORT = Number(process.env.PORT ?? 4173);
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".svg": "image/svg+xml",
};

createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  if (!url.pathname.startsWith(BASE)) {
    response.writeHead(302, {Location: BASE}).end();
    return;
  }
  const relative = normalize(decodeURIComponent(url.pathname.slice(BASE.length)) || "index.html");
  let file = join(DIST, relative);
  if (!file.startsWith(DIST) || !existsSync(file)) {
    response.writeHead(404).end("Not found");
    return;
  }
  if (statSync(file).isDirectory()) file = join(file, "index.html");
  response.writeHead(200, {"Content-Type": TYPES[extname(file)] ?? "application/octet-stream", "Access-Control-Allow-Origin": "*"});
  createReadStream(file).pipe(response);
}).listen(PORT, () => console.log(`http://localhost:${PORT}${BASE}`));
