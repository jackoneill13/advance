import type { ContentBlockParam } from "@anthropic-ai/sdk/resources/messages";
import mammoth from "mammoth";

export type IngestedFile = {
  name: string;
  mimeType: string;
  bytes: Buffer;
};

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const TEXT_TYPES = new Set(["text/plain", "text/markdown", "text/csv", "application/rtf"]);
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const ACCEPTED_EXTENSIONS = ".pdf,.docx,.doc,.txt,.md,.jpg,.jpeg,.png,.webp,.gif";

export function mimeFromName(name: string, declared?: string): string {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  const byExt: Record<string, string> = {
    pdf: "application/pdf",
    docx: DOCX,
    doc: "application/msword",
    txt: "text/plain",
    md: "text/markdown",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    heic: "image/heic",
  };
  if (declared && declared !== "application/octet-stream") return declared;
  return byExt[ext] ?? "application/octet-stream";
}

/**
 * Turn whatever the venue was sent (PDF, Word, text, photos of pages) into the
 * content blocks the parser reads. Order is preserved so multi-page photo sets
 * stay in page order.
 */
export async function toContentBlocks(files: IngestedFile[]): Promise<ContentBlockParam[]> {
  const blocks: ContentBlockParam[] = [];
  for (const file of files) {
    const mime = mimeFromName(file.name, file.mimeType);
    if (mime === "application/pdf") {
      blocks.push({
        type: "document",
        title: file.name,
        source: { type: "base64", media_type: "application/pdf", data: file.bytes.toString("base64") },
      });
    } else if (IMAGE_TYPES.has(mime)) {
      blocks.push({ type: "text", text: `Page image: ${file.name}` });
      blocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mime as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: file.bytes.toString("base64"),
        },
      });
    } else if (mime === "image/heic" || mime === "image/heif") {
      throw new Error(`${file.name}: HEIC photos aren't supported yet. Export as JPG or PNG and upload again.`);
    } else if (mime === DOCX) {
      const result = await mammoth.extractRawText({ buffer: file.bytes });
      blocks.push({
        type: "document",
        title: file.name,
        source: { type: "text", media_type: "text/plain", data: result.value },
      });
    } else if (mime === "application/msword") {
      throw new Error(`${file.name}: legacy .doc files aren't supported. Save as .docx or PDF and upload again.`);
    } else if (TEXT_TYPES.has(mime)) {
      blocks.push({
        type: "document",
        title: file.name,
        source: { type: "text", media_type: "text/plain", data: file.bytes.toString("utf8") },
      });
    } else {
      throw new Error(`${file.name}: unsupported file type (${mime}). Use PDF, Word (.docx), text, or JPG/PNG.`);
    }
  }
  if (blocks.length === 0) throw new Error("No rider files were provided.");
  return blocks;
}
