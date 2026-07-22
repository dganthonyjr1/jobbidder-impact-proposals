/**
 * Multi-format text extraction for the knowledge base.
 *
 * Given a file's bytes + name, pull out plain, searchable text. One place that
 * knows how to read each format the product accepts, so ingestion (and anything
 * else) just asks for "the text" and doesn't care what the file was.
 *
 * Supported today: PDF, Word (.docx), Excel (.xlsx) + CSV, PowerPoint (.pptx),
 * plain text / Markdown, and email (.eml and Outlook .msg). Everything is done
 * in-memory from a Buffer — no shelling out.
 */

export type ExtractKind =
  | "pdf" | "word" | "excel" | "csv" | "text" | "powerpoint" | "email" | "unknown";

export interface ExtractResult {
  text: string;
  kind: ExtractKind;
}

/** Human list of what can be uploaded — used in UI copy and error messages. */
export const SUPPORTED_UPLOAD_EXTENSIONS = [
  ".pdf", ".docx", ".xlsx", ".xls", ".csv", ".txt", ".md", ".pptx", ".eml", ".msg",
] as const;

function extOf(filename: string): string {
  const m = /\.([a-z0-9]+)$/i.exec((filename || "").toLowerCase());
  return m ? m[1] : "";
}

async function pdfToText(buf: Buffer): Promise<string> {
  // @ts-expect-error - pdf-parse ships no type declarations for the /lib subpath
  const pdfMod = await import(/* @vite-ignore */ "pdf-parse/lib/pdf-parse.js");
  const pdfParse = (pdfMod as any).default as (b: Buffer) => Promise<{ text?: string }>;
  const pdf = await pdfParse(buf).catch(() => null);
  return (pdf?.text || "").trim();
}

async function officeToText(buf: Buffer): Promise<string> {
  const mod: any = await import(/* @vite-ignore */ "officeparser");
  const parseOffice = mod.parseOffice ?? mod.default?.parseOffice ?? mod.default;
  const text = await parseOffice(buf);
  return (typeof text === "string" ? text : "").trim();
}

/** Decode a MIME "encoded-word" (=?utf-8?B?..?= / =?utf-8?Q?..?=) in a header. */
function decodeEncodedWords(s: string): string {
  return s.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_m, charset, enc, data) => {
    try {
      if (enc.toUpperCase() === "B") return Buffer.from(data, "base64").toString(charset === "utf-8" ? "utf-8" : "latin1");
      // Q-encoding: _ is space, =XX is a byte.
      const bytes = data.replace(/_/g, " ").replace(/=([0-9A-Fa-f]{2})/g, (_x: string, h: string) => String.fromCharCode(parseInt(h, 16)));
      return bytes;
    } catch { return data; }
  });
}

function decodeTransfer(body: string, encoding: string): string {
  const enc = (encoding || "").toLowerCase();
  if (enc === "base64") {
    try { return Buffer.from(body.replace(/\s+/g, ""), "base64").toString("utf-8"); } catch { return body; }
  }
  if (enc === "quoted-printable") {
    return body
      .replace(/=\r?\n/g, "")
      .replace(/=([0-9A-Fa-f]{2})/g, (_m, h) => String.fromCharCode(parseInt(h, 16)));
  }
  return body;
}

/**
 * Dependency-free .eml (RFC 822 / MIME) reader — enough to pull the useful text
 * for search: the key headers plus the plain-text body (falling back to a
 * stripped HTML part). Avoids a heavy mail-parsing dependency and its transitive
 * package-export problems; good enough for a knowledge base, not a mail client.
 */
