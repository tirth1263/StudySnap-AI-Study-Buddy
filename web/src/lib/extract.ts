/**
 * Demo-mode text extraction, done entirely in the browser.
 * (With Supabase connected, the file goes to the Edge Function instead and the
 * AI model reads the PDF or photo directly.)
 */
import { BASE_PATH } from "./config";
import type { SourceType } from "./types";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function sourceTypeOf(file: File): SourceType | null {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (IMAGE_TYPES.includes(file.type)) return "image";
  if (file.type.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md")) return "text";
  return null;
}

async function extractPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `${BASE_PATH}/pdf.worker.min.mjs`;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  let text = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if ("str" in item) text += item.str + (item.hasEOL ? "\n" : " ");
    }
    text += "\n";
  }
  if (text.replace(/\s/g, "").length < 80) {
    throw new Error(
      "This PDF has no selectable text (it may be a scan). Upload a photo of the page instead and StudySnap will read it.",
    );
  }
  return text;
}

async function extractImage(file: File): Promise<string> {
  const Tesseract = (await import("tesseract.js")).default;
  const result = await Tesseract.recognize(file, "eng");
  // Photos of notes come back as short visual lines; join them into paragraphs.
  return result.data.text.replace(/([^\n.!?:])\n(?=\S)/g, "$1 ");
}

export async function extractText(file: File): Promise<string> {
  const kind = sourceTypeOf(file);
  if (kind === "pdf") return extractPdf(file);
  if (kind === "image") return extractImage(file);
  if (kind === "text") return file.text();
  throw new Error("Unsupported file. Use a PDF, a photo (JPG, PNG or WebP) or a text file.");
}
