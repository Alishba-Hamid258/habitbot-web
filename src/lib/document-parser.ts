/**
 * Universal Client-Side Document and PDF Text Extractor for HabitBot
 * Supports plain text, markdown, CSV, JSON, and decompresses FlateDecode PDF text streams.
 */

export async function extractTextFromFile(file: File): Promise<{
  text: string;
  isPdf: boolean;
  charCount: number;
}> {
  const fileName = file.name.toLowerCase();
  const isPdf = fileName.endsWith('.pdf') || file.type === 'application/pdf';

  if (isPdf) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const extracted = await parsePdfBuffer(arrayBuffer);
      if (extracted && extracted.trim().length > 30) {
        return {
          text: extracted.slice(0, 16000),
          isPdf: true,
          charCount: extracted.length,
        };
      }
    } catch (e) {
      console.warn('PDF parser fallback notice:', e);
    }

    return {
      text: `[PDF Document: ${file.name}]`,
      isPdf: true,
      charCount: 0,
    };
  }

  // Plain text document formats (.txt, .csv, .md, .json, .log)
  try {
    const rawText = await file.text();
    return {
      text: rawText.slice(0, 16000),
      isPdf: false,
      charCount: rawText.length,
    };
  } catch (err) {
    return {
      text: `[Document: ${file.name}]`,
      isPdf: false,
      charCount: 0,
    };
  }
}

/**
 * Parses both uncompressed and flate-compressed PDF streams
 */
async function parsePdfBuffer(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  let rawStr = '';

  const chunkSize = 65536;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    rawStr += String.fromCharCode.apply(null, chunk as any);
  }

  const collectedText: string[] = [];

  // 1. Direct BT ... ET extraction from uncompressed blocks
  extractFromBtEt(rawStr, collectedText);

  // 2. Try decompressing Deflate streams if text is minimal
  if (collectedText.length < 5 && typeof DecompressionStream !== 'undefined') {
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let streamMatch: RegExpExecArray | null;

    while ((streamMatch = streamRegex.exec(rawStr)) !== null) {
      const streamContent = streamMatch[1];
      try {
        const streamBytes = new Uint8Array(streamContent.length);
        for (let j = 0; j < streamContent.length; j++) {
          streamBytes[j] = streamContent.charCodeAt(j);
        }

        const ds = new DecompressionStream('deflate');
        const writer = ds.writable.getWriter();
        writer.write(streamBytes);
        writer.close();

        const response = new Response(ds.readable);
        const decompressed = await response.text();
        extractFromBtEt(decompressed, collectedText);
      } catch {
        // Stream may not be deflate or has headers; continue
      }
    }
  }

  // 3. Regex string literal fallback
  if (collectedText.length < 5) {
    const stringLiteralRegex = /\(([A-Za-z0-9 ,.?!:;'"\-\n\r]{4,})\)/g;
    let litMatch: RegExpExecArray | null;
    while ((litMatch = stringLiteralRegex.exec(rawStr)) !== null) {
      const str = cleanPdfString(litMatch[1]);
      if (str.length > 3 && !str.includes('Font') && !str.includes('Type') && !str.includes('Obj')) {
        collectedText.push(str);
      }
    }
  }

  return collectedText.join(' ').replace(/\s+/g, ' ').trim();
}

function extractFromBtEt(sourceStr: string, outList: string[]) {
  const btRegex = /BT[\s\S]*?ET/g;
  let match: RegExpExecArray | null;

  while ((match = btRegex.exec(sourceStr)) !== null) {
    const block = match[0];

    // (string) Tj
    const tjRegex = /\(((?:[^()\\]|\\.)*)\)\s*T[jJ*]/g;
    let tjMatch: RegExpExecArray | null;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      const decoded = cleanPdfString(tjMatch[1]);
      if (decoded.length > 1) {
        outList.push(decoded);
      }
    }

    // [(array)] TJ
    const arrayTjRegex = /\[((?:[^\[\]]|\\.)*)\]\s*TJ/g;
    let arrMatch: RegExpExecArray | null;
    while ((arrMatch = arrayTjRegex.exec(block)) !== null) {
      const inner = arrMatch[1];
      const innerStrRegex = /\(((?:[^()\\]|\\.)*)\)/g;
      let sMatch: RegExpExecArray | null;
      let combined = '';
      while ((sMatch = innerStrRegex.exec(inner)) !== null) {
        combined += cleanPdfString(sMatch[1]);
      }
      if (combined.trim().length > 1) {
        outList.push(combined);
      }
    }
  }
}

function cleanPdfString(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\([()\\])/g, '$1')
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
    .trim();
}