async function emlToText(buf: Buffer): Promise<string> {
  const raw = buf.toString("utf-8");
  const sep = raw.search(/\r?\n\r?\n/);
  const headerBlock = sep >= 0 ? raw.slice(0, sep) : raw;
  let body = sep >= 0 ? raw.slice(sep).replace(/^\r?\n\r?\n/, "") : "";

  // Unfold folded headers, then pull the ones we care about.
  const unfolded = headerBlock.replace(/\r?\n[ \t]+/g, " ");
  const getHeader = (name: string): string => {
    const m = new RegExp(`^${name}:\\s*(.*)$`, "im").exec(unfolded);
    return m ? decodeEncodedWords(m[1].trim()) : "";
  };
  const contentTypeRaw = getHeader("Content-Type");
  const contentType = contentTypeRaw.toLowerCase();
  const cte = getHeader("Content-Transfer-Encoding");

  // If multipart, grab the first text/plain (or text/html) part. Read the
  // boundary from the ORIGINAL-case header — boundary values are case-sensitive.
  const boundaryMatch = /boundary="?([^";\r\n]+)"?/i.exec(contentTypeRaw);
  let isHtml = contentType.includes("text/html");
  if (boundaryMatch) {
    const parts = body.split(`--${boundaryMatch[1]}`);
    const plain = parts.find((p) => /content-type:\s*text\/plain/i.test(p));
    const html = parts.find((p) => /content-type:\s*text\/html/i.test(p));
    const chosen = plain ?? html ?? "";
    isHtml = !plain && !!html;
    const partSep = chosen.search(/\r?\n\r?\n/);
    const partCte = /content-transfer-encoding:\s*([^\r\n]+)/i.exec(chosen)?.[1] ?? "";
    body = partSep >= 0 ? decodeTransfer(chosen.slice(partSep).trim(), partCte) : chosen;
  } else {
    body = decodeTransfer(body, cte);
  }

  const header = [
    getHeader("Subject") ? `Subject: ${getHeader("Subject")}` : "",
    getHeader("From") ? `From: ${getHeader("From")}` : "",
    getHeader("To") ? `To: ${getHeader("To")}` : "",
    getHeader("Date") ? `Date: ${getHeader("Date")}` : "",
  ].filter(Boolean).join("\n");

  const text = (isHtml ? stripHtml(body) : body).trim();
  return [header, text].filter(Boolean).join("\n\n").trim();
}

async function msgToText(buf: Buffer): Promise<string> {
  const mod: any = await import(/* @vite-ignore */ "@kenjiuno/msgreader");
  const MsgReader = mod.default ?? mod.MsgReader ?? mod;
  const reader = new MsgReader(new Uint8Array(buf).buffer);
  const data = reader.getFileData();
  if (data?.error) throw new Error(`Could not read Outlook .msg: ${data.error}`);
  const header = [
    data?.subject ? `Subject: ${data.subject}` : "",
    data?.senderName ? `From: ${data.senderName}` : "",
    data?.recipients?.length ? `To: ${data.recipients.map((r: any) => r.name || r.email).join(", ")}` : "",
  ].filter(Boolean).join("\n");
  const body = (data?.body || "").trim();
  return [header, body].filter(Boolean).join("\n\n").trim();
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract text from a file buffer, dispatching on the file extension (which is
 * more reliable than the browser-reported MIME type for these formats). Throws
 * a clear, user-facing error for anything it can't read.
 */
export async function extractTextFromFile(
  buf: Buffer,
  filename: string,
): Promise<ExtractResult> {
  const ext = extOf(filename);
  switch (ext) {
    case "pdf":
      return { text: await pdfToText(buf), kind: "pdf" };
    case "docx":
      return { text: await officeToText(buf), kind: "word" };
    case "xlsx":
    case "xls":
      return { text: await officeToText(buf), kind: "excel" };
    case "pptx":
      return { text: await officeToText(buf), kind: "powerpoint" };
    case "csv":
      return { text: buf.toString("utf-8").trim(), kind: "csv" };
    case "txt":
    case "md":
    case "markdown":
    case "text":
    case "log":
      return { text: buf.toString("utf-8").trim(), kind: "text" };
    case "eml":
      return { text: await emlToText(buf), kind: "email" };
    case "msg":
      return { text: await msgToText(buf), kind: "email" };
    case "doc":
    case "ppt":
      throw new Error(
        `Old ${ext.toUpperCase()} format isn't supported — please re-save as ${ext === "doc" ? ".docx" : ".pptx"} or PDF and upload again.`,
      );
    default:
      throw new Error(
        `Unsupported file type${ext ? ` (.${ext})` : ""}. Supported: ${SUPPORTED_UPLOAD_EXTENSIONS.join(", ")}.`,
      );
  }
}
