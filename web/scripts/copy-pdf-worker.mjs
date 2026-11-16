// pdf.js parses PDFs in a web worker. Copy the worker file into /public so the
// browser can load it as a plain static asset (works on any static host).
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const to = join(root, "public", "pdf.worker.min.mjs");

mkdirSync(dirname(to), { recursive: true });
copyFileSync(from, to);
console.log("Copied pdf.worker.min.mjs to public/");
